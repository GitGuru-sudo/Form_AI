import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const RUNNING_IN_DOCKER = process.env.RUNNING_IN_DOCKER === 'true';
const MONGODB_URL = RUNNING_IN_DOCKER
  ? (process.env.DOCKER_MONGODB_URL || process.env.MONGODB_URL || 'mongodb://localhost:27017/formai')
  : (process.env.MONGODB_URL || 'mongodb://localhost:27017/formai');

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 2000;

function getSanitizedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sanitized = new URL(parsed.protocol + '//' + parsed.host + parsed.pathname);
    return sanitized.href;
  } catch {
    return '[invalid URL]';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const connectDB = async () => {
  const sanitized = getSanitizedUrl(MONGODB_URL);
  logger.info('Connecting to MongoDB', { target: sanitized });

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      await mongoose.connect(MONGODB_URL, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      logger.info('MongoDB connected');
      return;
    } catch (err: any) {
      lastError = err;
      const errorMessage = err.message || 'Unknown error';

      if (errorMessage.includes('Authentication failed') || errorMessage.includes('SCRAM')) {
        logger.error('MongoDB auth failed', { error: errorMessage });
        break;
      }

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn('MongoDB connection failed, retrying', { attempt, maxRetries: MAX_RETRIES, delay: `${delay/1000}s`, error: errorMessage });
        await sleep(delay);
      }
    }
  }

  if (lastError) {
    logger.error('MongoDB connection failed', { attempts: MAX_RETRIES, error: lastError.message });
  }
  process.exit(1);
};
