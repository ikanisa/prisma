import io
import os
import time
from typing import List

from fastapi import UploadFile, HTTPException

try:
    from google.cloud import documentai
except Exception:  # pragma: no cover - optional
    documentai = None

from pypdf import PdfReader
import tiktoken
from openai import AsyncOpenAI

from .db import Chunk, AsyncSessionLocal
from .rate_limit import RateLimiter

MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
client = AsyncOpenAI()
rate_limiter = RateLimiter(int(os.getenv("OPENAI_RPM", "60")))

def count_tokens(text: str) -> int:
    enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))

def chunk_text(text: str, max_tokens: int = 1000, overlap: int = 175) -> List[str]:
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = start + max_tokens
        chunk_tokens = tokens[start:end]
        chunks.append(enc.decode(chunk_tokens))
        start += max_tokens - overlap
    return chunks

async def extract_text(file: UploadFile) -> str:
    data = await file.read()
    if documentai and os.getenv("DOCAI_PROCESSOR_ID"):
        try:
            client = documentai.DocumentProcessorServiceClient()
            name = client.processor_path(
                os.getenv("GOOGLE_PROJECT_ID"),
                os.getenv("GOOGLE_LOCATION", "us"),
                os.getenv("DOCAI_PROCESSOR_ID"),
            )
            doc = documentai.RawDocument(content=data, mime_type=file.content_type)
            request = documentai.ProcessRequest(name=name, raw_document=doc)
            result = client.process_document(request=request)
            return result.document.text
        except Exception:
            pass
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)

async def embed_chunks(chunks: List[str]) -> List[List[float]]:
    embeddings = []
    for ch in chunks:
        if not rate_limiter.allow(time.time()):
            raise HTTPException(status_code=429, detail="OpenAI rate limit exceeded")
        res = await client.embeddings.create(model=MODEL, input=ch)
        embeddings.append(res.data[0].embedding)
    return embeddings

async def store_chunks(document_id: str, chunks: List[str], embeds: List[List[float]]):
    async with AsyncSessionLocal() as session:
        for content, emb in zip(chunks, embeds):
            session.add(Chunk(document_id=document_id, content=content, embedding=emb))
        await session.commit()
