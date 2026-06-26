import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Role } from '@prisma/client';

// Require valid JWT — attaches req.user
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: Error, user: Express.Request['user']) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  })(req, res, next);
};

// Optional auth — attaches req.user if token present, but doesn't block
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (_err: Error, user: Express.Request['user']) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};

// Role guards
export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

export const requireRecruiter = requireRole(Role.RECRUITER, Role.ADMIN);
export const requireAdmin = requireRole(Role.ADMIN);
export const requireCandidate = requireRole(Role.CANDIDATE, Role.ADMIN);
