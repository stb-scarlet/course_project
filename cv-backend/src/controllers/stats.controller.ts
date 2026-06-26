import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/prisma';

// GET /api/stats — public statistics
export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalPositions,
      totalCVs,
      totalCandidates,
      totalRecruiters,
      newCVsToday,
    ] = await Promise.all([
      prisma.position.count(),
      prisma.cV.count(),
      prisma.user.count({ where: { role: Role.CANDIDATE } }),
      prisma.user.count({ where: { role: Role.RECRUITER } }),
      prisma.cV.count({ where: { createdAt: { gte: oneDayAgo } } }),
    ]);

    res.json({ totalPositions, totalCVs, totalCandidates, totalRecruiters, newCVsToday });
  } catch (err) {
    next(err);
  }
}

// GET /api/stats/latest-positions — most recently updated positions
export async function latestPositions(req: Request, res: Response, next: NextFunction) {
  try {
    const positions = await prisma.position.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { cvs: true } },
        positionTags: { include: { tag: true } },
      },
    });
    res.json(positions);
  } catch (err) {
    next(err);
  }
}

// GET /api/stats/popular-positions — top 5 by submitted CVs
export async function popularPositions(req: Request, res: Response, next: NextFunction) {
  try {
    const positions = await prisma.position.findMany({
      take: 5,
      orderBy: { cvs: { _count: 'desc' } },
      include: { _count: { select: { cvs: true } } },
    });
    res.json(positions);
  } catch (err) {
    next(err);
  }
}

// GET /api/stats/tag-cloud
export async function tagCloud(req: Request, res: Response, next: NextFunction) {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: { select: { projectTags: true, positionTags: true } },
      },
      orderBy: { name: 'asc' },
    });

    const cloud = tags.map((t) => ({
      id: t.id,
      name: t.name,
      count: t._count.projectTags + t._count.positionTags,
    })).filter((t) => t.count > 0);

    res.json(cloud);
  } catch (err) {
    next(err);
  }
}
