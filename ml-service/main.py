"""
CrediSure Inference API

Persistent FastAPI replacement for the old per-request `python mlPredictor.py`
subprocess (Backend/src/services/mlService.js used to spawn+stdin/stdout a
fresh process per prediction). This service loads the same models once at
startup and serves predictions over HTTP instead.

It intentionally does NOT reimplement the model/preprocessing/SHAP logic --
it imports Backend/src/services/mlPredictor.py directly and calls its
process_request() (used to also handle stdin/stdout), so there is exactly one
copy of that logic and this service can never drift from what the subprocess
path used to compute.
"""
import os
import sys
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Mirrors Backend/tests/conftest.py's approach: make Backend/src/services
# importable as `mlPredictor` regardless of the cwd this is launched from.
SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVICE_DIR)
BACKEND_SERVICES_DIR = os.path.join(PROJECT_ROOT, "backend", "src", "services")
if BACKEND_SERVICES_DIR not in sys.path:
    sys.path.insert(0, BACKEND_SERVICES_DIR)

import mlPredictor  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("ml_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Same models mlPredictor.py's own main() loads before its stdin loop --
    # loading them here means every request after startup reuses them
    # in-memory instead of re-reading pickle/text/joblib files from disk.
    mlPredictor.initialize_models()
    logger.info("Models loaded: credit_score@v1, default_pd@v2")
    yield


app = FastAPI(title="CrediSure Inference API", lifespan=lifespan)


class LoanApplication(BaseModel):
    age: float
    income: float
    loanAmount: float
    loanRate: float
    loanTerm: float
    existingDebtPayment: float = 0
    loanPurpose: str
    hasMortgage: bool = False
    hasDependents: bool = False
    requestId: str | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/predict")
def predict_risk(application: LoanApplication):
    payload = application.model_dump(exclude={"requestId"})
    request_id = application.requestId or f"req_{int(time.time() * 1000)}"

    try:
        return mlPredictor.process_request({
            "action": "predict",
            "request_id": request_id,
            "data": payload,
        })
    except Exception as e:
        logger.error(f"Prediction failed for {request_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
