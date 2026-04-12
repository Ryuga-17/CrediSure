FROM python:3.9-slim

WORKDIR /app

# Install MLflow and API dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Assume MLflow server is addressable via this URI
ENV MLFLOW_TRACKING_URI=http://mlflow-server:5000

EXPOSE 8000

# Start FastAPI server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
