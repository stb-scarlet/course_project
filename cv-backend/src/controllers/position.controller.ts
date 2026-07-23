import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FilterOperator, PositionAccessType, Role } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { evaluateAccessRules } from '../utils/accessRules';

const accessRuleSchema = z.object({
  attributeId: z.string(),
  operator: z.nativeEnum(FilterOperator),
  value: z.string(), // JSON-encoded
});

const positionSchema = z.object({
  title: z.string().min(1),
  shortDescription: z.string(),
  accessType: z.nativeEnum(PositionAccessType).default('PUBLIC'),
  maxProjects: z.number().int().min(0).default(3),
  attributeIds: z.array(z.object({ attributeId: z.string(), order: z.number().default(0), required: z.boolean().default(false) })).default([]),
  tagNames: z.array(z.string()).default([]),
  accessRules: z.array(accessRuleSchema).default([]),
  version: z.number().int().optional().default(0),
});

// GET /api/positions?q=&page=&limit=
export async function listPositions(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || '');
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.min(50, parseInt(String(req.query.limit || '20')));
    const skip = (page - 1) * limit;

    const where = q
      ? { OR: [{ title: { contains: q } }, { shortDescription: { contains: q } }, {positionTags: { some: { tag: { name: { contains: q } } } }}] }
      : {};

    const [items, total] = await Promise.all([
      prisma.position.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { cvs: true } },
          positionTags: { include: { tag: true } },
        },
      }),
      prisma.position.count({ where }),
    ]);

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/positions/:id
export async function getPosition(req: Request, res: Response, next: NextFunction) {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: {
        attributes: { include: { attribute: true }, orderBy: { order: 'asc' } },
        accessRules: { include: { attribute: true } },
        positionTags: { include: { tag: true } },
        _count: { select: { cvs: true } },
      },
    });
    if (!position) throw new AppError(404, 'Position not found');
    res.json(position);
  } catch (err) {
    next(err);
  }
}

// POST /api/positions
export async function createPosition(req: Request, res: Response, next: NextFunction) {
  try {
    const data = positionSchema.parse(req.body);
    const tagConnects = await resolvePositionTags(data.tagNames);

    const position = await prisma.position.create({
      data: {
        title: data.title,
        shortDescription: data.shortDescription,
        accessType: data.accessType,
        maxProjects: data.maxProjects,
        attributes: { create: data.attributeIds },
        accessRules: { create: data.accessRules },
        positionTags: { create: tagConnects },
      },
      include: {
        attributes: { include: { attribute: true } },
        accessRules: true,
        positionTags: { include: { tag: true } },
      },
    });

    res.status(201).json(position);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/positions/:id
export async function updatePosition(req: Request, res: Response, next: NextFunction) {
  try {
    
    if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.RECRUITER) {
      throw new AppError(403, 'Forbidden. Only HR or Admin can update positions');
    }

    const data = positionSchema.parse(req.body);

    const existing = await prisma.position.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Position not found');

    if (existing.version !== data.version) {
      return res.status(409).json({ error: 'Version conflict', currentVersion: existing.version });
    }

    const tagConnects = await resolvePositionTags(data.tagNames);

    // Delete and recreate relations (simple approach)
    const [,,, position] = await prisma.$transaction([
      prisma.positionAttribute.deleteMany({ where: { positionId: req.params.id } }),
      prisma.accessRule.deleteMany({ where: { positionId: req.params.id } }),
      prisma.positionTag.deleteMany({ where: { positionId: req.params.id } }),

      prisma.position.update({
        where: { id: req.params.id },
        data: {
          title: data.title,
          shortDescription: data.shortDescription,
          accessType: data.accessType,
          maxProjects: data.maxProjects,
          version: { increment: 1 },
          attributes: { create: data.attributeIds },
          accessRules: { create: data.accessRules },
          positionTags: { create: tagConnects },
        },
        include: {
          attributes: { include: { attribute: true } },
          accessRules: { include: { attribute: true } },
          positionTags: { include: { tag: true } },
        },
      })
    ]);

    res.json(position);
  } catch (err) {
    next(err);
  }
}

// POST /api/positions/:id/duplicate
export async function duplicatePosition(req: Request, res: Response, next: NextFunction) {
  try {
    const source = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: {
        attributes: true,
        accessRules: true,
        positionTags: true,
      },
    });
    if (!source) throw new AppError(404, 'Position not found');

    const copy = await prisma.position.create({
      data: {
        title: `${source.title} (copy)`,
        shortDescription: source.shortDescription,
        accessType: source.accessType,
        maxProjects: source.maxProjects,
        attributes: {
          create: source.attributes.map(({ positionId: _, ...a }) => a),
        },
        accessRules: {
          create: source.accessRules.map(({ id: _, positionId: __, ...r }) => r),
        },
        positionTags: {
          create: source.positionTags.map(({ positionId: _, ...t }) => t),
        },
      },
    });

    res.status(201).json(copy);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/positions/:id
export async function deletePosition(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.position.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/positions/:id/access-check — can current candidate access this position?
export async function checkAccess(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role === 'ADMIN' || req.user!.role === 'RECRUITER') {
      return res.json({ hasAccess: true });
    }

    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: { accessRules: { include: { attribute: true } } },
    });
    if (!position) throw new AppError(404, 'Position not found');

    const accessType = String(position.accessType).toUpperCase();
    if (accessType === PositionAccessType.PUBLIC) {
      return res.json({ hasAccess: true });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.json({ hasAccess: false });

    const attrValues = await prisma.attributeValue.findMany({
      where: { profileId: profile.id },
    });

    const valueMap = new Map(attrValues.map((av) => [av.attributeId, av.value]));
    const hasAccess = evaluateAccessRules(position.accessRules, valueMap);

    res.json({ hasAccess });
  } catch (err) {
    next(err);
  }
}

// GET /api/positions/:id/cvs — list CVs for a position (Recruiter/Admin only)
export async function getPositionCVs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.min(50, parseInt(String(req.query.limit || '20')));
    const skip = (page - 1) * limit;
    const q = String(req.query.q || '');

    const where = {
      positionId: req.params.id,
      isHidden: false,
      ...(q
        ? {
            user: {
              profile: {
                OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }],
              },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.cV.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { profile: { select: { firstName: true, lastName: true, photoUrl: true } } } },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolvePositionTags(tagNames: string[]) {
  const result: { tagId: string }[] = [];
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    result.push({ tagId: tag.id });
  }
  return result;
}
