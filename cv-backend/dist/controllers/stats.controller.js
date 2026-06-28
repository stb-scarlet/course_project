"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = getStats;
exports.latestPositions = latestPositions;
exports.popularPositions = popularPositions;
exports.tagCloud = tagCloud;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
// GET /api/stats — public statistics
async function getStats(req, res, next) {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [totalPositions, totalCVs, totalCandidates, totalRecruiters, newCVsToday,] = await Promise.all([
            prisma_1.default.position.count(),
            prisma_1.default.cV.count(),
            prisma_1.default.user.count({ where: { role: client_1.Role.CANDIDATE } }),
            prisma_1.default.user.count({ where: { role: client_1.Role.RECRUITER } }),
            prisma_1.default.cV.count({ where: { createdAt: { gte: oneDayAgo } } }),
        ]);
        res.json({ totalPositions, totalCVs, totalCandidates, totalRecruiters, newCVsToday });
    }
    catch (err) {
        next(err);
    }
}
// GET /api/stats/latest-positions — most recently updated positions
async function latestPositions(req, res, next) {
    try {
        const positions = await prisma_1.default.position.findMany({
            take: 10,
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { cvs: true } },
                positionTags: { include: { tag: true } },
            },
        });
        res.json(positions);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/stats/popular-positions — top 5 by submitted CVs
async function popularPositions(req, res, next) {
    try {
        const positions = await prisma_1.default.position.findMany({
            take: 5,
            orderBy: { cvs: { _count: 'desc' } },
            include: { _count: { select: { cvs: true } } },
        });
        res.json(positions);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/stats/tag-cloud
async function tagCloud(req, res, next) {
    try {
        const tags = await prisma_1.default.tag.findMany({
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
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=stats.controller.js.map