/**
 * JWT Configuration with Hybrid Approach
 * - Access Token: RS256 (Asymmetric) - Shared with FastAPI via public key
 * - Refresh Token: HS256 (Symmetric) - Kept secret in Node.js only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SignOptions } from 'jsonwebtoken';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse time string (e.g., '7d', '24h', '15m') to milliseconds
 */
const parseTimeToMs = (timeStr: string): number => {
  const match = timeStr.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  
  const value = parseInt(match[1] || '7');
  const unit = match[2];
  
  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    case 's': return value * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
};

/**
 * Load RSA private key from file
 */
const loadPrivateKey = (): string | null => {
  const privateKeyPath = process.env.JWT_ACCESS_PRIVATE_KEY_PATH;
  if (!privateKeyPath) {
    console.error('❌ JWT_ACCESS_PRIVATE_KEY_PATH not set');
    return null;
  }
  
  try {
    const fullPath = path.resolve(process.cwd(), privateKeyPath);
    const privateKey = fs.readFileSync(fullPath, 'utf8');
    console.log(`✅ Loaded RSA private key from ${fullPath}`);
    return privateKey;
  } catch (error) {
    console.error(`❌ Failed to load RSA private key from ${privateKeyPath}:`, error);
    return null;
  }
};

/**
 * Load RSA public key from file
 */
const loadPublicKey = (): string | null => {
  const publicKeyPath = process.env.JWT_ACCESS_PUBLIC_KEY_PATH;
  if (!publicKeyPath) {
    console.error('❌ JWT_ACCESS_PUBLIC_KEY_PATH not set');
    return null;
  }
  
  try {
    const fullPath = path.resolve(process.cwd(), publicKeyPath);
    const publicKey = fs.readFileSync(fullPath, 'utf8');
    console.log(`✅ Loaded RSA public key from ${fullPath}`);
    return publicKey;
  } catch (error) {
    console.error(`❌ Failed to load RSA public key from ${publicKeyPath}:`, error);
    return null;
  }
};

export const jwtConfig = {
  // Access Token - RS256 (Asymmetric) - for FastAPI verification
  access: {
    privateKey: loadPrivateKey(),
    publicKey: loadPublicKey(),
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'],
    algorithm: 'RS256' as const,
  },
  
  // Refresh Token - HS256 (Symmetric) - Node.js only
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
    algorithm: 'HS256' as const,
  },
  
  // Common
  issuer: process.env.JWT_ISSUER || 'icoach-app',
  audience: process.env.JWT_AUDIENCE || 'icoach-users',
};

export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: parseTimeToMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
};

// Log configuration status
console.log('🔐 JWT Configuration loaded:');
console.log(`  - Access Token: ${jwtConfig.access.privateKey ? 'RS256 (Asymmetric) ✅' : 'RS256 (Asymmetric) ❌'}`);
console.log(`  - Refresh Token: HS256 (Symmetric) ✅`);
console.log(`  - Access Expires: ${jwtConfig.access.expiresIn}`);
console.log(`  - Refresh Expires: ${jwtConfig.refresh.expiresIn}`);