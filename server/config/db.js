const mongoose = require("mongoose");

const connectDB = async () => {
  const atlasUri = process.env.MONGO_URI;
  const localUri = process.env.LOCAL_MONGO_URI || "mongodb://127.0.0.1:27017/SmartTimetableDB";

  if (atlasUri) {
    try {
      await mongoose.connect(atlasUri, { serverSelectionTimeoutMS: 5000 });
      console.log("MongoDB connected to Atlas cluster successfully");
      return;
    } catch (atlasError) {
      console.warn("MongoDB Atlas connection unavailable:", atlasError.message);
      console.log("Falling back to local MongoDB instance...");
    }
  }

  try {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connected to local database successfully:", localUri);
  } catch (localError) {
    console.error("Local MongoDB connection also failed:", localError.message);
    process.exit(1);
  }
};

module.exports = connectDB;
