import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, Text, DateTime, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from pgvector.sqlalchemy import Vector

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/postgres")

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

class Chunk(Base):
    __tablename__ = "chunks"
    id = Column(Integer, primary_key=True)
    org_id = Column(Text, nullable=False)
    document_id = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False, default=0)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536))
    embed_model = Column(Text)
    index_name = Column(Text, nullable=False, default="finance_docs_v1")
    content_hash = Column(Text, nullable=False)


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Text, primary_key=True)
    event = Column(Text, nullable=False)
    service = Column(Text, nullable=True)
    source = Column(Text, nullable=False)
    org_id = Column(Text, nullable=True)
    actor_id = Column(Text, nullable=True)
    properties = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    tags = Column(ARRAY(Text), nullable=False, server_default=text("ARRAY[]::text[]"))
    context = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    metadata = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    ingested_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
