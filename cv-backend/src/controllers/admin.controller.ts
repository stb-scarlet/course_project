import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

// GET /api/admin/users?q=&role=&page=&limit=
export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || '');
    const role = req.query.role as Role | undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.min(50, parseInt(String(req.query.limit || '20')));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { profile: { firstName: { contains: q } } },
        { profile: { lastName: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true, email: true, role: true,
          isBlocked: true, createdAt: true,
          profile: { select: { firstName: true, lastName: true, photoUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:userId/role
export async function assignRole(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ role: z.nativeEnum(Role) });
    const { role } = schema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:userId/block
export async function blockUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { isBlocked: true },
      select: { id: true, isBlocked: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:userId/unblock
export async function unblockUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { isBlocked: false },
      select: { id: true, isBlocked: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/users/:userId
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.params.userId === req.user!.id) {
      throw new AppError(400, 'Cannot delete your own account via admin panel');
    }
    await prisma.user.delete({ where: { id: req.params.userId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
