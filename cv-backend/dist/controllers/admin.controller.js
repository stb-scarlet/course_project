"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.assignRole = assignRole;
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
exports.deleteUser = deleteUser;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const error_middleware_1 = require("../middlewares/error.middleware");
// GET /api/admin/users?q=&role=&page=&limit=
async function listUsers(req, res, next) {
    try {
        const q = String(req.query.q || '');
        const role = req.query.role;
        const page = Math.max(1, parseInt(String(req.query.page || '1')));
        const limit = Math.min(50, parseInt(String(req.query.limit || '20')));
        const skip = (page - 1) * limit;
        const where = {};
        if (role)
            where.role = role;
        if (q) {
            where.OR = [
                { email: { contains: q } },
                { profile: { firstName: { contains: q } } },
                { profile: { lastName: { contains: q } } },
            ];
        }
        const [items, total] = await Promise.all([
            prisma_1.default.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true, email: true, role: true,
                    isBlocked: true, createdAt: true,
                    profile: { select: { firstName: true, lastName: true, photoUrl: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.default.user.count({ where }),
        ]);
        res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/admin/users/:userId/role
async function assignRole(req, res, next) {
    try {
        const schema = zod_1.z.object({ role: zod_1.z.nativeEnum(client_1.Role) });
        const { role } = schema.parse(req.body);
        const user = await prisma_1.default.user.update({
            where: { id: req.params.userId },
            data: { role },
            select: { id: true, email: true, role: true },
        });
        res.json(user);
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/admin/users/:userId/block
async function blockUser(req, res, next) {
    try {
        const user = await prisma_1.default.user.update({
            where: { id: req.params.userId },
            data: { isBlocked: true },
            select: { id: true, isBlocked: true },
        });
        res.json(user);
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/admin/users/:userId/unblock
async function unblockUser(req, res, next) {
    try {
        const user = await prisma_1.default.user.update({
            where: { id: req.params.userId },
            data: { isBlocked: false },
            select: { id: true, isBlocked: true },
        });
        res.json(user);
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/admin/users/:userId
async function deleteUser(req, res, next) {
    try {
        if (req.params.userId === req.user.id) {
            throw new error_middleware_1.AppError(400, 'Cannot delete your own account via admin panel');
        }
        await prisma_1.default.user.delete({ where: { id: req.params.userId } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=admin.controller.js.map