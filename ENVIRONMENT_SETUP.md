# Environment Variables Setup Guide

This document lists all the environment variables needed to run the NuviX project.

## Backend Environment Variables

Create a `.env` file in the `Backend/` directory with the following variables:

### Required Variables

```bash
# MongoDB Connection String
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nuvix?retryWrites=true&w=majority

# JWT Secret Key (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port (optional - defaults to 5000)
PORT=5000
```

### MongoDB URI Format

For **MongoDB Atlas** (Cloud):
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
```

For **Local MongoDB**:
```
MONGO_URI=mongodb://localhost:27017/nuvix
```

### How to Generate JWT_SECRET

You can generate a secure JWT secret using one of these methods:

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Using OpenSSL:**
```bash
openssl rand -hex 64
```

**Using Python:**
```bash
python3 -c "import secrets; print(secrets.token_hex(64))"
```

## Frontend Environment Variables

Create a `.env.local` file in the `my-app/` directory with the following variables:

### Required Variables

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Chat API URL (optional - for chatbot feature)
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8000
```

### Production Configuration

For production, update these URLs:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_CHAT_API_URL=https://chat-api.yourdomain.com
```

## Complete Setup Example

### Step 1: Backend `.env` file

Create `Backend/.env`:

```bash
# Database
MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/nuvix?retryWrites=true&w=majority

# Authentication
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6

# Server
PORT=5000
```

### Step 2: Frontend `.env.local` file

Create `my-app/.env.local`:

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Chat API (if using chatbot)
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8000
```

## Environment Variables Summary

### Backend (`Backend/.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ Yes | - | MongoDB connection string |
| `JWT_SECRET` | ✅ Yes | - | Secret key for JWT token signing |
| `PORT` | ❌ No | `5000` | Backend server port |

### Frontend (`my-app/.env.local`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ❌ No | `http://localhost:5000` | Backend API base URL |
| `NEXT_PUBLIC_CHAT_API_URL` | ❌ No | - | Chat API URL (for chatbot) |

## Python Requirements (for ML Models)

The ML models require Python 3.7+ and these packages. Install them separately:

```bash
pip install -r Backend/requirements.txt
```

Or manually:
```bash
pip install numpy pandas scikit-learn lightgbm torch
```

**Note:** Python dependencies are not environment variables but must be installed for ML predictions to work.

## Setup Checklist

- [ ] Create `Backend/.env` file with MongoDB URI and JWT_SECRET
- [ ] Create `my-app/.env.local` file with API URLs
- [ ] Install Python dependencies (`pip install -r Backend/requirements.txt`)
- [ ] Ensure Python 3.7+ is installed and accessible as `python3` or `python`
- [ ] Ensure model files (`creditscore_model.pkl`, `default_model.pkl`) are in project root
- [ ] Install Node.js dependencies for both backend and frontend
- [ ] Start MongoDB (if using local) or configure MongoDB Atlas
- [ ] Start backend server: `cd Backend && npm run dev`
- [ ] Start frontend server: `cd my-app && npm run dev`

## Security Notes

⚠️ **Important Security Guidelines:**

1. **Never commit `.env` files to version control**
   - Already included in `.gitignore`
   - Use `.env.example` files for documentation

2. **Use strong JWT secrets in production**
   - Minimum 64 characters
   - Use random strings
   - Never use default values

3. **Protect MongoDB credentials**
   - Use environment variables
   - Restrict MongoDB Atlas network access
   - Use strong passwords

4. **Use HTTPS in production**
   - Update API URLs to use HTTPS
   - Configure SSL certificates

## Troubleshooting

### Backend can't connect to MongoDB
- Check `MONGO_URI` is correct
- Verify MongoDB is running (if local)
- Check network access (if MongoDB Atlas)
- Verify username/password are correct

### Authentication not working
- Verify `JWT_SECRET` is set
- Check JWT_SECRET matches in all backend instances
- Clear browser localStorage and try again

### ML predictions not working
- Verify Python 3.7+ is installed: `python3 --version`
- Check Python packages are installed: `pip list | grep lightgbm`
- Verify model files exist in project root
- Check Python script path is correct

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` matches backend URL
- Check backend server is running
- Verify CORS is enabled in backend
- Check network/firewall settings
