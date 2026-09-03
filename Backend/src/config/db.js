
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB Atlas Connected");
  } catch (err) {
    logger.error("MongoDB connection failed", { err });
    process.exit(1);
  }
};

connectDB();

module.exports = mongoose;