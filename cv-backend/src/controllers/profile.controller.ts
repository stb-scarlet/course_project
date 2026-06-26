import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { Role } from '@prisma/client';

// GET /api/profile/:userId
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const requesterId = req.user!.id;
    const requesterRole = req.user!.role;

    // Only owner or admin can see full profile
    const isOwner = requesterId === userId;
    const isAdmin = requesterRole === Role.ADMIN;
    const isRecruiter = requesterRole === Role.RECRUITER;

    if (!isOwner && !isAdmin && !isRecruiter) {
      throw new AppError(403, 'Access denied');
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, role: true } },
        attributeValues: {
          include: { attribute: true },
          orderBy: { attribute: { name: 'asc' } },
        },
        projects: {
          include: { tags: { include: { tag: true } } },
          orderBy: { dateFrom: 'desc' },
        },
      },
    });

    if (!profile) throw new AppError(404, 'Profile not found');

    // Recruiters only see CV-related data (read-only)
    if (isRecruiter && !isAdmin) {
      const { attributeValues, projects, ...publicData } = profile;
      return res.json({ ...publicData, attributeValues, projects });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/profile — update basic info with optimistic locking
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      location: z.string().optional(),
      photoUrl: z.string().url().optional(),
      version: z.number().int(),
    });
    const { version, ...data } = schema.parse(req.body);

    const targetUserId = req.params.userId || req.user!.id;
    if (targetUserId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      throw new AppError(403, 'Cannot edit another user\'s profile');
    }

    const profile = await prisma.profile.findUnique({ where: { userId: targetUserId } });
    if (!profile) throw new AppError(404, 'Profile not found');

    // Optimistic locking check
    if (profile.version !== version) {
      return res.status(409).json({
        error: 'Version conflict',
        currentVersion: profile.version,
        message: 'Profile was modified by another session. Please refresh.',
      });
    }

    const updated = await prisma.profile.update({
      where: { userId: targetUserId },
      data: { ...data, version: { increment: 1 } },
    });

    res.json({ ...updated });
  } catch (err) {
    next(err);
  }
}

// PUT /api/profile/attributes/:attributeId — upsert attribute value with optimistic locking
export async function upsertAttributeValue(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      value: z.string().nullable(),
      version: z.number().int(),
    });
    const { value, version } = schema.parse(req.body);
    const { attributeId } = req.params;

    const targetUserId = req.params.userId || req.user!.id;
    if (targetUserId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      throw new AppError(403, 'Forbidden');
    }

    const profile = await prisma.profile.findUnique({ where: { userId: targetUserId } });
    if (!profile) throw new AppError(404, 'Profile not found');

    // Check attribute exists
    const attribute = await prisma.attribute.findUnique({ where: { id: attributeId } });
    if (!attribute) throw new AppError(404, 'Attribute not found');

    // Upsert with optimistic locking
    const existing = await prisma.attributeValue.findUnique({
      where: { profileId_attributeId: { profileId: profile.id, attributeId } },
    });

    if (existing && existing.version !== version) {
      return res.status(409).json({
        error: 'Version conflict',
        currentVersion: existing.version,
      });
    }

    const result = await prisma.attributeValue.upsert({
      where: { profileId_attributeId: { profileId: profile.id, attributeId } },
      create: { profileId: profile.id, attributeId, value, version: 1 },
      update: { value, version: { increment: 1 } },
      include: { attribute: true },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/profile/attributes/:attributeId
export async function removeAttributeFromProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) throw new AppError(404, 'Profile not found');

    await prisma.attributeValue.deleteMany({
      where: { profileId: profile.id, attributeId: req.params.attributeId },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().min(1),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime().nullable().optional(),
  description: z.string(),
  tags: z.array(z.string()),
  version: z.number().int().optional().default(0),
});

// POST /api/profile/projects
export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const data = projectSchema.parse(req.body);
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) throw new AppError(404, 'Profile not found');

    const project = await prisma.project.create({
      data: {
        profileId: profile.id,
        name: data.name,
        dateFrom: new Date(data.dateFrom),
        dateTo: data.dateTo ? new Date(data.dateTo) : null,
        description: data.description,
        tags: {
          create: await resolveTagIds(data.tags),
        },
      },
      include: { tags: { include: { tag: true } } },
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/profile/projects/:projectId
export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const data = projectSchema.parse(req.body);
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(404, 'Project not found');

    if (project.version !== (data.version ?? 0)) {
      return res.status(409).json({ error: 'Version conflict', currentVersion: project.version });
    }

    // Remove old tags and re-add
    await prisma.projectTag.deleteMany({ where: { projectId } });

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: data.name,
        dateFrom: new Date(data.dateFrom),
        dateTo: data.dateTo ? new Date(data.dateTo) : null,
        description: data.description,
        version: { increment: 1 },
        tags: { create: await resolveTagIds(data.tags) },
      },
      include: { tags: { include: { tag: true } } },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/profile/projects/:projectId
export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project || project.profileId !== profile?.id) {
      throw new AppError(404, 'Project not found');
    }

    await prisma.project.delete({ where: { id: projectId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/tags/autocomplete?q=react
export async function autocompleteTags(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || '');
    const tags = await prisma.tag.findMany({
      where: { name: { startsWith: q } },
      take: 10,
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (err) {
    next(err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveTagIds(tagNames: string[]) {
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
