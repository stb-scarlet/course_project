"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.upsertAttributeValue = upsertAttributeValue;
exports.removeAttributeFromProfile = removeAttributeFromProfile;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
exports.autocompleteTags = autocompleteTags;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../config/prisma"));
const error_middleware_1 = require("../middlewares/error.middleware");
const client_1 = require("@prisma/client");
// GET /api/profile/:userId
async function getProfile(req, res, next) {
    try {
        const { userId } = req.params;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;
        // Only owner or admin can see full profile
        const isOwner = requesterId === userId;
        const isAdmin = requesterRole === client_1.Role.ADMIN;
        const isRecruiter = requesterRole === client_1.Role.RECRUITER;
        if (!isOwner && !isAdmin && !isRecruiter) {
            throw new error_middleware_1.AppError(403, 'Access denied');
        }
        const profile = await prisma_1.default.profile.findUnique({
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
        if (!profile)
            throw new error_middleware_1.AppError(404, 'Profile not found');
        // Recruiters only see CV-related data (read-only)
        if (isRecruiter && !isAdmin) {
            const { attributeValues, projects, ...publicData } = profile;
            return res.json({ ...publicData, attributeValues, projects });
        }
        res.json(profile);
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/profile — update basic info with optimistic locking
async function updateProfile(req, res, next) {
    try {
        const schema = zod_1.z.object({
            firstName: zod_1.z.string().min(1).optional(),
            lastName: zod_1.z.string().min(1).optional(),
            location: zod_1.z.string().optional(),
            photoUrl: zod_1.z.string().url().optional(),
            version: zod_1.z.number().int(),
        });
        const { version, ...data } = schema.parse(req.body);
        const targetUserId = req.params.userId || req.user.id;
        if (targetUserId !== req.user.id && req.user.role !== client_1.Role.ADMIN) {
            throw new error_middleware_1.AppError(403, 'Cannot edit another user\'s profile');
        }
        const profile = await prisma_1.default.profile.findUnique({ where: { userId: targetUserId } });
        if (!profile)
            throw new error_middleware_1.AppError(404, 'Profile not found');
        // Optimistic locking check
        if (profile.version !== version) {
            return res.status(409).json({
                error: 'Version conflict',
                currentVersion: profile.version,
                message: 'Profile was modified by another session. Please refresh.',
            });
        }
        const updated = await prisma_1.default.profile.update({
            where: { userId: targetUserId },
            data: { ...data, version: { increment: 1 } },
        });
        res.json({ ...updated });
    }
    catch (err) {
        next(err);
    }
}
// PUT /api/profile/attributes/:attributeId — upsert attribute value with optimistic locking
async function upsertAttributeValue(req, res, next) {
    try {
        const schema = zod_1.z.object({
            value: zod_1.z.string().nullable(),
            version: zod_1.z.number().int(),
        });
        const { value, version } = schema.parse(req.body);
        const { attributeId } = req.params;
        const targetUserId = req.params.userId || req.user.id;
        if (targetUserId !== req.user.id && req.user.role !== client_1.Role.ADMIN) {
            throw new error_middleware_1.AppError(403, 'Forbidden');
        }
        const profile = await prisma_1.default.profile.findUnique({ where: { userId: targetUserId } });
        if (!profile)
            throw new error_middleware_1.AppError(404, 'Profile not found');
        // Check attribute exists
        const attribute = await prisma_1.default.attribute.findUnique({ where: { id: attributeId } });
        if (!attribute)
            throw new error_middleware_1.AppError(404, 'Attribute not found');
        // Upsert with optimistic locking
        const existing = await prisma_1.default.attributeValue.findUnique({
            where: { profileId_attributeId: { profileId: profile.id, attributeId } },
        });
        if (existing && existing.version !== version) {
            return res.status(409).json({
                error: 'Version conflict',
                currentVersion: existing.version,
            });
        }
        const result = await prisma_1.default.attributeValue.upsert({
            where: { profileId_attributeId: { profileId: profile.id, attributeId } },
            create: { profileId: profile.id, attributeId, value, version: 1 },
            update: { value, version: { increment: 1 } },
            include: { attribute: true },
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/profile/attributes/:attributeId
async function removeAttributeFromProfile(req, res, next) {
    try {
        const profile = await prisma_1.default.profile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            throw new error_middleware_1.AppError(404, 'Profile not found');
        await prisma_1.default.attributeValue.deleteMany({
            where: { profileId: profile.id, attributeId: req.params.attributeId },
        });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
// ─── Projects ─────────────────────────────────────────────────────────────────
const projectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    dateFrom: zod_1.z.string().datetime(),
    dateTo: zod_1.z.string().datetime().nullable().optional(),
    description: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    version: zod_1.z.number().int().optional().default(0),
});
// POST /api/profile/projects
async function createProject(req, res, next) {
    try {
        const data = projectSchema.parse(req.body);
        const profile = await prisma_1.default.profile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            throw new error_middleware_1.AppError(404, 'Profile not found');
        const project = await prisma_1.default.project.create({
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
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/profile/projects/:projectId
async function updateProject(req, res, next) {
    try {
        const data = projectSchema.parse(req.body);
        const { projectId } = req.params;
        const project = await prisma_1.default.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new error_middleware_1.AppError(404, 'Project not found');
        if (project.version !== (data.version ?? 0)) {
            return res.status(409).json({ error: 'Version conflict', currentVersion: project.version });
        }
        // Remove old tags and re-add
        await prisma_1.default.projectTag.deleteMany({ where: { projectId } });
        const updated = await prisma_1.default.project.update({
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
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/profile/projects/:projectId
async function deleteProject(req, res, next) {
    try {
        const { projectId } = req.params;
        const profile = await prisma_1.default.profile.findUnique({ where: { userId: req.user.id } });
        const project = await prisma_1.default.project.findUnique({ where: { id: projectId } });
        if (!project || project.profileId !== profile?.id) {
            throw new error_middleware_1.AppError(404, 'Project not found');
        }
        await prisma_1.default.project.delete({ where: { id: projectId } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
// GET /api/tags/autocomplete?q=react
async function autocompleteTags(req, res, next) {
    try {
        const q = String(req.query.q || '');
        const tags = await prisma_1.default.tag.findMany({
            where: { name: { startsWith: q } },
            take: 10,
            orderBy: { name: 'asc' },
        });
        res.json(tags);
    }
    catch (err) {
        next(err);
    }
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
async function resolveTagIds(tagNames) {
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
//# sourceMappingURL=profile.controller.js.map