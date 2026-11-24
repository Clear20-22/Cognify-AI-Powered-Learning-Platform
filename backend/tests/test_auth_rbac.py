"""
Tests for roles, RBAC, password policy, login lockout, and admin user management.
Covers FR-AUTH-01/02/03/05/06/07/09/10 and NFR-SEC-04/07.
"""

import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from app.api.deps import require_role, get_current_active_user
from app.core.config import get_settings
from app.core.security import decode_access_token, reject_mongo_operators
from app.models.user import UserRole
from app.schemas.user import UserUpdate

PASSWORD = "SecurePass123"


def signup(client, email, password=PASSWORD, role=None, name="Test User"):
    body = {"email": email, "password": password, "fullName": name}
    if role is not None:
        body["role"] = role
    return client.post("/api/auth/signup", json=body)


def signin(client, email, password=PASSWORD):
    return client.post("/api/auth/signin", json={"email": email, "password": password})


def auth_header(response):
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def admin_email(monkeypatch):
    email = "admin@test.com"
    monkeypatch.setattr(get_settings(), "ADMIN_EMAILS", email)
    return email


# ---------------------------------------------------------------------------
# Sign-up and roles
# ---------------------------------------------------------------------------

def test_signup_defaults_to_student_and_token_carries_role(test_client):
    response = signup(test_client, "student@test.com")
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "student"
    payload = decode_access_token(data["access_token"])
    assert payload["sub"] == data["user_id"]
    assert payload["role"] == "student"


def test_signup_as_teacher(test_client):
    response = signup(test_client, "teacher@test.com", role="teacher")
    assert response.status_code == 200
    assert response.json()["role"] == "teacher"


def test_signup_cannot_self_register_as_admin(test_client):
    response = signup(test_client, "sneaky@test.com", role="admin")
    assert response.status_code == 422


@pytest.mark.parametrize("weak", ["Short1A", "alllowercase1", "ALLUPPERCASE1", "NoDigitsHere"])
def test_weak_passwords_rejected(test_client, weak):
    response = signup(test_client, "weak@test.com", password=weak)
    assert response.status_code == 422
    assert "uppercase" in response.text


def test_duplicate_email_rejected(test_client):
    signup(test_client, "dup@test.com")
    response = signup(test_client, "dup@test.com")
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


# ---------------------------------------------------------------------------
# Sign-in and lockout
# ---------------------------------------------------------------------------

def test_signin_does_not_reveal_which_credential_was_wrong(test_client):
    signup(test_client, "user@test.com")
    wrong_password = signin(test_client, "user@test.com", "WrongPass999")
    unknown_email = signin(test_client, "nobody@test.com")
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json()["detail"] == unknown_email.json()["detail"]


def test_account_locked_after_repeated_failures(test_client):
    signup(test_client, "locked@test.com")
    for _ in range(get_settings().LOGIN_MAX_FAILED_ATTEMPTS):
        assert signin(test_client, "locked@test.com", "WrongPass999").status_code == 401
    # Even the correct password is refused while locked
    response = signin(test_client, "locked@test.com")
    assert response.status_code == 429
    assert "Try again" in response.json()["detail"]


def test_successful_signin_resets_failed_attempts(test_client):
    signup(test_client, "reset@test.com")
    limit = get_settings().LOGIN_MAX_FAILED_ATTEMPTS
    for _ in range(limit - 1):
        signin(test_client, "reset@test.com", "WrongPass999")
    assert signin(test_client, "reset@test.com").status_code == 200
    for _ in range(limit - 1):
        signin(test_client, "reset@test.com", "WrongPass999")
    assert signin(test_client, "reset@test.com").status_code == 200


# ---------------------------------------------------------------------------
# Own account: /auth/me and password change
# ---------------------------------------------------------------------------

def test_me_requires_authentication(test_client):
    assert test_client.get("/api/auth/me").status_code == 401


def test_me_returns_profile_with_role(test_client):
    headers = auth_header(signup(test_client, "me@test.com", role="teacher"))
    response = test_client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["role"] == "teacher"
    assert response.json()["email"] == "me@test.com"


def test_update_profile_name(test_client):
    headers = auth_header(signup(test_client, "rename@test.com"))
    response = test_client.patch("/api/auth/me", json={"full_name": "  New Name  "}, headers=headers)
    assert response.status_code == 200
    assert response.json()["full_name"] == "New Name"


def test_change_password(test_client):
    headers = auth_header(signup(test_client, "pw@test.com"))

    wrong = test_client.post(
        "/api/auth/change-password",
        json={"current_password": "WrongPass999", "new_password": "NewSecure456"},
        headers=headers
    )
    assert wrong.status_code == 400

    weak = test_client.post(
        "/api/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "weak"},
        headers=headers
    )
    assert weak.status_code == 422

    ok = test_client.post(
        "/api/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "NewSecure456"},
        headers=headers
    )
    assert ok.status_code == 204
    assert signin(test_client, "pw@test.com").status_code == 401
    assert signin(test_client, "pw@test.com", "NewSecure456").status_code == 200


# ---------------------------------------------------------------------------
# Admin user management
# ---------------------------------------------------------------------------

def test_configured_admin_email_gets_admin_role(test_client, admin_email):
    response = signup(test_client, admin_email)
    assert response.json()["role"] == "admin"


def test_only_admin_can_list_users(test_client, admin_email):
    admin = auth_header(signup(test_client, admin_email))
    student = auth_header(signup(test_client, "s1@test.com"))

    assert test_client.get("/api/users", headers=student).status_code == 403
    assert test_client.get("/api/users").status_code == 401

    response = test_client.get("/api/users", headers=admin)
    assert response.status_code == 200
    emails = {user["email"] for user in response.json()["users"]}
    assert {admin_email, "s1@test.com"} <= emails
    assert all("hashed_password" not in user for user in response.json()["users"])


def test_admin_deactivates_and_reactivates_user(test_client, admin_email):
    admin = auth_header(signup(test_client, admin_email))
    student_response = signup(test_client, "victim@test.com")
    student_id = student_response.json()["user_id"]
    old_token = auth_header(student_response)

    response = test_client.patch(f"/api/users/{student_id}/status", json={"is_active": False}, headers=admin)
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    # Deactivated user can neither sign in nor use an existing token
    assert signin(test_client, "victim@test.com").status_code == 403
    assert test_client.get("/api/auth/me", headers=old_token).status_code == 403

    test_client.patch(f"/api/users/{student_id}/status", json={"is_active": True}, headers=admin)
    assert signin(test_client, "victim@test.com").status_code == 200


def test_admin_cannot_deactivate_or_demote_self(test_client, admin_email):
    response = signup(test_client, admin_email)
    admin, admin_id = auth_header(response), response.json()["user_id"]
    assert test_client.patch(f"/api/users/{admin_id}/status", json={"is_active": False}, headers=admin).status_code == 400
    assert test_client.patch(f"/api/users/{admin_id}/role", json={"role": "student"}, headers=admin).status_code == 400


def test_admin_changes_role_and_it_applies_immediately(test_client, admin_email):
    admin = auth_header(signup(test_client, admin_email))
    response = signup(test_client, "promote@test.com")
    user_id, user = response.json()["user_id"], auth_header(response)

    test_client.patch(f"/api/users/{user_id}/role", json={"role": "teacher"}, headers=admin)
    # Same token, new role: RBAC reads the role from the database
    assert test_client.get("/api/auth/me", headers=user).json()["role"] == "teacher"


def test_user_profile_visible_only_to_self_or_admin(test_client, admin_email):
    admin = auth_header(signup(test_client, admin_email))
    a = signup(test_client, "a@test.com")
    b = signup(test_client, "b@test.com")
    a_id = a.json()["user_id"]

    assert test_client.get(f"/api/users/{a_id}", headers=auth_header(a)).status_code == 200
    assert test_client.get(f"/api/users/{a_id}", headers=auth_header(b)).status_code == 403
    assert test_client.get(f"/api/users/{a_id}", headers=admin).status_code == 200


def test_passwordless_user_creation_is_admin_only(test_client, admin_email):
    body = {"email": "created@test.com", "name": "Created"}
    assert test_client.post("/api/users", json=body).status_code == 401
    student = auth_header(signup(test_client, "s2@test.com"))
    assert test_client.post("/api/users", json=body, headers=student).status_code == 403
    admin = auth_header(signup(test_client, admin_email))
    assert test_client.post("/api/users", json=body, headers=admin).status_code == 201


# ---------------------------------------------------------------------------
# require_role contract used by other modules
# ---------------------------------------------------------------------------

def make_role_app(user):
    app = FastAPI()

    @app.get("/teacher-only")
    async def teacher_only(current_user: dict = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))):
        return {"ok": True, "role": current_user["role"]}

    app.dependency_overrides[get_current_active_user] = lambda: user
    return TestClient(app)


@pytest.mark.parametrize("role,expected", [("teacher", 200), ("admin", 200), ("student", 403)])
def test_require_role(role, expected):
    client = make_role_app({"id": "u1", "role": role, "is_active": True})
    assert client.get("/teacher-only").status_code == expected


# ---------------------------------------------------------------------------
# NoSQL operator injection
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("payload", [
    {"$where": "1"},
    {"theme": {"$ne": None}},
    {"a.b": 1},
    {"list": [{"$gt": 0}]},
])
def test_mongo_operator_keys_rejected(payload):
    with pytest.raises(ValueError):
        reject_mongo_operators(payload)
    with pytest.raises(ValueError):
        UserUpdate(preferences=payload)


def test_safe_preferences_accepted():
    assert UserUpdate(preferences={"theme": "dark", "tags": ["a"]}).preferences["theme"] == "dark"
