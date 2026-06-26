import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

// GET /api/positions/:positionId/discussion?page=&limit=
export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.min(100, parseInt(String(req.query.limit || '50')));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.discussionPost.findMany({
        where: { positionId: req.params.positionId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              role: true,
              profile: { select: { firstName: true, lastName: true, photoUrl: true } },
            },
          },
        },
      }),
      prisma.discussionPost.count({ where: { positionId: req.params.positionId } }),
    ]);

    res.json({ posts, total, page, limit });
  } catch (err) {
    next(err);
  }
}

// POST /api/positions/:positionId/discussion
export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ content: z.string().min(1) });
    const { content } = schema.parse(req.body);

    const position = await prisma.position.findUnique({ where: { id: req.params.positionId } });
    if (!position) throw new AppError(404, 'Position not found');

    const post = await prisma.discussionPost.create({
      data: {
        positionId: req.params.positionId,
        authorId: req.user!.id,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            profile: { select: { firstName: true, lastName: true, photoUrl: true } },
          },
        },
      },
    });

    // Emit via Socket.io (server will emit after this returns)
    req.app.get('io').to(`position:${req.params.positionId}`).emit('newPost', post);

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
}
