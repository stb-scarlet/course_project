import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PositionAccessType, Role } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { evaluateAccessRules } from '../utils/accessRules';

// GET /api/cvs/:cvId
export async function getCV(req: Request, res: Response, next: NextFunction) {
  try {
    const cv = await prisma.cV.findUnique({
      where: { id: req.params.cvId },
      include: {
        user: {
          include: {
            profile: {
              include: {
                attributeValues: { include: { attribute: true } },
                projects: { include: { tags: { include: { tag: true } } } },
              },
            },
          },
        },
        position: {
          include: {
            attributes: { include: { attribute: true }, orderBy: { order: 'asc' } },
            positionTags: { include: { tag: true } },
          },
        },
        _count: { select: { likes: true } },
      },
    });

    if (!cv) throw new AppError(404, 'CV not found');

    const requesterId = req.user!.id;
    const role = req.user!.role;
    const isOwner = cv.userId === requesterId;

    if (!isOwner && role === Role.CANDIDATE) throw new AppError(403, 'Forbidden');
    if (cv.isHidden && role === Role.RECRUITER) throw new AppError(404, 'CV not found');

    // Build generated CV data
    const generated = buildCVData(cv);
    res.json({ cv, generated });
  } catch (err) {
    next(err);
  }
}

// POST /api/cvs — create CV for a position
export async function createCV(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ positionId: z.string() });
    const { positionId } = schema.parse(req.body);

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        attributes: { include: { attribute: true } },
        accessRules: { include: { attribute: true } },
      },
    });
    if (!position) throw new AppError(404, 'Position not found');

    // Check access
    if (position.accessType === PositionAccessType.RESTRICTED) {
      const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
      if (!profile) throw new AppError(403, 'Access denied');

      const attrValues = await prisma.attributeValue.findMany({ where: { profileId: profile.id } });
      const valueMap = new Map(attrValues.map((av) => [av.attributeId, av.value]));

      if (!evaluateAccessRules(position.accessRules, valueMap)) {
        throw new AppError(403, 'You do not meet the access requirements for this position');
      }
    }

    const cv = await prisma.cV.create({
      data: { userId: req.user!.id, positionId },
    });

    // Auto-add missing position attributes to profile
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (profile) {
      for (const pa of position.attributes) {
        await prisma.attributeValue.upsert({
          where: { profileId_attributeId: { profileId: profile.id, attributeId: pa.attributeId } },
          create: { profileId: profile.id, attributeId: pa.attributeId, value: null },
          update: {},
        });
      }
    }

    res.status(201).json(cv);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cvs/:cvId
export async function deleteCV(req: Request, res: Response, next: NextFunction) {
  try {
    const cv = await prisma.cV.findUnique({ where: { id: req.params.cvId } });
    if (!cv) throw new AppError(404, 'CV not found');

    const isOwner = cv.userId === req.user!.id;
    if (!isOwner && req.user!.role !== Role.ADMIN) throw new AppError(403, 'Forbidden');

    await prisma.cV.delete({ where: { id: req.params.cvId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/cvs/my — list current user's CVs
export async function listMyCVs(req: Request, res: Response, next: NextFunction) {
  try {
    const cvs = await prisma.cV.findMany({
      where: { userId: req.user!.id, isHidden: false },
      include: {
        position: { select: { title: true, shortDescription: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(cvs);
  } catch (err) {
    next(err);
  }
}

// POST /api/cvs/:cvId/like — recruiter likes a CV
export async function likeCV(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.cVLike.create({
      data: { cvId: req.params.cvId, recruiterId: req.user!.id },
    });
    res.status(201).json({ liked: true });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cvs/:cvId/like — recruiter removes like
export async function unlikeCV(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.cVLike.delete({
      where: { cvId_recruiterId: { cvId: req.params.cvId, recruiterId: req.user!.id } },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/cvs/search?q=&positionId=&minLikes=
export async function searchCVs(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || '');
    const positionId = req.query.positionId as string | undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.min(50, parseInt(String(req.query.limit || '20')));
    const skip = (page - 1) * limit;

    const where: any = { isHidden: false };
    if (positionId) where.positionId = positionId;
    if (q) {
      where.user = {
        profile: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
          ],
        },
      };
    }

    const [items, total] = await Promise.all([
      prisma.cV.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { profile: { select: { firstName: true, lastName: true, photoUrl: true } } } },
          position: { select: { title: true } },
          _count: { select: { likes: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.cV.count({ where }),
    ]);

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// ─── CV Generation Helper ─────────────────────────────────────────────────────

function buildCVData(cv: any) {
  const profile = cv.user.profile;
  const position = cv.position;

  // Get position attribute IDs for filtering
  const posAttrIds = new Set(position.attributes.map((pa: any) => pa.attributeId));
  const posTagNames = new Set(position.positionTags.map((pt: any) => pt.tag.name));

  // Filter profile attributes to only those in position
  const relevantAttributes = (profile.attributeValues || []).filter((av: any) =>
    posAttrIds.has(av.attributeId)
  );

  // Filter projects by position tags, limit to maxProjects
  const relevantProjects = (profile.projects || [])
    .filter((p: any) => p.tags.some((t: any) => posTagNames.has(t.tag.name)))
    .slice(0, position.maxProjects);

  return {
    candidate: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      location: profile.location,
      photoUrl: profile.photoUrl,
    },
    positionTitle: position.title,
    attributes: relevantAttributes,
    projects: relevantProjects,
  };
}
