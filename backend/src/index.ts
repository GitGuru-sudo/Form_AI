import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { connectDB } from './lib/mongodb';
import logger from './lib/logger';

import formsRoutes from './routes/forms.routes';
import responsesRoutes from './routes/responses.routes';
import mlRoutes from './routes/ml.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  logger.info('request started', { method: req.method, path: req.path });
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('request', { method: req.method, path: req.path, status: res.statusCode, duration: `${duration}ms` });
  });
  next();
});

app.use(clerkMiddleware());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/forms', formsRoutes);
app.use('/api', responsesRoutes);
app.use('/api/ml', mlRoutes);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info('Server started', { port: PORT });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
};

startServer();
