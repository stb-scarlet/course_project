"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPositions = listPositions;
exports.getPosition = getPosition;
exports.createPosition = createPosition;
exports.updatePosition = updatePosition;
exports.duplicatePosition = duplicatePosition;
exports.deletePosition = deletePosition;
exports.checkAccess = checkAccess;
exports.getPositionCVs = getPositionCVs;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const error_middleware_1 = require("../middlewares/error.middleware");
const accessRules_1 = require("../utils/accessRules");
const accessRuleSchema = zod_1.z.object({
    attributeId: zod_1.z.string(),
    operator: zod_1.z.nativeEnum(client_1.FilterOperator),
    value: zod_1.z.string(), // JSON-encoded
});
const positionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    shortDescription: zod_1.z.string(),
    accessType: zod_1.z.nativeEnum(client_1.PositionAccessType).default('PUBLIC'),
    maxProjects: zod_1.z.number().int().min(0).default(3),
    attributeIds: zod_1.z.array(zod_1.z.object({ attributeId: zod_1.z.string(), order: zod_1.z.number().default(0), required: zod_1.z.boolean().default(false) })).default([]),
    tagNames: zod_1.z.array(zod_1.z.string()).default([]),
    accessRules: zod_1.z.array(accessRuleSchema).default([]),
    version: zod_1.z.number().int().optional().default(0),
});
// GET /api/positions?q=&page=&limit=
async function listPositions(req, res, next) {
    try {
        const q = String(req.query.q || '');
        const page = Math.max(1, parseInt(String(req.query.page || '1')));
        const limit = Math.min(50, parseInt(String(req.query.limit || '20')));
        const skip = (page - 1) * limit;
        const where = q
            ? { OR: [{ title: { contains: q } }, { shortDescription: { contains: q } }] }
            : {};
        const [items, total] = await Promise.all([
            prisma_1.default.position.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: { select: { cvs: true } },
                    positionTags: { include: { tag: true } },
                },
            }),
            prisma_1.default.position.count({ where }),
        ]);
        res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
}
// GET /api/positions/:id
async function getPosition(req, res, next) {
    try {
        const position = await prisma_1.default.position.findUnique({
            where: { id: req.params.id },
            include: {
                attributes: { include: { attribute: true }, orderBy: { order: 'asc' } },
                accessRules: { include: { attribute: true } },
                positionTags: { include: { tag: true } },
                _count: { select: { cvs: true } },
            },
        });
        if (!position)
            throw new error_middleware_1.AppError(404, 'Position not found');
        res.json(position);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/positions
async function createPosition(req, res, next) {
    try {
        const data = positionSchema.parse(req.body);
        const tagConnects = await resolvePositionTags(data.tagNames);
        const position = await prisma_1.default.position.create({
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
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/positions/:id
async function updatePosition(req, res, next) {
    try {
        const data = positionSchema.parse(req.body);
        const existing = await prisma_1.default.position.findUnique({ where: { id: req.params.id } });
        if (!existing)
            throw new error_middleware_1.AppError(404, 'Position not found');
        if (existing.version !== data.version) {
            return res.status(409).json({ error: 'Version conflict', currentVersion: existing.version });
        }
        const tagConnects = await resolvePositionTags(data.tagNames);
        // Delete and recreate relations (simple approach)
        await prisma_1.default.$transaction([
            prisma_1.default.positionAttribute.deleteMany({ where: { positionId: req.params.id } }),
            prisma_1.default.accessRule.deleteMany({ where: { positionId: req.params.id } }),
            prisma_1.default.positionTag.deleteMany({ where: { positionId: req.params.id } }),
        ]);
        const position = await prisma_1.default.position.update({
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
        });
        res.json(position);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/positions/:id/duplicate
async function duplicatePosition(req, res, next) {
    try {
        const source = await prisma_1.default.position.findUnique({
            where: { id: req.params.id },
            include: {
                attributes: true,
                accessRules: true,
                positionTags: true,
            },
        });
        if (!source)
            throw new error_middleware_1.AppError(404, 'Position not found');
        const copy = await prisma_1.default.position.create({
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
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/positions/:id
async function deletePosition(req, res, next) {
    try {
        await prisma_1.default.position.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
// GET /api/positions/:id/access-check — can current candidate access this position?
async function checkAccess(req, res, next) {
    try {
        const position = await prisma_1.default.position.findUnique({
            where: { id: req.params.id },
            include: { accessRules: { include: { attribute: true } } },
        });
        if (!position)
            throw new error_middleware_1.AppError(404, 'Position not found');
        if (position.accessType === client_1.PositionAccessType.PUBLIC) {
            return res.json({ hasAccess: true });
        }
        const profile = await prisma_1.default.profile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.json({ hasAccess: false });
        const attrValues = await prisma_1.default.attributeValue.findMany({
            where: { profileId: profile.id },
        });
        const valueMap = new Map(attrValues.map((av) => [av.attributeId, av.value]));
        const hasAccess = (0, accessRules_1.evaluateAccessRules)(position.accessRules, valueMap);
        res.json({ hasAccess });
    }
    catch (err) {
        next(err);
    }
}
// GET /api/positions/:id/cvs — list CVs for a position (Recruiter/Admin only)
async function getPositionCVs(req, res, next) {
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
            prisma_1.default.cV.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { profile: { select: { firstName: true, lastName: true, photoUrl: true } } } },
                    _count: { select: { likes: true } },
                },
                orderBy: { updatedAt: 'desc' },
            }),
            prisma_1.default.cV.count({ where }),
        ]);
        res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
async function resolvePositionTags(tagNames) {
    const result = [];
    for (const name of tagNames) {
        const tag = await prisma_1.default.tag.upsert({
            where: { name },
            create: { name },
            update: {},
        });
        result.push({ tagId: tag.id });
    }
    return result;
}
//# sourceMappingURL=position.controller.js.map