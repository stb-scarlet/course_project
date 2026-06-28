"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPosts = listPosts;
exports.createPost = createPost;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../config/prisma"));
const error_middleware_1 = require("../middlewares/error.middleware");
// GET /api/positions/:positionId/discussion?page=&limit=
async function listPosts(req, res, next) {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1')));
        const limit = Math.min(100, parseInt(String(req.query.limit || '50')));
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            prisma_1.default.discussionPost.findMany({
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
            prisma_1.default.discussionPost.count({ where: { positionId: req.params.positionId } }),
        ]);
        res.json({ posts, total, page, limit });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/positions/:positionId/discussion
async function createPost(req, res, next) {
    try {
        const schema = zod_1.z.object({ content: zod_1.z.string().min(1) });
        const { content } = schema.parse(req.body);
        const position = await prisma_1.default.position.findUnique({ where: { id: req.params.positionId } });
        if (!position)
            throw new error_middleware_1.AppError(404, 'Position not found');
        const post = await prisma_1.default.discussionPost.create({
            data: {
                positionId: req.params.positionId,
                authorId: req.user.id,
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
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=discussion.controller.js.map