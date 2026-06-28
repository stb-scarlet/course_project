"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAttributes = listAttributes;
exports.recentAttributes = recentAttributes;
exports.getAttribute = getAttribute;
exports.createAttribute = createAttribute;
exports.updateAttribute = updateAttribute;
exports.deleteAttribute = deleteAttribute;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const error_middleware_1 = require("../middlewares/error.middleware");
const attributeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    category: zod_1.z.nativeEnum(client_1.AttributeCategory),
    type: zod_1.z.nativeEnum(client_1.AttributeType),
    options: zod_1.z.array(zod_1.z.string()).optional(),
    minLength: zod_1.z.number().int().optional(),
    maxLength: zod_1.z.number().int().optional(),
    regexPattern: zod_1.z.string().optional(),
    minValue: zod_1.z.number().optional(),
    maxValue: zod_1.z.number().optional(),
});
// GET /api/attributes?q=&category=&page=&limit=
async function listAttributes(req, res, next) {
    try {
        const q = String(req.query.q || '');
        const category = req.query.category;
        const page = Math.max(1, parseInt(String(req.query.page || '1')));
        const limit = Math.min(50, parseInt(String(req.query.limit || '20')));
        const skip = (page - 1) * limit;
        const where = {
            ...(q ? { name: { contains: q } } : {}),
            ...(category ? { category } : {}),
        };
        const [items, total] = await Promise.all([
            prisma_1.default.attribute.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            prisma_1.default.attribute.count({ where }),
        ]);
        res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
}
// GET /api/attributes/recent — recently used by this user
async function recentAttributes(req, res, next) {
    try {
        const profile = await prisma_1.default.profile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.json([]);
        const recent = await prisma_1.default.attributeValue.findMany({
            where: { profileId: profile.id },
            include: { attribute: true },
            orderBy: { updatedAt: 'desc' },
            take: 10,
        });
        res.json(recent.map((av) => av.attribute));
    }
    catch (err) {
        next(err);
    }
}
// GET /api/attributes/:id
async function getAttribute(req, res, next) {
    try {
        const attr = await prisma_1.default.attribute.findUnique({ where: { id: req.params.id } });
        if (!attr)
            throw new error_middleware_1.AppError(404, 'Attribute not found');
        res.json(attr);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/attributes
async function createAttribute(req, res, next) {
    try {
        const data = attributeSchema.parse(req.body);
        const attr = await prisma_1.default.attribute.create({
            data: {
                ...data,
                options: data.options ? JSON.stringify(data.options) : null,
            },
        });
        res.status(201).json(attr);
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/attributes/:id
async function updateAttribute(req, res, next) {
    try {
        const data = attributeSchema.partial().parse(req.body);
        const attr = await prisma_1.default.attribute.update({
            where: { id: req.params.id },
            data: {
                ...data,
                options: data.options ? JSON.stringify(data.options) : undefined,
            },
        });
        res.json(attr);
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/attributes/:id
async function deleteAttribute(req, res, next) {
    try {
        await prisma_1.default.attribute.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=attribute.controller.js.map