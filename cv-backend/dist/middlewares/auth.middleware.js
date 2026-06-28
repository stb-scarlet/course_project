"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCandidate = exports.requireAdmin = exports.requireRecruiter = exports.requireRole = exports.optionalAuth = exports.authenticate = void 0;
const passport_1 = __importDefault(require("passport"));
const client_1 = require("@prisma/client");
// Require valid JWT — attaches req.user
const authenticate = (req, res, next) => {
    passport_1.default.authenticate('jwt', { session: false }, (err, user) => {
        if (err)
            return next(err);
        if (!user)
            return res.status(401).json({ error: 'Unauthorized' });
        req.user = user;
        next();
    })(req, res, next);
};
exports.authenticate = authenticate;
// Optional auth — attaches req.user if token present, but doesn't block
const optionalAuth = (req, res, next) => {
    passport_1.default.authenticate('jwt', { session: false }, (_err, user) => {
        if (user)
            req.user = user;
        next();
    })(req, res, next);
};
exports.optionalAuth = optionalAuth;
// Role guards
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireRecruiter = (0, exports.requireRole)(client_1.Role.RECRUITER, client_1.Role.ADMIN);
exports.requireAdmin = (0, exports.requireRole)(client_1.Role.ADMIN);
exports.requireCandidate = (0, exports.requireRole)(client_1.Role.CANDIDATE, client_1.Role.ADMIN);
//# sourceMappingURL=auth.middleware.js.map