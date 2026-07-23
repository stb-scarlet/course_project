import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/prisma';
import { signToken } from '../utils/jwt';
import { AppError } from '../middlewares/error.middleware';
import { Role } from '@prisma/client';
// import { ExtractJwt } from 'passport-jwt';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new AppError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        profile: {
          create: { firstName: data.firstName, lastName: data.lastName },
        },
      },
    });

    const token = signToken(user.id, user.role);

    // await prisma.userSession.create({
    //   data: {
    //     userId: user.id,
    //     token: token,
    //     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    //   },
    // });


    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash) throw new AppError(401, 'Invalid credentials');
    if (user.isBlocked) throw new AppError(403, 'Account is blocked');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const token = signToken(user.id, user.role);

    // await prisma.userSession.create({
    //   data: {
    //     userId: user.id,
    //     token: token,
    //     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    //   },
    // });
    
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

// // POST /api/auth/logout
// export async function logout(req: Request, res: Response, next: NextFunction) {
//   try {
//     const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

//     if (token) {
//       await prisma.userSession.deleteMany({
//         where: { token: token }
//       });
//     }

//     res.status(204).send();
//   } catch (err) {
//     next(err);
//   }
// }


// GET /api/auth/me
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, role: true,
        language: true, theme: true,
        profile: { select: { firstName: true, lastName: true, photoUrl: true } },
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/auth/preferences
export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      language: z.enum(['en', 'ru']).optional(),
      theme: z.enum(['light', 'dark']).optional(),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: { language: true, theme: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// OAuth callback handler (called after passport.authenticate)
export function oauthCallback(req: Request, res: Response) {
  const user = req.user as { id: string; role: Role; email: string };
  const token = signToken(user.id, user.role);
  // Redirect to frontend with token in query param (frontend stores it)
  res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
}
