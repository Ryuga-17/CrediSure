# Build from the REPO ROOT, not this directory -- this service imports
# Backend/src/services/mlPredictor.py and reads models/ + ml_artifacts/,
# all of which live outside ml_service/:
#
#   docker build -f ml_service/Dockerfile -t credisure-ml-service .
#
FROM python:3.12-slim

WORKDIR /app

# LightGBM's shipped binary links against libgomp (OpenMP); python:*-slim
# doesn't include it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
COPY ml-service/requirements.txt ./ml-service/requirements.txt
RUN pip install --no-cache-dir \
    -r backend/requirements.txt \
    -r ml-service/requirements.txt

COPY backend/src/services ./backend/src/services
COPY ml/ml-artifacts ./ml/ml-artifacts
COPY ml/models ./ml/models
COPY ml-service ./ml-service

# Same reason mlService.js sets this for the subprocess path: LightGBM's
# bundled OpenMP runtime needs pinning to 1 thread.
ENV OMP_NUM_THREADS=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "ml-service"]
