# ML Models Integration Guide

This document explains how the ML models are integrated with the backend.

## Overview

The system uses two ML models:
1. **Credit Score Model** (`creditscore_model.pkl`) - LightGBM regression model
2. **Default Prediction Model** (`default_model.pkl`) - PyTorch neural network

## Architecture

The integration uses Python scripts called from Node.js via child processes:

```
Node.js Backend (Express)
    ↓
ML Service (mlService.js)
    ↓
Python Script (mlPredictor.py)
    ↓
ML Models (pickle files)
```

## Setup Requirements

### 1. Python Dependencies

Make sure Python 3.7+ is installed, then install required packages:

```bash
pip install numpy pandas scikit-learn lightgbm torch
```

Or use a requirements file:
```bash
pip install -r requirements.txt
```

Create `requirements.txt`:
```
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.3.0
lightgbm>=4.0.0
torch>=2.0.0
```

### 2. Model Files

Ensure the following model files are in the project root (parent of Backend/):
- `creditscore_model.pkl`
- `default_model.pkl`

### 3. Node.js Dependencies

The backend already includes `python-shell` package. Install dependencies:

```bash
cd Backend
npm install
```

## API Endpoints

### POST /loans
Submit a loan application with automatic ML predictions.

**Request Body:**
```json
{
  "name": "John Doe",
  "age": 30,
  "income": 50000,
  "existingDebtPayment": 500,
  "loanAmount": 10000,
  "loanRate": 5.5,
  "loanTerm": 5,
  "hasDependents": false,
  "hasMortgage": true,
  "loanPurpose": "Home"
}
```

**Response:**
```json
{
  "_id": "...",
  "user": "...",
  "name": "John Doe",
  "age": 30,
  "income": 50000,
  "loanAmount": 10000,
  "creditScore": 650.23,
  "defaultStatus": 0,
  "defaultProbability": 0.23,
  "status": "pending",
  ...
}
```

### POST /loans/predict
Get predictions without saving the application.

**Request Body:** Same as POST /loans

**Response:**
```json
{
  "success": true,
  "creditScore": 650.23,
  "defaultStatus": 0,
  "defaultProbability": 0.23
}
```

### GET /loans
Get all loan applications for the authenticated user.

### GET /loans/:id
Get a specific loan application by ID.

## How It Works

1. **Feature Preprocessing:**
   - Calculates DTIRatio (Debt-to-Income Ratio) from existingDebtPayment and income
   - Maps loan purpose strings to numeric values (Business=0, Home=1, Education=2, Others=3, Automobile=4)
   - Converts boolean flags to 0/1

2. **Credit Score Prediction:**
   - Normalizes numerical features using Normalizer
   - Creates engineered features: DTIRatio*InterestRate, LoanAmount/Income
   - Predicts credit score using LightGBM model

3. **Default Prediction:**
   - Uses the predicted credit score as input
   - Normalizes features using StandardScaler
   - Predicts default probability using PyTorch neural network
   - Converts probability to binary (0 = Non-Default, 1 = Default)

## Troubleshooting

### Python Script Not Found
- Ensure Python 3 is installed: `python3 --version`
- Check that `mlPredictor.py` is in `Backend/src/services/`
- Verify the script has execute permissions

### Model Files Not Found
- Check that `.pkl` files are in the project root (same level as Backend/)
- Verify file paths in `mlPredictor.py`

### Import Errors
- Install missing Python packages
- Check Python version compatibility

### Permission Errors
- On Unix systems, ensure the Python script is executable: `chmod +x mlPredictor.py`
- Check file permissions for model files

## Testing

Test the integration:

```bash
# Start the backend
cd Backend
npm run dev

# Test prediction endpoint (requires authentication token)
curl -X POST http://localhost:5000/loans/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "age": 30,
    "income": 50000,
    "existingDebtPayment": 500,
    "loanAmount": 10000,
    "loanRate": 5.5,
    "loanTerm": 5,
    "hasDependents": false,
    "hasMortgage": true,
    "loanPurpose": "Home"
  }'
```

## Notes

- The models use the same preprocessing as in the training notebooks
- Predictions are stored with loan applications in MongoDB
- The frontend displays predictions on the output page
- If ML prediction fails, the application can still be saved (depending on configuration)
