"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const authCtrl = __importStar(require("../controllers/auth.controller"));
const profileCtrl = __importStar(require("../controllers/profile.controller"));
const attrCtrl = __importStar(require("../controllers/attribute.controller"));
const positionCtrl = __importStar(require("../controllers/position.controller"));
const cvCtrl = __importStar(require("../controllers/cv.controller"));
const discussionCtrl = __importStar(require("../controllers/discussion.controller"));
const adminCtrl = __importStar(require("../controllers/admin.controller"));
const statsCtrl = __importStar(require("../controllers/stats.controller"));
const uploadCtrl = __importStar(require("../controllers/upload.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', auth_middleware_1.authenticate, authCtrl.getMe);
router.patch('/auth/preferences', auth_middleware_1.authenticate, authCtrl.updatePreferences);
// Google OAuth
router.get('/auth/google', passport_1.default.authenticate('google', { scope: ['email', 'profile'], session: false }));
router.get('/auth/google/callback', passport_1.default.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }), authCtrl.oauthCallback);
// Facebook OAuth
router.get('/auth/facebook', passport_1.default.authenticate('facebook', { scope: ['email'], session: false }));
router.get('/auth/facebook/callback', passport_1.default.authenticate('facebook', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }), authCtrl.oauthCallback);
// ─── Stats (public) ───────────────────────────────────────────────────────────
router.get('/stats', statsCtrl.getStats);
router.get('/stats/latest-positions', statsCtrl.latestPositions);
router.get('/stats/popular-positions', statsCtrl.popularPositions);
router.get('/stats/tag-cloud', statsCtrl.tagCloud);
// ─── Attributes (Recruiters manage, all authenticated can read) ───────────────
router.get('/attributes', auth_middleware_1.optionalAuth, attrCtrl.listAttributes);
router.get('/attributes/recent', auth_middleware_1.authenticate, attrCtrl.recentAttributes);
router.get('/attributes/:id', auth_middleware_1.optionalAuth, attrCtrl.getAttribute);
router.post('/attributes', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, attrCtrl.createAttribute);
router.patch('/attributes/:id', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, attrCtrl.updateAttribute);
router.delete('/attributes/:id', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, attrCtrl.deleteAttribute);
// ─── Positions ────────────────────────────────────────────────────────────────
router.get('/positions', auth_middleware_1.optionalAuth, positionCtrl.listPositions);
router.get('/positions/:id', auth_middleware_1.optionalAuth, positionCtrl.getPosition);
router.get('/positions/:id/access-check', auth_middleware_1.authenticate, auth_middleware_1.requireCandidate, positionCtrl.checkAccess);
router.get('/positions/:id/cvs', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, positionCtrl.getPositionCVs);
router.post('/positions', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, positionCtrl.createPosition);
router.post('/positions/:id/duplicate', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, positionCtrl.duplicatePosition);
router.patch('/positions/:id', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, positionCtrl.updatePosition);
router.delete('/positions/:id', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, positionCtrl.deletePosition);
// ─── Discussions ──────────────────────────────────────────────────────────────
router.get('/positions/:positionId/discussion', auth_middleware_1.optionalAuth, discussionCtrl.listPosts);
router.post('/positions/:positionId/discussion', auth_middleware_1.authenticate, discussionCtrl.createPost);
// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile/:userId', auth_middleware_1.authenticate, profileCtrl.getProfile);
router.patch('/profile', auth_middleware_1.authenticate, profileCtrl.updateProfile);
router.patch('/profile/:userId', auth_middleware_1.authenticate, profileCtrl.updateProfile); // admin editing others
router.put('/profile/attributes/:attributeId', auth_middleware_1.authenticate, profileCtrl.upsertAttributeValue);
router.put('/profile/:userId/attributes/:attributeId', auth_middleware_1.authenticate, profileCtrl.upsertAttributeValue);
router.delete('/profile/attributes/:attributeId', auth_middleware_1.authenticate, profileCtrl.removeAttributeFromProfile);
// Projects
router.post('/profile/projects', auth_middleware_1.authenticate, auth_middleware_1.requireCandidate, profileCtrl.createProject);
router.patch('/profile/projects/:projectId', auth_middleware_1.authenticate, auth_middleware_1.requireCandidate, profileCtrl.updateProject);
router.delete('/profile/projects/:projectId', auth_middleware_1.authenticate, auth_middleware_1.requireCandidate, profileCtrl.deleteProject);
// Tag autocomplete
router.get('/tags/autocomplete', auth_middleware_1.authenticate, profileCtrl.autocompleteTags);
// ─── CVs ─────────────────────────────────────────────────────────────────────
router.get('/cvs/my', auth_middleware_1.authenticate, auth_middleware_1.requireCandidate, cvCtrl.listMyCVs);
router.get('/cvs/search', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, cvCtrl.searchCVs);
router.get('/cvs/:cvId', auth_middleware_1.authenticate, cvCtrl.getCV);
router.post('/cvs', auth_middleware_1.authenticate, auth_middleware_1.requireCandidate, cvCtrl.createCV);
router.delete('/cvs/:cvId', auth_middleware_1.authenticate, cvCtrl.deleteCV);
router.post('/cvs/:cvId/like', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, cvCtrl.likeCV);
router.delete('/cvs/:cvId/like', auth_middleware_1.authenticate, auth_middleware_1.requireRecruiter, cvCtrl.unlikeCV);
// ─── Upload ───────────────────────────────────────────────────────────────────
router.post('/upload/image', auth_middleware_1.authenticate, uploadCtrl.upload.single('image'), uploadCtrl.uploadImage);
// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/users', auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, adminCtrl.listUsers);
router.patch('/admin/users/:userId/role', auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, adminCtrl.assignRole);
router.patch('/admin/users/:userId/block', auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, adminCtrl.blockUser);
router.patch('/admin/users/:userId/unblock', auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, adminCtrl.unblockUser);
router.delete('/admin/users/:userId', auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, adminCtrl.deleteUser);
exports.default = router;
//# sourceMappingURL=index.js.map