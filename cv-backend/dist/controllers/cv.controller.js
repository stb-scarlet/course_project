"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCV = getCV;
exports.createCV = createCV;
exports.deleteCV = deleteCV;
exports.listMyCVs = listMyCVs;
exports.likeCV = likeCV;
exports.unlikeCV = unlikeCV;
exports.searchCVs = searchCVs;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const error_middleware_1 = require("../middlewares/error.middleware");
const accessRules_1 = require("../utils/accessRules");
// GET /api/cvs/:cvId
async function getCV(req, res, next) {
    try {
        const cv = await prisma_1.default.cV.findUnique({
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
        if (!cv)
            throw new error_middleware_1.AppError(404, 'CV not found');
        const requesterId = req.user.id;
        const role = req.user.role;
        const isOwner = cv.userId === requesterId;
        if (!isOwner && role === client_1.Role.CANDIDATE)
            throw new error_middleware_1.AppError(403, 'Forbidden');
        if (cv.isHidden && role === client_1.Role.RECRUITER)
            throw new error_middleware_1.AppError(404, 'CV not found');
        // Build generated CV data
        const generated = buildCVData(cv);
        res.json({ cv, generated });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/cvs — create CV for a position
async function createCV(req, res, next) {
    try {
        const schema = zod_1.z.object({ positionId: zod_1.z.string() });
        const { positionId } = schema.parse(req.body);
        const position = await prisma_1.default.position.findUnique({
            where: { id: positionId },
            include: {
                attributes: { include: { attribute: true } },
                accessRules: { include: { attribute: true } },
            },
        });
        if (!position)
            throw new error_middleware_1.AppError(404, 'Position not found');
        // Check access
        if (position.accessType === client_1.PositionAccessType.RESTRICTED) {
            const profile = await prisma_1.default.profile.findUnique({ where: { userId: req.user.id } });
            if (!profile)
                throw new error_middleware_1.AppError(403, 'Access denied');
            const attrValues = await prisma_1.default.attributeValue.findMany({ where: { profileId: profile.id } });
            const valueMap = new Map(attrValues.map((av) => [av.attributeId, av.value]));
            if (!(0, accessRules_1.evaluateAccessRules)(position.accessRules, valueMap)) {
                throw new error_middleware_1.AppError(403, 'You do not meet the access requirements for this position');
            }
        }
        const cv = await prisma_1.default.cV.create({
            data: { userId: req.user.id, positionId },
        });
        // Auto-add missing position attributes to profile
        const profile = await prisma_1.default.profile.findUnique({ where: { userId: req.user.id } });
        if (profile) {
            for (const pa of position.attributes) {
                await prisma_1.default.attributeValue.upsert({
                    where: { profileId_attributeId: { profileId: profile.id, attributeId: pa.attributeId } },
                    create: { profileId: profile.id, attributeId: pa.attributeId, value: null },
                    update: {},
                });
            }
        }
        res.status(201).json(cv);
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/cvs/:cvId
async function deleteCV(req, res, next) {
    try {
        const cv = await prisma_1.default.cV.findUnique({ where: { id: req.params.cvId } });
        if (!cv)
            throw new error_middleware_1.AppError(404, 'CV not found');
        const isOwner = cv.userId === req.user.id;
        if (!isOwner && req.user.role !== client_1.Role.ADMIN)
            throw new error_middleware_1.AppError(403, 'Forbidden');
        await prisma_1.default.cV.delete({ where: { id: req.params.cvId } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
// GET /api/cvs/my — list current user's CVs
async function listMyCVs(req, res, next) {
    try {
        const cvs = await prisma_1.default.cV.findMany({
            where: { userId: req.user.id, isHidden: false },
            include: {
                position: { select: { title: true, shortDescription: true } },
                _count: { select: { likes: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(cvs);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/cvs/:cvId/like — recruiter likes a CV
async function likeCV(req, res, next) {
    try {
        await prisma_1.default.cVLike.create({
            data: { cvId: req.params.cvId, recruiterId: req.user.id },
        });
        res.status(201).json({ liked: true });
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/cvs/:cvId/like — recruiter removes like
async function unlikeCV(req, res, next) {
    try {
        await prisma_1.default.cVLike.delete({
            where: { cvId_recruiterId: { cvId: req.params.cvId, recruiterId: req.user.id } },
        });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
// GET /api/cvs/search?q=&positionId=&minLikes=
async function searchCVs(req, res, next) {
    try {
        const q = String(req.query.q || '');
        const positionId = req.query.positionId;
        const page = Math.max(1, parseInt(String(req.query.page || '1')));
        const limit = Math.min(50, parseInt(String(req.query.limit || '20')));
        const skip = (page - 1) * limit;
        const where = { isHidden: false };
        if (positionId)
            where.positionId = positionId;
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
            prisma_1.default.cV.findMany({
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
            prisma_1.default.cV.count({ where }),
        ]);
        res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
}
// ─── CV Generation Helper ─────────────────────────────────────────────────────
function buildCVData(cv) {
    const profile = cv.user.profile;
    const position = cv.position;
    // Get position attribute IDs for filtering
    const posAttrIds = new Set(position.attributes.map((pa) => pa.attributeId));
    const posTagNames = new Set(position.positionTags.map((pt) => pt.tag.name));
    // Filter profile attributes to only those in position
    const relevantAttributes = (profile.attributeValues || []).filter((av) => posAttrIds.has(av.attributeId));
    // Filter projects by position tags, limit to maxProjects
    const relevantProjects = (profile.projects || [])
        .filter((p) => p.tags.some((t) => posTagNames.has(t.tag.name)))
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
//# sourceMappingURL=cv.controller.js.map