import jwt from 'jsonwebtoken';
import { StringValue } from 'ms'
import { Role } from '@prisma/client';
import { JwtPayload } from '../types';

export function signToken(userId: string, role: Role): string {
  return jwt.sign(
    { userId, role } as JwtPayload,
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as StringValue }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}
