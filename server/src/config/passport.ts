import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Profile, VerifyCallback } from 'passport-google-oauth20';
import User from '../models/sql/User.js';
import crypto from 'crypto';

// Function to configure passport - must be called after environment variables are loaded
export function configurePassport() {
  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        // Check if user already exists with this email
        const email = profile.emails?.[0]?.value;
        
        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        let user = await User.findByEmail(email);

        if (user) {
          // User exists - check if they signed up with Google or regular method
          if (user.authProvider !== 'google') {
            // User exists with different auth method
            return done(
              new Error(`This email is already registered with ${user.authProvider} authentication. Please use ${user.authProvider} to login.`),
              undefined
            );
          }
          
          // Update last login
          user.lastLogin = new Date();
          await user.save();
          
          return done(null, user);
        }

        // Create new user from Google profile
        const username = email.split('@')[0] + '_' + crypto.randomBytes(4).toString('hex');
        
        user = await User.create({
          email: email,
          username: username,
          firstName: profile.name?.givenName || profile.displayName || 'User',
          lastName: profile.name?.familyName || '',
          password: null, // No password for OAuth users
          avatar: profile.photos?.[0]?.value || null,
          isEmailVerified: true, // Google email is already verified
          isActive: true,
          role: 'user',
          authProvider: 'google',
          lastLogin: new Date(),
          socialProfiles: {
            google: {
              id: profile.id,
              displayName: profile.displayName,
            },
          },
        });

        return done(null, user);
      } catch (error) {
        console.error('Error in Google OAuth strategy:', error);
        return done(error as Error, undefined);
      }
    }
    )
  );

  // Serialize user for the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

export default passport;
