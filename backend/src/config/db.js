const mongoose = require('mongoose');
const path = require('path');

let mongod = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/meditrack';

  try {
    // 1. Attempt connecting to configured URI (e.g. local mongod or Atlas)
    console.log(`[Database] Attempting connection to MongoDB at: ${uri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] MongoDB Connected to external instance: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`[Database] External MongoDB connection not available (${err.message}). Starting embedded MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const cacheDir = path.resolve(__dirname, '../../.cache');
      mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'meditrack'
        },
        binary: {
          downloadDir: cacheDir,
        }
      });
      const memoryUri = mongod.getUri();
      console.log(`[Database] Embedded MongoDB Server running at: ${memoryUri}`);
      await mongoose.connect(memoryUri);
      console.log(`[Database] Successfully connected to embedded MongoDB!`);
    } catch (memErr) {
      console.error(`[Database] Failed to start embedded MongoDB Server: ${memErr.message}`);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};

module.exports = { connectDB, disconnectDB };
