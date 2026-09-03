"""
CrediSure Chatbot Explain API.

RAG service backing the frontend chatbot (my-app/src/components/Chatbot.tsx):
- Retrieval: local HuggingFace sentence-transformers embeddings + a Chroma
  vector store built from knowledge/*.md at startup (rebuilt every start --
  the corpus is a handful of short docs, so there's no need to persist and
  invalidate a cache).
- Generation: Groq (ChatGroq) for fast, low-latency completions, grounded on
  the retrieved chunks so the model explains CrediSure's own concepts
  instead of hallucinating generic finance advice.

POST /explain accepts {query} and returns {response_id, message} -- matches
Chatbot.tsx's existing fetch contract exactly, so the frontend needs no
changes once this runs.
"""
import asyncio
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_chroma import Chroma
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import MarkdownTextSplitter

load_dotenv()

SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
KNOWLEDGE_DIR = os.path.join(SERVICE_DIR, "knowledge")

EMBEDDING_MODEL = os.environ.get("RAG_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
RETRIEVER_K = int(os.environ.get("RAG_RETRIEVER_K", "3"))
MAX_QUERY_LENGTH = int(os.environ.get("RAG_MAX_QUERY_LENGTH", "2000"))

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("rag_service")

# Populated by lifespan at startup; read by the /explain handler.
state: dict = {}

# Minimal in-memory rate limiter for /explain. Unlike every other endpoint in
# this app, this one has no auth in front of it at all -- NEXT_PUBLIC_CHAT_API_URL
# is visible in the browser bundle, so anyone who finds it can call this
# directly and run up the Groq bill. Same caveats as Backend/src/middlewares/
# rateLimit.js (which this mirrors): dependency-free and per-process, so it
# only blunts abuse against a single instance, and buckets by the directly
# connecting client IP -- behind a reverse proxy that would need trusting an
# X-Forwarded-For header the same way server.js's TRUST_PROXY does, not
# implemented here since this service isn't expected to sit behind one yet.
RATE_LIMIT_WINDOW_S = int(os.environ.get("RAG_RATE_LIMIT_WINDOW_S", str(15 * 60)))
RATE_LIMIT_MAX = int(os.environ.get("RAG_RATE_LIMIT_MAX", "20"))
_rate_limit_buckets: dict[str, tuple[int, float]] = {}

# ChatGroq's underlying HTTP client has no timeout by default (confirmed via
# ChatGroq.model_fields -- request_timeout defaults to None) -- an upstream
# stall hangs the request (and its threadpool worker) indefinitely instead of
# failing fast, observed directly: a request against a real Groq key hung for
# over an hour with no response and no server-side log line before this was
# added. Same 30s default as Backend/src/services/mlService.js's
# DEFAULT_TIMEOUT_MS for the same reason -- an external call needs a ceiling.
LLM_REQUEST_TIMEOUT_S = float(os.environ.get("RAG_LLM_REQUEST_TIMEOUT_S", "30"))


def _check_rate_limit(client_ip: str) -> None:
    now = time.time()
    count, reset_at = _rate_limit_buckets.get(client_ip, (0, now + RATE_LIMIT_WINDOW_S))
    if now > reset_at:
        count, reset_at = 0, now + RATE_LIMIT_WINDOW_S
    count += 1
    _rate_limit_buckets[client_ip] = (count, reset_at)
    if count > RATE_LIMIT_MAX:
        retry_after = max(0, int(reset_at - now))
        raise HTTPException(
            status_code=429,
            detail="Too many chat requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


SYSTEM_PROMPT = """You are CrediSure's finance assistant. Answer the user's question about \
credit scoring, default risk, and CrediSure's own ML models using ONLY the context below. \
If the context doesn't cover the question, say so honestly rather than guessing or giving \
generic financial advice. Keep answers to 2-4 sentences, plain language, and wrap important \
terms in *asterisks* for emphasis (the frontend renders these as bold).

Context:
{context}"""


def build_chain():
    loader = DirectoryLoader(KNOWLEDGE_DIR, glob="*.md", loader_cls=TextLoader)
    docs = loader.load()
    if not docs:
        raise RuntimeError(f"No knowledge docs found in {KNOWLEDGE_DIR}")

    chunks = MarkdownTextSplitter(chunk_size=800, chunk_overlap=100).split_documents(docs)

    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    # No persist_directory: rebuilt fresh from knowledge/*.md every startup,
    # in-memory only. The corpus is tiny (a handful of short docs), so a
    # persisted index would just be a stale-cache footgun for no real
    # startup-time savings.
    vector_store = Chroma.from_documents(chunks, embeddings)
    retriever = vector_store.as_retriever(search_kwargs={"k": RETRIEVER_K})

    llm = ChatGroq(model=GROQ_MODEL, temperature=0.2, timeout=LLM_REQUEST_TIMEOUT_S)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{question}"),
    ])

    def format_docs(retrieved_docs):
        return "\n\n".join(d.page_content for d in retrieved_docs)

    return (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )


async def _cleanup_rate_limit_buckets():
    # Keeps _rate_limit_buckets from growing without bound on a long-running
    # process, same purpose as rateLimit.js's cleanupTimer.
    while True:
        await asyncio.sleep(RATE_LIMIT_WINDOW_S)
        now = time.time()
        expired = [ip for ip, (_, reset_at) in _rate_limit_buckets.items() if now > reset_at]
        for ip in expired:
            del _rate_limit_buckets[ip]


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.environ.get("GROQ_API_KEY"):
        # Fail loud at startup rather than on the first user request -- a
        # missing key is a deploy misconfiguration, not a per-request error.
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to rag_service/.env (see .env.example)."
        )

    logger.info("Loading embeddings (%s) and building the knowledge vector store...", EMBEDDING_MODEL)
    state["chain"] = build_chain()
    logger.info("RAG chain ready (generation model=%s)", GROQ_MODEL)
    cleanup_task = asyncio.create_task(_cleanup_rate_limit_buckets())
    yield
    cleanup_task.cancel()
    state.clear()


app = FastAPI(title="CrediSure Chatbot Explain API", lifespan=lifespan)

# Same CORS_ORIGIN convention as Backend/src/server.js and ml_service/main.py
# -- a comma-separated allowlist, defaulting to the Next.js dev server.
allowed_origins = [
    origin.strip()
    for origin in (os.environ.get("CORS_ORIGIN") or "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


class ExplainRequest(BaseModel):
    query: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/explain")
def explain(payload: ExplainRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query must not be empty")
    if len(query) > MAX_QUERY_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"query must be {MAX_QUERY_LENGTH} characters or fewer",
        )

    _check_rate_limit(client_ip)

    chain = state.get("chain")
    if chain is None:
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        message = chain.invoke(query)
    except Exception as e:
        logger.error("Explain failed for query %r: %s", query, e)
        raise HTTPException(status_code=502, detail="Chat generation failed") from e

    return {"response_id": str(uuid.uuid4()), "message": message}

import re

def scrub_pii(text: str) -> str:
    """Locally scrub SSNs and bank account numbers to preserve privacy."""
    # Scrub SSN (AAA-GG-SSSS or AAAGGSSSS)
    text = re.sub(r'\b\d{3}[-]?\d{2}[-]?\d{4}\b', '[REDACTED_SSN]', text)
    # Scrub possible bank account numbers (8-12 digits)
    text = re.sub(r'\b\d{8,12}\b', '[REDACTED_ACCOUNT]', text)
    return text

@app.post("/extract")
async def extract_document(document: UploadFile = File(...)):
    """Extract structured loan data from an uploaded PDF."""
    content = await document.read()
    
    text = ""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=content, filetype="pdf")
        for page in doc:
            text += page.get_text()
    except Exception as e:
        logger.error(f"Failed to parse PDF: {e}")
        raise HTTPException(status_code=400, detail="Invalid PDF document.")
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="No readable text found in document.")

    # 1. Scrub PII locally (never sent to LLM)
    scrubbed_text = scrub_pii(text)
    
    # 2. Extract structured data using ChatGroq
    from langchain_core.output_parsers import JsonOutputParser
    llm = ChatGroq(model_name=GROQ_MODEL, temperature=0.0, request_timeout=LLM_REQUEST_TIMEOUT_S)
    
    prompt = ChatPromptTemplate.from_template(
        "You are an expert data extractor. Extract the following loan application details from the provided document text. "
        "If a field is missing, return 0 or an empty string depending on the type. "
        "Return ONLY a raw JSON object with these keys (do not wrap in markdown): "
        "'age' (number), 'income' (number), 'loanAmount' (number), 'numBankAccounts' (number), "
        "'numCreditCards' (number), 'numOfDelayedPayment' (number).\n\n"
        "Document Text:\n{text}"
    )
    
    chain = prompt | llm | JsonOutputParser()
    
    try:
        extracted_data = await chain.ainvoke({"text": scrubbed_text})
        return extracted_data
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract data.")
