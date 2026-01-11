# MongoDB Setup Guide

This guide will help you set up MongoDB for the NuviX project. You can use either MongoDB Atlas (cloud) or a local MongoDB installation.

## Option 1: MongoDB Atlas (Cloud - Recommended)

MongoDB Atlas is a free cloud-hosted MongoDB service. This is recommended for development and production.

### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create a Cluster

1. After logging in, click **"Build a Database"**
2. Choose **FREE (M0) Shared** cluster
3. Select a **Cloud Provider** (AWS recommended)
4. Choose a **Region** closest to you
5. Click **"Create"** (takes 1-3 minutes)

### Step 3: Create Database User

1. Once cluster is created, click **"Database Access"** in the left sidebar
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter:
   - **Username**: `nuvixuser` (or your preferred username)
   - **Password**: Generate a strong password (save it securely!)
5. Under **"Database User Privileges"**, select **"Atlas admin"** (for development) or **"Read and write to any database"**
6. Click **"Add User"**

### Step 4: Configure Network Access

1. Click **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. For development, click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ **Note**: This is only for development. For production, add specific IPs.
4. Click **"Confirm"**

### Step 5: Get Connection String

1. Click **"Database"** in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **"Node.js"** as driver and **version 5.5 or later**
5. Copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Update Connection String

Replace `<username>` and `<password>` in the connection string with your database user credentials from Step 3.

**Example:**
```
mongodb+srv://nuvixuser:YourPassword123@cluster0.abc123.mongodb.net/nuvix?retryWrites=true&w=majority
```

Note: Add `/nuvix` before `?` to specify the database name (optional, MongoDB will create it automatically).

### Step 7: Add to Environment Variables

Create or edit `Backend/.env` file:

```bash
MONGO_URI=mongodb+srv://nuvixuser:YourPassword123@cluster0.abc123.mongodb.net/nuvix?retryWrites=true&w=majority
```

Replace with your actual connection string.

## Option 2: Local MongoDB Installation

If you prefer to run MongoDB locally on your machine.

### Step 1: Install MongoDB

#### macOS (using Homebrew):
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB Community Edition
brew tap mongodb/brew
brew install mongodb-community
```

#### Windows:
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Choose "Complete" installation
4. Install as a Windows Service (recommended)

#### Linux (Ubuntu/Debian):
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update packages
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org
```

### Step 2: Start MongoDB

#### macOS:
```bash
brew services start mongodb-community
```

#### Windows:
MongoDB should start automatically as a service. Or use:
```bash
net start MongoDB
```

#### Linux:
```bash
sudo systemctl start mongod
sudo systemctl enable mongod  # Start on boot
```

### Step 3: Verify MongoDB is Running

```bash
# Check status
mongosh --eval "db.version()"
```

Or connect to MongoDB shell:
```bash
mongosh
```

### Step 4: Create Database User (Optional but Recommended)

1. Connect to MongoDB:
```bash
mongosh
```

2. Switch to admin database:
```javascript
use admin
```

3. Create admin user:
```javascript
db.createUser({
  user: "nuvixuser",
  pwd: "YourSecurePassword123",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})
```

4. Exit: `exit`

### Step 5: Update Connection String

For local MongoDB, use:

**Without authentication:**
```bash
MONGO_URI=mongodb://localhost:27017/nuvix
```

**With authentication:**
```bash
MONGO_URI=mongodb://nuvixuser:YourSecurePassword123@localhost:27017/nuvix?authSource=admin
```

### Step 6: Add to Environment Variables

Create or edit `Backend/.env` file:

```bash
MONGO_URI=mongodb://localhost:27017/nuvix
```

## Testing the Connection

### Method 1: Test via Backend Server

1. Make sure your `Backend/.env` file has the correct `MONGO_URI`
2. Start the backend server:
```bash
cd Backend
npm run dev
```

3. If successful, you should see:
```
MongoDB Atlas Connected
Server running on port 5000
```

If you see errors, check:
- MongoDB is running (for local)
- Connection string is correct
- Network access is configured (for Atlas)
- Credentials are correct

### Method 2: Test via MongoDB Shell

#### For MongoDB Atlas:
```bash
mongosh "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/nuvix"
```

#### For Local MongoDB:
```bash
mongosh mongodb://localhost:27017/nuvix
```

If connection succeeds, you'll see the MongoDB shell prompt.

### Method 3: Test via Node.js Script

Create a test file `Backend/test-db.js`:

```javascript
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connection successful!');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
```

Run it:
```bash
cd Backend
node test-db.js
```

## Connection String Format Reference

### MongoDB Atlas:
```
mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
```

### Local MongoDB (No Auth):
```
mongodb://localhost:27017/<database>
```

### Local MongoDB (With Auth):
```
mongodb://<username>:<password>@localhost:27017/<database>?authSource=admin
```

## Troubleshooting Common Issues

### Issue 1: "MongoServerError: Authentication failed"
**Solution:**
- Verify username and password are correct
- Check that user exists in MongoDB
- For Atlas: Make sure you're using the database user, not Atlas account credentials
- For local: Verify authSource parameter if using authentication

### Issue 2: "MongoNetworkError: failed to connect"
**Solution:**
- **For Atlas**: 
  - Check Network Access allows your IP (or 0.0.0.0/0 for development)
  - Verify connection string is correct
  - Check firewall/antivirus settings
- **For Local**:
  - Ensure MongoDB service is running: `brew services list` (macOS) or `systemctl status mongod` (Linux)
  - Check if port 27017 is open: `lsof -i :27017`
  - Verify MongoDB is listening: `mongosh --eval "db.version()"`

### Issue 3: "MongooseError: The `uri` parameter to `openUri()` must be a string"
**Solution:**
- Check that `MONGO_URI` is set in `.env` file
- Verify `.env` file is in `Backend/` directory
- Make sure `require('dotenv').config()` is called before mongoose.connect

### Issue 4: Connection works but collections don't appear
**Solution:**
- This is normal! Collections are created automatically when you save your first document
- The database will be created automatically when you first insert data

### Issue 5: "ENOTFOUND" error
**Solution:**
- Check your internet connection (for Atlas)
- Verify the cluster hostname in connection string is correct
- Try pinging the cluster: `ping cluster0.xxxxx.mongodb.net`

## Security Best Practices

1. **Never commit `.env` files to git** ✅ (already in .gitignore)
2. **Use strong passwords** (minimum 12 characters, mix of letters, numbers, symbols)
3. **Restrict network access** in production (only allow specific IPs)
4. **Use different users for development and production**
5. **Rotate passwords regularly**
6. **Enable MongoDB encryption at rest** (available in Atlas paid plans)

## Next Steps

After MongoDB is set up:

1. ✅ Verify connection with test script
2. ✅ Start backend server: `cd Backend && npm run dev`
3. ✅ Test API endpoints (register user, create loan application)
4. ✅ Check MongoDB to see created collections:
   - `users` - User accounts
   - `loanaplications` - Loan applications with ML predictions

## Useful MongoDB Commands

### Connect to MongoDB Shell:
```bash
mongosh "<your-connection-string>"
```

### View Databases:
```javascript
show dbs
```

### Use Database:
```javascript
use nuvix
```

### View Collections:
```javascript
show collections
```

### View Documents in Collection:
```javascript
db.users.find()
db.loanaplications.find()
```

### Count Documents:
```javascript
db.users.countDocuments()
db.loanaplications.countDocuments()
```

### Drop Collection (⚠️ Deletes all data):
```javascript
db.users.drop()
```

## Need Help?

- **MongoDB Atlas Documentation**: https://docs.atlas.mongodb.com/
- **MongoDB Manual**: https://docs.mongodb.com/manual/
- **Mongoose Documentation**: https://mongoosejs.com/docs/
