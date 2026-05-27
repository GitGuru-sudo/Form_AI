import { getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      clerkUserId?: string;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  req.clerkUserId = userId;
  next();
};
