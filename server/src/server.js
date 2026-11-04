import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB, closeDB, getDBInfo } from './config/db.js';
import batchRoutes from './routes/batchRoutes.js';
import inspectionRoutes from './routes/inspectionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { seedInitialData } from './seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// API Routes
app.use('/api/batches', batchRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);

// Health Check with Database Persistence Details
app.get('/api/health', (req, res) => {
  const dbInfo = getDBInfo();
  res.json({
    status: 'online',
    system: 'QualityCheck Log (QCL) API',
    database: dbInfo,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

let serverInstance = null;

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    
    // Seed initial demo data only if database is completely empty
    await seedInitialData();

    serverInstance = app.listen(PORT, () => {
      const dbInfo = getDBInfo();
      console.log(`=======================================================`);
      console.log(`  QualityCheck Log Backend Server running on port ${PORT}`);
      console.log(`  Storage Type: ${dbInfo.storageType}`);
      console.log(`  Persistent:   ${dbInfo.isPersistent ? 'YES (All data preserved across restarts)' : 'NO'}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
};

// Graceful shutdown handling to flush writes and release locks
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[Process] Received ${signal}. Closing server and persisting database...`);
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('[Process] HTTP server closed.');
    });
  }
  await closeDB();
  process.exit(0);
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

startServer();

