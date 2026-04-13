"""
Database configuration and session management
"""
from sqlalchemy import create_engine  # Add this import
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator, AsyncGenerator
from .settings import get_settings

settings = get_settings()

# Convert database URL for async support
database_url = settings.database_url
if "postgresql://" in database_url:
    async_database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
elif "sqlite://" in database_url:
    async_database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://")
else:
    async_database_url = database_url

# Create async engine
async_engine = create_async_engine(
    async_database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG
)

# Create synchronous engine (if needed)
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG
)

# Create AsyncSessionLocal class
AsyncSessionLocal = async_sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Create SessionLocal class (synchronous)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Synchronous dependency to get database session
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Asynchronous dependency to get database session
    Usage: db: AsyncSession = Depends(get_async_db)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()