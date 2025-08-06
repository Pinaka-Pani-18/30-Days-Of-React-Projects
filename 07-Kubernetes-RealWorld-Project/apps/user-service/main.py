from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
import uvicorn
import jwt
import hashlib
import time
import os
import logging
from typing import Optional
from pydantic import BaseModel
import asyncpg
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('user_service_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('user_service_request_duration_seconds', 'Request duration')

app = FastAPI(title="User Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@postgres:5432/ecommerce")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
SERVICE_NAME = os.getenv("SERVICE_NAME", "user-service")
SERVICE_VERSION = os.getenv("SERVICE_VERSION", "1.0.0")

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    created_at: str

# Database connection
class Database:
    def __init__(self):
        self.pool = None

    async def connect(self):
        try:
            self.pool = await asyncpg.create_pool(DATABASE_URL)
            logger.info("Connected to database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

db = Database()

@app.on_event("startup")
async def startup_event():
    await db.connect()
    # Create users table if it doesn't exist
    async with db.pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

@app.on_event("shutdown")
async def shutdown_event():
    await db.disconnect()

# Middleware for metrics
@app.middleware("http")
async def metrics_middleware(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    REQUEST_DURATION.observe(process_time)
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    return response

# Utility functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_token(user_id: int, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": time.time() + 3600  # 1 hour expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Health check endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness probe"""
    try:
        # Check database connection
        async with db.pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "healthy", "service": SERVICE_NAME, "version": SERVICE_VERSION}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint for Kubernetes readiness probe"""
    try:
        # Check if all dependencies are ready
        async with db.pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "ready", "service": SERVICE_NAME}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not ready")

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# API endpoints
@app.post("/register", response_model=dict)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        async with db.pool.acquire() as conn:
            # Check if user already exists
            existing_user = await conn.fetchrow(
                "SELECT id FROM users WHERE username = $1 OR email = $2",
                user_data.username, user_data.email
            )
            if existing_user:
                raise HTTPException(status_code=400, detail="User already exists")
            
            # Create new user
            password_hash = hash_password(user_data.password)
            user_id = await conn.fetchval(
                """INSERT INTO users (username, email, password_hash, first_name, last_name)
                   VALUES ($1, $2, $3, $4, $5) RETURNING id""",
                user_data.username, user_data.email, password_hash,
                user_data.first_name, user_data.last_name
            )
            
            token = create_token(user_id, user_data.username)
            
            logger.info(f"User registered: {user_data.username}")
            return {"message": "User registered successfully", "token": token, "user_id": user_id}
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/login", response_model=dict)
async def login_user(login_data: UserLogin):
    """Authenticate user and return JWT token"""
    try:
        async with db.pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT id, username, password_hash FROM users WHERE username = $1",
                login_data.username
            )
            
            if not user or not verify_password(login_data.password, user['password_hash']):
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            token = create_token(user['id'], user['username'])
            
            logger.info(f"User logged in: {login_data.username}")
            return {"message": "Login successful", "token": token, "user_id": user['id']}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.get("/profile", response_model=User)
async def get_user_profile(token_data: dict = Depends(verify_token)):
    """Get user profile information"""
    try:
        async with db.pool.acquire() as conn:
            user = await conn.fetchrow(
                """SELECT id, username, email, first_name, last_name, created_at
                   FROM users WHERE id = $1""",
                token_data['user_id']
            )
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            return User(
                id=user['id'],
                username=user['username'],
                email=user['email'],
                first_name=user['first_name'],
                last_name=user['last_name'],
                created_at=user['created_at'].isoformat()
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")

@app.get("/users/{user_id}", response_model=User)
async def get_user_by_id(user_id: int, token_data: dict = Depends(verify_token)):
    """Get user by ID (for internal service communication)"""
    try:
        async with db.pool.acquire() as conn:
            user = await conn.fetchrow(
                """SELECT id, username, email, first_name, last_name, created_at
                   FROM users WHERE id = $1""",
                user_id
            )
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            return User(
                id=user['id'],
                username=user['username'],
                email=user['email'],
                first_name=user['first_name'],
                last_name=user['last_name'],
                created_at=user['created_at'].isoformat()
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "status": "running",
        "endpoints": {
            "health": "/health",
            "ready": "/ready",
            "metrics": "/metrics",
            "register": "/register",
            "login": "/login",
            "profile": "/profile"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)