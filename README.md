# CrediSure - Credit Risk Analyzer

CrediSure is a credit risk assessment system for loan default prediction. It evaluates applicant risk profiles by calculating a normalized credit score and a Probability of Default (PD), segmenting applicants into business-friendly risk buckets. 

This repository contains both the operational application (Frontend + Backend) and the machine learning development pipelines.

## 🏗 System Architecture

The project is structured into several core components:

### 1. Frontend (`my-app/`)
- **Tech Stack**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Three.js
- **Features**: A modern, interactive dashboard for reviewing applicant profiles and credit risk metrics. Includes a chatbot interface (currently in development) intended for querying risk explanations.

### 2. Backend API (`Backend/`)
- **Tech Stack**: Node.js, Express, MongoDB (Mongoose), JWT
- **Features**: 
  - Handles HTTP traffic, user authentication (JWT via httpOnly cookies + CSRF protection), and secures endpoints.
  - Calls the persistent FastAPI inference service (`ml_service/`) over HTTP via `mlService.js` to run predictions.
  - Logs predictions and monitoring metrics via `monitoringService.js`.

### 3. Machine Learning Inference (`ml_service/`, logic in `Backend/src/services/mlPredictor.py`)
- **Tech Stack**: Python, FastAPI, LightGBM, SHAP
- **Features**: 
  - `ml_service/main.py` is a persistent FastAPI service (`POST /api/v1/predict`) that preloads both models once at startup, instead of spawning a fresh Python process per request.
  - It imports `mlPredictor.py` directly for the actual preprocessing/model/SHAP logic, so there is one copy of that logic regardless of how it's invoked.
  - **Two-stage pipeline**: Predicts a credit score and a probability of default.
  - **Explainability**: Computes exact SHAP values (`TreeExplainer`) for both models to extract the top drivers of default risk for each applicant, returning a concise summary for the frontend.
  - Uses `preprocessing_v1.json` (credit score) / `preprocessing_v2.json` (default PD) and saved model artifacts from the `models/` directory.

### 4. ML Pipeline & Data (`ml_pipeline/` & `notebooks/`)
- Contains the Jupyter notebooks and scripts used for training the ML models.
- **Note**: The training dataset (`Loan_default.csv`) is `.gitignore`d due to size (25MB) and must be downloaded separately: [`nikhil1e9/loan-default`](https://www.kaggle.com/datasets/nikhil1e9/loan-default) on Kaggle, placed at `notebooks/Loan_default.csv`.

### 5. Chatbot / RAG Service (`rag_service/`)
- **Tech Stack**: Python, FastAPI, LangChain, HuggingFace sentence-transformers (embeddings), Chroma (vector store), Groq (`ChatGroq`, generation).
- **Features**: `POST /explain` answers finance/CrediSure questions grounded in `rag_service/knowledge/*.md` (credit score, PD, DTI ratio, SHAP explanations, loan terms, risk buckets) -- retrieval-augmented, not a raw LLM call, so answers stay scoped to what CrediSure actually does. Powers the chatbot on the frontend's `/guide` page (`my-app/src/components/Chatbot.tsx`).
- Builds its vector store from the knowledge docs fresh at startup (the corpus is small, so there's no persisted index to go stale).
- Rate-limited (20 req/15min per IP by default) and has a 30s LLM request timeout -- this endpoint has no auth in front of it (`NEXT_PUBLIC_CHAT_API_URL` is visible in the browser bundle), so both matter.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (Node 26 is not supported due to dependency incompatibilities)
- Python 3.9+
- MongoDB (Atlas or local)
- A [Groq API key](https://console.groq.com/keys) (free tier works) for the chatbot

### 1. ML Inference Service Setup
```bash
python3 -m venv .venv
.venv/bin/pip install -r Backend/requirements.txt -r ml_service/requirements.txt
OMP_NUM_THREADS=1 .venv/bin/uvicorn ml_service.main:app --port 8000
```
*The Backend calls this service over HTTP (`ML_SERVICE_URL`, defaults to `http://localhost:8000`) for every prediction, so it must be running before you submit a loan application.*

### 2. Backend Setup
```bash
cd Backend
npm install
# Create a .env file (see below)
npm run dev
```

### 3. Frontend Setup
```bash
cd my-app
npm install
# Create a .env.local file (see below)
npm run dev
```

### 4. Chatbot / RAG Service Setup
```bash
cd rag_service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
# Edit .env and set GROQ_API_KEY
.venv/bin/uvicorn app:app --port 8001
```
*Kept in its own venv, separate from the main `.venv` -- `sentence-transformers` pulls in its own (large) `torch` dependency unrelated to the LightGBM scoring path. The frontend calls this over HTTP (`NEXT_PUBLIC_CHAT_API_URL`, see below), so it must be running before the chatbot on `/guide` will respond.*

### 5. Environment Variables

**Backend (`Backend/.env`)**:
```env
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-key
PORT=5000
ML_SERVICE_URL=http://localhost:8000
# Comma-separated allowlist for credentialed cross-origin requests; defaults
# to http://localhost:3000 if unset.
CORS_ORIGIN=http://localhost:3000
# Express "trust proxy" hop count, for correct req.ip behind a reverse proxy/
# load balancer (affects rateLimit.js's per-IP buckets). Defaults to 1 when
# NODE_ENV=production, 0 otherwise -- only set this explicitly if your deploy
# topology has more than one proxy hop in front of the backend.
# TRUST_PROXY=1
```

**Frontend (`my-app/.env.local`)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8001
```

**Chatbot / RAG service (`rag_service/.env`)**: see `rag_service/.env.example` -- requires `GROQ_API_KEY`, everything else has a default.

## ⚠️ Current Status & Known Limitations
Please refer to `TODO.md` for a complete snapshot of outstanding work. Key limitations currently include:
- The credit-score model (v1) still has no real signal in its training data (R² ≈ -0.0001 on corrected evaluation) -- it returns a number, not yet a reliable one. Blocked on sourcing a dataset where score is genuinely derived from applicant data.
- MLOps features like DVC, Great Expectations, and automated CI/CD canary deployments are aspirational goals and are not fully wired into the current production flow.
- `models/` (the trained model artifacts) is not yet committed to git -- see `TODO.md`.

## 📄 License
MIT
