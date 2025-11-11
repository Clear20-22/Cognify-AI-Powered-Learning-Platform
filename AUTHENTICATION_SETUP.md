# Authentication System Setup

## ✅ Implementation Complete

The signup and signin functionality has been successfully connected with the MongoDB database. Here's what was implemented:

## Backend Changes

### 1. Authentication Libraries Added
```python
passlib>=1.7.4      # Password hashing
bcrypt>=4.1.0       # Bcrypt hashing algorithm  
python-jose[cryptography]>=3.3.0  # JWT token creation
```

### 2. Authentication Utilities (`backend/main.py`)

#### Password Hashing
```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hashed password"""
    return pwd_context.verify(plain_password, hashed_password)
```

#### JWT Token Creation
```python
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

### 3. Request Models
```python
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    fullName: str

class SignInRequest(BaseModel):
    email: EmailStr
    password: str
```

### 4. Authentication Endpoints

#### POST `/api/auth/signup`
- Checks if user already exists (email unique constraint)
- Hashes password with bcrypt before storing
- Creates user in MongoDB users collection
- Returns JWT access token and user data

**Request:**
```json
{
  "email": "user@example.com",
  "password": "mypassword",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-11-12T02:49:16.440Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "message": "Account created successfully"
}
```

#### POST `/api/auth/signin`
- Looks up user by email
- Verifies password against hashed password in database
- Returns JWT access token if valid
- Returns 401 error if invalid credentials

**Request:**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-11-12T02:49:16.440Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "message": "Signed in successfully"
}
```

### 5. Database Updates (`backend/app/database.py`)

Added `get_user_by_email` method to both `MongoDataStore` and `InMemoryDataStore`:

```python
async def get_user_by_email(self, email: str) -> Optional[Dict]:
    """Get user from database by email"""
    try:
        user = await self.users.find_one({"email": email})
        return user
    except Exception as e:
        logger.error(f"Error getting user by email: {e}")
        return None
```

## Frontend Changes

### 1. Updated `useAuth.jsx` Hook

Replaced demo/mock authentication with real API calls:

```javascript
const API_URL = "http://localhost:8000";

// Sign up with email and password
const signUp = async (email, password, fullName) => {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, fullName }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    return { user: null, error: { message: data.detail } };
  }
  
  // Store user and token in localStorage
  setUser(data.user);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem("access_token", data.access_token);
  
  return { user: data.user, error: null };
};

// Sign in with email and password
const signIn = async (email, password) => {
  const response = await fetch(`${API_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    return { user: null, error: { message: data.detail } };
  }
  
  // Store user and token in localStorage
  setUser(data.user);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem("access_token", data.access_token);
  
  return { user: data.user, error: null };
};

// Get authorization header for API calls
const getAuthHeader = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
```

### 2. Updated `AuthModal.jsx`

Modified form submission to use real authentication:

```javascript
const { signUp, signIn } = useAuth();

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  try {
    setLoading(true);
    setError(null);

    let result;
    if (mode === 'signup') {
      result = await signUp(formData.email, formData.password, formData.fullName);
    } else {
      result = await signIn(formData.email, formData.password);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      onClose();  // Close modal on success
    }
  } catch (err) {
    setError("An unexpected error occurred. Please try again.");
  } finally {
    setLoading(false);
  }
};
```

### 3. Updated `Layout.jsx`

Updated user display to use new user data structure:

```javascript
// Before: user.user_metadata?.full_name
// After: user.name

<span className="text-sm">
  {user.name || user.email?.split("@")[0] || "User"}
</span>
```

## Security Features

1. **Password Hashing**: Passwords are hashed with bcrypt before storage (never stored in plaintext)
2. **JWT Tokens**: Secure token-based authentication with 7-day expiration
3. **Email Uniqueness**: MongoDB unique index prevents duplicate accounts
4. **Password Validation**: Minimum 6 characters required
5. **Error Handling**: Detailed error messages for debugging, generic errors for users

## Testing the Implementation

### 1. Sign Up Flow

1. Open http://localhost:5173
2. Click "Sign Up" button
3. Fill in:
   - Full Name: "John Doe"
   - Email: "john@example.com"
   - Password: "password123"
   - Confirm Password: "password123"
4. Click "Sign Up"
5. You should be signed in and see your name in the navigation

### 2. Sign In Flow

1. Sign out if signed in
2. Click "Sign In" button
3. Enter email and password from sign up
4. Click "Sign In"
5. You should be signed in successfully

### 3. Verify in MongoDB

Check MongoDB Atlas to see the user document:
```json
{
  "_id": "user_abc123",
  "id": "user_abc123",
  "email": "john@example.com",
  "name": "John Doe",
  "password": "$2b$12$...",  // Hashed password
  "created_at": "2025-11-12T02:49:16.440Z"
}
```

### 4. Test Invalid Credentials

1. Try signing in with wrong password
2. Should see error: "Invalid email or password"

### 5. Test Duplicate Email

1. Try signing up with same email again
2. Should see error: "Email already registered"

## API Documentation

Full API documentation available at: http://localhost:8000/docs

Look for the "Authentication" section with:
- POST `/api/auth/signup` - Create new user account
- POST `/api/auth/signin` - Authenticate existing user

## Next Steps

1. **Protected Routes**: Add middleware to protect routes that require authentication
2. **Token Refresh**: Implement token refresh mechanism for expired tokens
3. **Password Reset**: Add forgot password / reset password functionality
4. **Email Verification**: Add email verification on sign up
5. **Social Auth**: Implement Google and GitHub OAuth integration
6. **Profile Management**: Add endpoints to update user profile

## Environment Variables

Make sure `.env` file in backend contains:

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
SECRET_KEY=your-secret-key-change-this-in-production  # Add this!
PORT=8000
HOST=0.0.0.0
```

⚠️ **Important**: Change the `SECRET_KEY` in production to a strong random string!

## Status

✅ Backend authentication endpoints implemented
✅ Frontend authentication forms connected
✅ Password hashing with bcrypt
✅ JWT token generation
✅ MongoDB user storage
✅ Email uniqueness validation
✅ Error handling
✅ Token storage in localStorage
✅ User session management

🎉 **Authentication system is fully functional and ready to use!**
