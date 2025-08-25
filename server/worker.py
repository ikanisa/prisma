import os
from rq import Connection, Worker
import redis
from openai import AsyncOpenAI
from .db import AsyncSessionLocal, Chunk
from .rag import embed_chunks

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
conn = redis.from_url(redis_url)
client = AsyncOpenAI()

def reembed_chunk(chunk_id: int):
    async def _run():
        async with AsyncSessionLocal() as session:
            chunk = await session.get(Chunk, chunk_id)
            if not chunk:
                return
            embed = (await embed_chunks([chunk.content]))[0]
            chunk.embedding = embed
            await session.commit()
    import asyncio
    asyncio.run(_run())

if __name__ == "__main__":
    with Connection(conn):
        worker = Worker(["reembed"])
        worker.work()
