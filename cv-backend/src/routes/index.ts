import { Router } from 'express';
import passport from 'passport';
import * as authCtrl from '../controllers/auth.controller';
import * as profileCtrl from '../controllers/profile.controller';
import * as attrCtrl from '../controllers/attribute.controller';
import * as positionCtrl from '../controllers/position.controller';
import * as cvCtrl from '../controllers/cv.controller';
import * as discussionCtrl from '../controllers/discussion.controller';
import * as adminCtrl from '../controllers/admin.controller';
import * as statsCtrl from '../controllers/stats.controller';
import * as uploadCtrl from '../controllers/upload.controller';
import {
  authenticate, optionalAuth,
  requireRecruiter, requireAdmin, requireCandidate,
} from '../middlewares/auth.middleware';

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', authenticate, authCtrl.getMe);
router.patch('/auth/preferences', authenticate, authCtrl.updatePreferences);

// Google OAuth
router.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'], session: false }));
router.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  authCtrl.oauthCallback
);

// Facebook OAuth
router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));
router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  authCtrl.oauthCallback
);

// ─── Stats (public) ───────────────────────────────────────────────────────────
router.get('/stats', statsCtrl.getStats);
router.get('/stats/latest-positions', statsCtrl.latestPositions);
router.get('/stats/popular-positions', statsCtrl.popularPositions);
router.get('/stats/tag-cloud', statsCtrl.tagCloud);

// ─── Attributes (Recruiters manage, all authenticated can read) ───────────────
router.get('/attributes', optionalAuth, attrCtrl.listAttributes);
router.get('/attributes/recent', authenticate, attrCtrl.recentAttributes);
router.get('/attributes/:id', optionalAuth, attrCtrl.getAttribute);
router.post('/attributes', authenticate, requireRecruiter, attrCtrl.createAttribute);
router.patch('/attributes/:id', authenticate, requireRecruiter, attrCtrl.updateAttribute);
router.delete('/attributes/:id', authenticate, requireRecruiter, attrCtrl.deleteAttribute);

// ─── Positions ────────────────────────────────────────────────────────────────
router.get('/positions', optionalAuth, positionCtrl.listPositions);
router.get('/positions/:id', optionalAuth, positionCtrl.getPosition);
router.get('/positions/:id/access-check', authenticate, requireCandidate, positionCtrl.checkAccess);
router.get('/positions/:id/cvs', authenticate, requireRecruiter, positionCtrl.getPositionCVs);
router.post('/positions', authenticate, requireRecruiter, positionCtrl.createPosition);
router.post('/positions/:id/duplicate', authenticate, requireRecruiter, positionCtrl.duplicatePosition);
router.patch('/positions/:id', authenticate, requireRecruiter, positionCtrl.updatePosition);
router.delete('/positions/:id', authenticate, requireRecruiter, positionCtrl.deletePosition);

// ─── Discussions ──────────────────────────────────────────────────────────────
router.get('/positions/:positionId/discussion', optionalAuth, discussionCtrl.listPosts);
router.post('/positions/:positionId/discussion', authenticate, discussionCtrl.createPost);

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile/:userId', authenticate, profileCtrl.getProfile);
router.patch('/profile', authenticate, profileCtrl.updateProfile);
router.patch('/profile/:userId', authenticate, profileCtrl.updateProfile); // admin editing others
router.put('/profile/attributes/:attributeId', authenticate, profileCtrl.upsertAttributeValue);
router.put('/profile/:userId/attributes/:attributeId', authenticate, profileCtrl.upsertAttributeValue);
router.delete('/profile/attributes/:attributeId', authenticate, profileCtrl.removeAttributeFromProfile);

// Projects
router.post('/profile/projects', authenticate, requireCandidate, profileCtrl.createProject);
router.patch('/profile/projects/:projectId', authenticate, requireCandidate, profileCtrl.updateProject);
router.delete('/profile/projects/:projectId', authenticate, requireCandidate, profileCtrl.deleteProject);

// Tag autocomplete
router.get('/tags/autocomplete', authenticate, profileCtrl.autocompleteTags);

// ─── CVs ─────────────────────────────────────────────────────────────────────
router.get('/cvs/my', authenticate, requireCandidate, cvCtrl.listMyCVs);
router.get('/cvs/search', authenticate, requireRecruiter, cvCtrl.searchCVs);
router.get('/cvs/:cvId', authenticate, cvCtrl.getCV);
router.post('/cvs', authenticate, requireCandidate, cvCtrl.createCV);
router.delete('/cvs/:cvId', authenticate, cvCtrl.deleteCV);
router.post('/cvs/:cvId/like', authenticate, requireRecruiter, cvCtrl.likeCV);
router.delete('/cvs/:cvId/like', authenticate, requireRecruiter, cvCtrl.unlikeCV);

// ─── Upload ───────────────────────────────────────────────────────────────────
router.post('/upload/image', authenticate, uploadCtrl.upload.single('image'), uploadCtrl.uploadImage);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/users', authenticate, requireAdmin, adminCtrl.listUsers);
router.patch('/admin/users/:userId/role', authenticate, requireAdmin, adminCtrl.assignRole);
router.patch('/admin/users/:userId/block', authenticate, requireAdmin, adminCtrl.blockUser);
router.patch('/admin/users/:userId/unblock', authenticate, requireAdmin, adminCtrl.unblockUser);
router.delete('/admin/users/:userId', authenticate, requireAdmin, adminCtrl.deleteUser);

export default router;
