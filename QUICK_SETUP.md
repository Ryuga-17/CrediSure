# Quick Setup Guide

## Environment Variables Required

### 1. Backend Environment Variables

**Location:** Create `Backend/.env` file

```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nuvix?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
PORT=5000
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Frontend Environment Variables

**Location:** Create `my-app/.env.local` file

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8000
```

## Setup Steps

1. **Backend Setup:**
   ```bash
   cd Backend
   # Create .env file with the variables above
   npm install
   npm run dev
   ```

2. **Frontend Setup:**
   ```bash
   cd my-app
   # Create .env.local file with the variables above
   npm install
   npm run dev
   ```

3. **Python ML Dependencies:**
   ```bash
   pip install -r Backend/requirements.txt
   ```

## Required Variables Summary

| Location | Variable | Required | Description |
|----------|----------|----------|-------------|
| `Backend/.env` | `MONGO_URI` | ✅ | MongoDB connection string |
| `Backend/.env` | `JWT_SECRET` | ✅ | JWT token secret key |
| `Backend/.env` | `PORT` | ❌ | Server port (default: 5000) |
| `my-app/.env.local` | `NEXT_PUBLIC_API_URL` | ❌ | Backend API URL (default: http://localhost:5000) |
| `my-app/.env.local` | `NEXT_PUBLIC_CHAT_API_URL` | ❌ | Chat API URL (optional) |

For detailed information, see `ENVIRONMENT_SETUP.md`
