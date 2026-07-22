import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AttributeCategory, AttributeType } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

const attributeSchema = z.object({
  name: z.string().min(1),
  category: z.nativeEnum(AttributeCategory),
  type: z.nativeEnum(AttributeType),
  options: z.array(z.string()).optional(),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  regexPattern: z.string().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
});

// GET /api/attributes?q=&category=&page=&limit=
export async function listAttributes(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || '');
    const category = req.query.category as AttributeCategory | undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.min(50, parseInt(String(req.query.limit || '20')));
    const skip = (page - 1) * limit;

    const where = {
      ...(q ? { name: { contains: q } } : {}),
      ...(category ? { category } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.attribute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.attribute.count({ where }),
    ]);

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/attributes/recent — recently used by this user
export async function recentAttributes(req: Request, res: Response, next: NextFunction) {
  try {
    const recent = await prisma.attributeValue.findMany({
      include: { attribute: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    const uniqueAttrs = Array.from(
      new Map(recent.map(rv => [rv.attribute.id, rv.attribute])).values()
    );

    res.json(uniqueAttrs.slice(0, 10));
  } catch (err) {
    next(err);
  }
}

// GET /api/attributes/:id
export async function getAttribute(req: Request, res: Response, next: NextFunction) {
  try {
    const attr = await prisma.attribute.findUnique({ where: { id: req.params.id } });
    if (!attr) throw new AppError(404, 'Attribute not found');
    res.json(attr);
  } catch (err) {
    next(err);
  }
}

// POST /api/attributes
export async function createAttribute(req: Request, res: Response, next: NextFunction) {
  try {
    const data = attributeSchema.parse(req.body);
    const attr = await prisma.attribute.create({
      data: {
        ...data,
        options: data.options ? JSON.stringify(data.options) : null,
      },
    });
    res.status(201).json(attr);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/attributes/:id
export async function updateAttribute(req: Request, res: Response, next: NextFunction) {
  try {
    const data = attributeSchema.partial().parse(req.body);
    const attr = await prisma.attribute.update({
      where: { id: req.params.id },
      data: {
        ...data,
        options: data.options ? JSON.stringify(data.options) : undefined,
      },
    });
    res.json(attr);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/attributes/:id
export async function deleteAttribute(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.attribute.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
