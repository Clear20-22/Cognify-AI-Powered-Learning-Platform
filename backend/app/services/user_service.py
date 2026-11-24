"""
User Service - Handles user-related operations
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from app.core.config import get_settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.utils import generate_uuid, sanitize_dict
from app.db.base import MongoDataStore
from app.models.user import UserRole

logger = logging.getLogger(__name__)

# Fields that must never leave the service layer
PRIVATE_USER_FIELDS = [
    "hashed_password",
    "password",
    "failed_login_attempts",
    "first_failed_login_at",
    "locked_until",
]

INVALID_CREDENTIALS_MESSAGE = "Invalid email or password"


class AccountLockedError(Exception):
    """Raised when sign-in is blocked after too many failed attempts (NFR-SEC-07)."""


class AccountDisabledError(Exception):
    """Raised when a deactivated user tries to sign in (FR-AUTH-09)."""


def get_user_role(user: Dict[str, Any]) -> UserRole:
    """Return a user's role, treating missing or unknown values as student."""
    try:
        return UserRole(user.get("role") or UserRole.STUDENT)
    except ValueError:
        return UserRole.STUDENT


def _admin_emails() -> set:
    """Emails configured to receive the admin role."""
    raw = get_settings().ADMIN_EMAILS
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def _parse_time(value: Optional[str]) -> Optional[datetime]:
    """Parse an ISO timestamp stored on a user document."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


class UserService:
    """Service for handling user operations."""

    def __init__(self, data_store: MongoDataStore):
        self.data_store = data_store

    def _build_token(self, user_id: str, email: str, role: UserRole) -> str:
        """Create a JWT carrying the user identifier and role (FR-AUTH-06)."""
        return create_access_token(data={"sub": user_id, "email": email, "role": role.value})

    def _safe(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Strip private fields and normalise the role."""
        safe_user = sanitize_dict(user, exclude_keys=PRIVATE_USER_FIELDS)
        safe_user["role"] = get_user_role(user).value
        return safe_user

    async def create_user(
        self,
        email: str,
        password: str,
        full_name: str,
        role: UserRole = UserRole.STUDENT
    ) -> Dict[str, Any]:
        """
        Create a new user with email and password.

        Args:
            email: User email address
            password: Plain text password
            full_name: User's full name
            role: Account role (student or teacher; admin via ADMIN_EMAILS only)

        Returns:
            Dictionary with user data and access token
        """
        try:
            # Check if user already exists
            existing_user = await self.data_store.get_user_by_email(email)
            if existing_user:
                raise ValueError("Email already registered")

            if email.lower() in _admin_emails():
                role = UserRole.ADMIN

            # Hash password
            hashed_password = hash_password(password)

            # Create user
            user_id = f"user_{generate_uuid()}"
            user_data = {
                "email": email,
                "full_name": full_name,
                "hashed_password": hashed_password,
                "role": UserRole(role).value,
                "created_at": datetime.now().isoformat(),
                "is_active": True,
                "preferences": {},
                "learning_stats": {}
            }

            user = await self.data_store.add_user(user_id, user_data)

            # Create access token
            access_token = self._build_token(user_id, email, UserRole(role))

            return {
                "success": True,
                "user": self._safe(user),
                "access_token": access_token,
                "token_type": "bearer"
            }
        except Exception as e:
            logger.error(f"Create user error: {e}")
            raise

    async def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate a user with email and password.

        Args:
            email: User email address
            password: Plain text password

        Returns:
            Dictionary with user data and access token

        Raises:
            ValueError: Wrong email or password (same message for both)
            AccountLockedError: Too many recent failed attempts
            AccountDisabledError: Account has been deactivated
        """
        try:
            # Get user by email
            user = await self.data_store.get_user_by_email(email)
            if not user:
                raise ValueError(INVALID_CREDENTIALS_MESSAGE)

            user_id = str(user.get("id") or user.get("_id"))
            now = datetime.now()

            locked_until = _parse_time(user.get("locked_until"))
            if locked_until and locked_until > now:
                minutes_left = max(1, int((locked_until - now).total_seconds() // 60) + 1)
                raise AccountLockedError(
                    f"Too many failed sign-in attempts. Try again in {minutes_left} minute(s)."
                )

            # Verify password
            hashed_password = user.get("hashed_password") or user.get("password", "")
            if not verify_password(password, hashed_password):
                await self._record_failed_login(user_id, user, now)
                raise ValueError(INVALID_CREDENTIALS_MESSAGE)

            # Checked only after the password, so it doesn't reveal which accounts exist
            if not user.get("is_active", True):
                raise AccountDisabledError("This account has been deactivated. Contact an administrator.")

            updates = {}
            if user.get("failed_login_attempts") or user.get("locked_until"):
                updates.update({
                    "failed_login_attempts": 0,
                    "first_failed_login_at": None,
                    "locked_until": None,
                })
            role = get_user_role(user)
            if email.lower() in _admin_emails() and role != UserRole.ADMIN:
                role = UserRole.ADMIN
                updates["role"] = role.value
            if updates:
                user = await self.data_store.update_user(user_id, updates) or user

            # Create access token
            access_token = self._build_token(user_id, email, role)

            return {
                "success": True,
                "user": self._safe(user),
                "access_token": access_token,
                "token_type": "bearer"
            }
        except Exception as e:
            logger.error(f"Authenticate user error: {e}")
            raise

    async def _record_failed_login(self, user_id: str, user: Dict[str, Any], now: datetime) -> None:
        """Count a failed sign-in and lock the account when the limit is reached."""
        settings = get_settings()
        window = timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)

        first_failed = _parse_time(user.get("first_failed_login_at"))
        attempts = user.get("failed_login_attempts") or 0
        if first_failed is None or now - first_failed > window:
            first_failed = now
            attempts = 0
        attempts += 1

        if attempts >= settings.LOGIN_MAX_FAILED_ATTEMPTS:
            updates = {
                "failed_login_attempts": 0,
                "first_failed_login_at": None,
                "locked_until": (now + window).isoformat(),
            }
            logger.warning(f"Account {user_id} locked after {attempts} failed sign-in attempts")
        else:
            updates = {
                "failed_login_attempts": attempts,
                "first_failed_login_at": first_failed.isoformat(),
            }
        await self.data_store.update_user(user_id, updates)

    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user by ID.

        Args:
            user_id: User identifier

        Returns:
            User data (without password)
        """
        user = await self.data_store.get_user(user_id)
        if user:
            return self._safe(user)
        return None

    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update user information.

        Args:
            user_id: User identifier
            updates: Dictionary of fields to update

        Returns:
            Updated user data
        """
        try:
            updates["updated_at"] = datetime.now().isoformat()
            user = await self.data_store.update_user(user_id, updates)
            if user:
                return self._safe(user)
            return None
        except Exception as e:
            logger.error(f"Update user error: {e}")
            raise

    async def change_password(self, user_id: str, current_password: str, new_password: str) -> None:
        """
        Change a user's password after confirming the current one (FR-AUTH-10).

        Raises:
            ValueError: User not found, current password wrong, or password unchanged
        """
        user = await self.data_store.get_user(user_id)
        if not user:
            raise ValueError("User not found")

        hashed_password = user.get("hashed_password") or user.get("password", "")
        if not verify_password(current_password, hashed_password):
            raise ValueError("Current password is incorrect")
        if verify_password(new_password, hashed_password):
            raise ValueError("New password must be different from the current password")

        await self.update_user(user_id, {"hashed_password": hash_password(new_password)})

    async def list_users(self, limit: int = 100) -> List[Dict[str, Any]]:
        """List users for administrators (FR-AUTH-09)."""
        users = await self.data_store.list_users(limit)
        return [self._safe(user) for user in users]

    async def set_active(self, user_id: str, is_active: bool) -> Optional[Dict[str, Any]]:
        """Deactivate or reactivate an account (FR-AUTH-09)."""
        return await self.update_user(user_id, {"is_active": is_active})

    async def set_role(self, user_id: str, role: UserRole) -> Optional[Dict[str, Any]]:
        """Change a user's role."""
        return await self.update_user(user_id, {"role": UserRole(role).value})
