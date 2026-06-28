"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
exports.updatePreferences = updatePreferences;
exports.oauthCallback = oauthCallback;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../config/prisma"));
const jwt_1 = require("../utils/jwt");
const error_middleware_1 = require("../middlewares/error.middleware");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
// POST /api/auth/register
async function register(req, res, next) {
    try {
        const data = registerSchema.parse(req.body);
        const exists = await prisma_1.default.user.findUnique({ where: { email: data.email } });
        if (exists)
            throw new error_middleware_1.AppError(409, 'Email already registered');
        const passwordHash = await bcryptjs_1.default.hash(data.password, 12);
        const user = await prisma_1.default.user.create({
            data: {
                email: data.email,
                passwordHash,
                profile: {
                    create: { firstName: data.firstName, lastName: data.lastName },
                },
            },
        });
        const token = (0, jwt_1.signToken)(user.id, user.role);
        res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
    }
    catch (err) {
        next(err);
    }
}
// POST /api/auth/login
async function login(req, res, next) {
    try {
        const data = loginSchema.parse(req.body);
        const user = await prisma_1.default.user.findUnique({ where: { email: data.email } });
        if (!user || !user.passwordHash)
            throw new error_middleware_1.AppError(401, 'Invalid credentials');
        if (user.isBlocked)
            throw new error_middleware_1.AppError(403, 'Account is blocked');
        const valid = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!valid)
            throw new error_middleware_1.AppError(401, 'Invalid credentials');
        const token = (0, jwt_1.signToken)(user.id, user.role);
        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    }
    catch (err) {
        next(err);
    }
}
// GET /api/auth/me
async function getMe(req, res, next) {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, email: true, role: true,
                language: true, theme: true,
                profile: { select: { firstName: true, lastName: true, photoUrl: true } },
            },
        });
        res.json(user);
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/auth/preferences
async function updatePreferences(req, res, next) {
    try {
        const schema = zod_1.z.object({
            language: zod_1.z.enum(['en', 'uz', 'pl', 'es', 'ka']).optional(),
            theme: zod_1.z.enum(['light', 'dark']).optional(),
        });
        const data = schema.parse(req.body);
        const user = await prisma_1.default.user.update({
            where: { id: req.user.id },
            data,
            select: { language: true, theme: true },
        });
        res.json(user);
    }
    catch (err) {
        next(err);
    }
}
// OAuth callback handler (called after passport.authenticate)
function oauthCallback(req, res) {
    const user = req.user;
    const token = (0, jwt_1.signToken)(user.id, user.role);
    // Redirect to frontend with token in query param (frontend stores it)
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
}
//# sourceMappingURL=auth.controller.js.map