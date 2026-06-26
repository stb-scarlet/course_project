import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import prisma from './prisma';
import { JwtPayload } from '../types';

export function configurePassport() {
  // ─── JWT Strategy ──────────────────────────────────────────────────────────
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET!,
      },
      async (payload: JwtPayload, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, role: true, email: true, isBlocked: true },
          });
          if (!user || user.isBlocked) return done(null, false);
          return done(null, { id: user.id, role: user.role, email: user.email });
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  // ─── Google Strategy ───────────────────────────────────────────────────────
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
        scope: ['email', 'profile'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'), false);

          const result = await findOrCreateOAuthUser({
            provider: 'google',
            providerId: profile.id,
            email,
            firstName: profile.name?.givenName ?? '',
            lastName: profile.name?.familyName ?? '',
            photoUrl: profile.photos?.[0]?.value,
          });

          return done(null, result);
        } catch (err) {
          return done(err as Error, false);
        }
      }
    )
  );

  // ─── Facebook Strategy ─────────────────────────────────────────────────────
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID!,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
        profileFields: ['id', 'emails', 'name', 'photos'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Facebook'), false);

          const result = await findOrCreateOAuthUser({
            provider: 'facebook',
            providerId: profile.id,
            email,
            firstName: profile.name?.givenName ?? '',
            lastName: profile.name?.familyName ?? '',
            photoUrl: profile.photos?.[0]?.value,
          });

          return done(null, result);
        } catch (err) {
          return done(err as Error, false);
        }
      }
    )
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function findOrCreateOAuthUser(data: {
  provider: string;
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}) {
  // Check if OAuth account already exists
  const existing = await prisma.oAuthAccount.findUnique({
    where: { provider_providerId: { provider: data.provider, providerId: data.providerId } },
    include: { user: true },
  });

  if (existing) {
    return { id: existing.user.id, role: existing.user.role, email: existing.user.email };
  }

  // Check if user with same email exists
  let user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: data.email,
        emailVerified: true,
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            photoUrl: data.photoUrl,
          },
        },
      },
    });
  }

  // Link OAuth account
  await prisma.oAuthAccount.create({
    data: {
      userId: user.id,
      provider: data.provider,
      providerId: data.providerId,
    },
  });

  return { id: user.id, role: user.role, email: user.email };
}
