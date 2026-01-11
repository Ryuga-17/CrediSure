# CrediSure - Credit Risk Analyzer

A machine learning-powered credit risk assessment system for loan default prediction.

## Features

- **Credit Score Prediction**: LightGBM model for creditworthiness scoring
- **Default Risk Assessment**: PyTorch neural network for default probability prediction
- **User Authentication**: JWT-based secure authentication
- **Loan Application Management**: Submit and track loan applications
- **Real-time Predictions**: ML-powered risk analysis

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB
- **ML Models**: LightGBM, PyTorch
- **Database**: MongoDB

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.7+
- MongoDB (Atlas or local)

### Installation

1. **Backend Setup**
   ```bash
   cd Backend
   npm install
   pip install -r requirements.txt
   ```

2. **Frontend Setup**
   ```bash
   cd my-app
   npm install
   ```

3. **Environment Variables**

   Create `Backend/.env`:
   ```env
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret-key
   PORT=5000
   ```

   Create `my-app/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. **Run**

   Backend:
   ```bash
   cd Backend
   npm run dev
   ```

   Frontend:
   ```bash
   cd my-app
   npm run dev
   ```

## Project Structure

```
CreditSure/
├── Backend/          # Express API server
├── my-app/           # Next.js frontend
├── *.pkl            # ML model files
└── *.ipynb          # Model training notebooks
```

## License

MIT
