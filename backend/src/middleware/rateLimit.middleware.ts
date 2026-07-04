import rateLimit from 'express-rate-limit';
import logger from '../lib/logger';

const disabled = process.env.DISABLE_RATE_LIMIT === 'true';

const passthrough = (_req: unknown, _res: unknown, next: () => void) => next();

const sharedOptions = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
};

export const submitLimiter = disabled
  ? passthrough
  : rateLimit({
      ...sharedOptions,
      windowMs: 10 * 60 * 1000,
      limit: 8,
      message: { message: 'Too many submissions. Please wait a few minutes and try again.' },
      handler: (req, res, _next, options) => {
        logger.warn('rate limit hit (submit)', { ip: req.ip, path: req.path });
        res.status(options.statusCode).json(options.message);
      },
    });

export const readLimiter = disabled
  ? passthrough
  : rateLimit({
      ...sharedOptions,
      windowMs: 5 * 60 * 1000,
      limit: 100,
      message: { message: 'Too many requests. Please slow down.' },
      handler: (req, res, _next, options) => {
        logger.warn('rate limit hit (read)', { ip: req.ip, path: req.path });
        res.status(options.statusCode).json(options.message);
      },
    });

export const globalLimiter = disabled
  ? passthrough
  : rateLimit({
      ...sharedOptions,
      windowMs: 60 * 1000,
      limit: 300,
      message: { message: 'Too many requests. Please slow down.' },
    });
