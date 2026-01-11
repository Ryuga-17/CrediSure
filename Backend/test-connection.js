require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set (hidden)' : 'NOT SET');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connection successful!');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('Connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    if (error.message.includes('authentication')) {
      console.error('\n💡 Tip: Check your username and password');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Tip: Check your connection string and network access');
    }
    process.exit(1);
  }
}

testConnection();
