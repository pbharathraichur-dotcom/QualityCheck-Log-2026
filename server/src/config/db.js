import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongodInstance = null;
let mongodChildPid = null;
let currentStorageType = 'Disconnected';
let isPersistentStorage = false;

// Format masked URI for safe logging (hides password)
const maskMongoURI = (uri) => {
  if (!uri) return 'None';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)@/, '$1*****@');
};

export const getDBInfo = () => {
  return {
    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    storageType: currentStorageType,
    isPersistent: isPersistentStorage,
    databaseName: mongoose.connection.name || 'qcl_inspection_db',
    host: mongoose.connection.host || 'unknown',
    readyState: mongoose.connection.readyState
  };
};

/**
 * Clean up orphaned mongod processes and stale lock files from previous unclean exits.
 * Crucial: Only stale lock pointers are cleaned; all .wt data files and collections are strictly preserved.
 */
const cleanupOrphanedMongo = (dbDir) => {
  // 1. Terminate orphaned background mongod processes spawned from node_modules cache
  if (process.platform === 'win32') {
    try {
      execSync('taskkill /F /IM mongod-x64-win32*.exe', { stdio: 'ignore' });
      // Brief pause to allow Windows kernel to release file handles
      const start = Date.now();
      while (Date.now() - start < 300) {}
    } catch (e) {
      // No process running, normal
    }
  }

  // 2. Check mongod.lock file
  const lockFile = path.join(dbDir, 'mongod.lock');
  if (fs.existsSync(lockFile)) {
    try {
      const content = fs.readFileSync(lockFile, 'utf8').trim();
      const pid = parseInt(content, 10);

      if (!isNaN(pid) && pid > 0) {
        let isAlive = false;
        try {
          process.kill(pid, 0);
          isAlive = true;
        } catch (e) {
          isAlive = false;
        }

        if (isAlive) {
          console.log(`[Database] Terminating orphaned process (PID: ${pid}) holding lock...`);
          try {
            if (process.platform === 'win32') {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            } else {
              process.kill(pid, 'SIGKILL');
            }
          } catch (e) {}
          const start = Date.now();
          while (Date.now() - start < 300) {}
        }
      }

      // Truncate lock file to 0 bytes so mongod starts without DBPathInUse
      fs.writeFileSync(lockFile, '');
    } catch (lockErr) {
      console.warn(`! [Database] Lock cleanup notice: ${lockErr.message}`);
    }
  }
};

/**
 * Register process exit handlers to ensure mongod child process is never orphaned on Windows.
 */
const registerProcessCleanup = () => {
  const killChild = () => {
    if (mongodChildPid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /PID ${mongodChildPid}`, { stdio: 'ignore' });
        } else {
          process.kill(mongodChildPid, 'SIGKILL');
        }
      } catch (e) {}
      mongodChildPid = null;
    }
  };

  process.once('exit', killChild);
  process.once('SIGINT', () => {
    killChild();
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    killChild();
    process.exit(0);
  });
};

export const connectDB = async () => {
  const customUri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';
  const isAtlas = customUri.startsWith('mongodb+srv://') || customUri.includes('.mongodb.net');
  const allowLocalFallback = process.env.ALLOW_LOCAL_FALLBACK !== 'false';

  // Configure Mongoose global options
  mongoose.set('strictQuery', true);

  // Set up connection event listeners once
  if (mongoose.connection.listenerCount('error') === 0) {
    mongoose.connection.on('connected', () => {
      console.log(`[Database Event] Mongoose connected to: ${mongoose.connection.name} (${mongoose.connection.host})`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[Database Event] Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Event] Mongoose connection disconnected.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database Event] Mongoose connection re-established.');
    });
  }

  // 1. Attempt connection to configured MONGO_URI (Atlas or Local MongoDB service)
  if (customUri) {
    const masked = maskMongoURI(customUri);
    console.log(`[Database] Connecting to configured MongoDB (${isAtlas ? 'MongoDB Atlas' : 'Local MongoDB'}): ${masked}...`);

    try {
      await mongoose.connect(customUri, {
        serverSelectionTimeoutMS: isAtlas ? 10000 : 3500,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        autoIndex: true
      });

      currentStorageType = isAtlas ? 'MongoDB Atlas' : 'Local MongoDB Service';
      isPersistentStorage = true;

      console.log(`✓ [Database] Successfully connected to persistent MongoDB:`);
      console.log(`    Type: ${currentStorageType}`);
      console.log(`    Host: ${mongoose.connection.host}`);
      console.log(`    Database: ${mongoose.connection.name}`);
      console.log(`    Persistence: ENABLED (All batches, inspections, sign-offs are preserved)`);
      return;
    } catch (err) {
      console.error(`\n! [Database] Could not connect to configured MONGO_URI (${masked}):`);
      console.error(`    Error Code: ${err.code || 'N/A'}`);
      console.error(`    Message: ${err.message}`);

      if (isAtlas) {
        console.error('\n--- MongoDB Atlas Diagnostic Troubleshooting ---');
        console.error('1. Network Access: Ensure your IP address is whitelisted in MongoDB Atlas (Network Access -> Add IP Address -> 0.0.0.0/0 for testing).');
        console.error('2. Database User: Verify the username & password in MONGO_URI are correct (Database Access tab).');
        console.error('3. Special Characters: If your password has symbols (@, :, #), URL-encode them.');
        console.error('------------------------------------------------\n');
      } else {
        console.error('\n--- Local MongoDB Diagnostic ---');
        console.error('Local MongoDB service is not running on 127.0.0.1:27017.');
        console.error('To run local service, start it via Windows Services or run "mongod".');
        console.error('--------------------------------\n');
      }

      if (!allowLocalFallback) {
        console.error('ALLOW_LOCAL_FALLBACK is set to false. Exiting process.');
        process.exit(1);
      }
    }
  }

  // 2. Persistent Disk-Backed Local Storage Fallback
  // Stored permanently at server/data/db with WiredTiger engine.
  const dbDir = path.resolve(__dirname, '../../data/db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[Database] Activating Persistent Disk-Backed Storage at: ${dbDir}...`);

  // Clean any stale locks or orphaned processes from previous runs
  cleanupOrphanedMongo(dbDir);

  // Helper to start MongoMemoryServer with retry logic
  const startPersistentInstance = async (retry = true) => {
    try {
      const instance = await MongoMemoryServer.create({
        instance: {
          dbPath: dbDir,
          storageEngine: 'wiredTiger'
        }
      });
      return instance;
    } catch (err) {
      if (retry) {
        console.warn('! [Database] Initial instance spawn failed. Retrying after lock refresh...');
        cleanupOrphanedMongo(dbDir);
        return await startPersistentInstance(false);
      }
      throw err;
    }
  };

  try {
    mongodInstance = await startPersistentInstance(true);
    mongodChildPid = mongodInstance.instanceInfo?.childProcess?.pid || null;
    registerProcessCleanup();

    const uri = mongodInstance.getUri();
    await mongoose.connect(uri, {
      dbName: 'qcl_inspection_db',
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    currentStorageType = 'Persistent Local Disk (WiredTiger)';
    isPersistentStorage = true;

    console.log(`✓ [Database] Connected to Persistent Disk MongoDB:`);
    console.log(`    Directory: ${dbDir}`);
    console.log(`    Database: qcl_inspection_db`);
    console.log(`    Storage Engine: WiredTiger on disk`);
    console.log(`    Persistence: ENABLED (Data is preserved across restarts even without external MongoDB server)`);
  } catch (embeddedErr) {
    console.error('✗ [Database] Fatal: Failed to initialize persistent storage:', embeddedErr.message);
    process.exit(1);
  }
};

export const closeDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log('[Database] Mongoose connection closed gracefully.');
    }
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
      console.log('[Database] Persistent Embedded MongoDB stopped gracefully.');
    }
    if (mongodChildPid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /PID ${mongodChildPid}`, { stdio: 'ignore' });
        } else {
          process.kill(mongodChildPid, 'SIGKILL');
        }
      } catch (e) {}
      mongodChildPid = null;
    }
  } catch (err) {
    console.error('[Database] Error while closing database connection:', err.message);
  }
};
