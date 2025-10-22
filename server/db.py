import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, Text, DateTime, Numeric, Date, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
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


class TelemetryAlert(Base):
    __tablename__ = "telemetry_alerts"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    org_id = Column(PGUUID(as_uuid=True), nullable=True)
    alert_type = Column(Text, nullable=False)
    severity = Column(Text, nullable=False)
    message = Column(Text, nullable=False)
    context = Column(JSONB, nullable=False, default=dict)
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("now()"))


class TelemetryServiceLevel(Base):
    __tablename__ = "telemetry_service_levels"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    org_id = Column(PGUUID(as_uuid=True), nullable=True)
    module = Column(Text, nullable=False)
    workflow_event = Column(Text, nullable=False)
    target_hours = Column(Integer, nullable=False)
    breaches = Column(Integer, nullable=False, default=0)
    last_breach_at = Column(DateTime(timezone=True))
    open_breaches = Column(Integer, nullable=False, default=0)
    status = Column(Text, nullable=False, default="ON_TRACK")
    computed_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class TelemetryCoverageMetric(Base):
    __tablename__ = "telemetry_coverage_metrics"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    org_id = Column(PGUUID(as_uuid=True), nullable=True)
    module = Column(Text, nullable=False)
    metric = Column(Text, nullable=False)
    measured_value = Column(Numeric(18, 2), nullable=False, default=0)
    population = Column(Numeric(18, 2), nullable=False, default=0)
    coverage_ratio = Column(Numeric(6, 3))
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    computed_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class TelemetryRefusalEvent(Base):
    __tablename__ = "telemetry_refusal_events"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    org_id = Column(PGUUID(as_uuid=True), nullable=True)
    module = Column(Text, nullable=False)
    event = Column(Text, nullable=False)
    reason = Column(Text)
    severity = Column(Text, nullable=False, default="INFO")
    count = Column(Integer, nullable=False, default=1)
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class AutonomyTelemetryEvent(Base):
    __tablename__ = "autonomy_telemetry_events"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    org_id = Column(PGUUID(as_uuid=True), nullable=False)
    module = Column(Text, nullable=False)
    scenario = Column(Text, nullable=False)
    decision = Column(Text, nullable=False)
    metrics = Column(JSONB, nullable=False)
    actor = Column(PGUUID(as_uuid=True), nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
