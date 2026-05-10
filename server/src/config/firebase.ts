import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Path to the downloaded Service Account file
const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

/**
 * Firebase initialization
 * Fixed for TypeScript strict null checks and Docker builds
 */
export const initializeFirebase = (): void => {
  console.log('Starting Firebase Admin initialization...');

  try {
    // Ensure Firebase is not initialized more than once
    if (admin.apps.length === 0) {
      
      // Method 1: Using the physical file (Ideal for Local Development)
      if (fs.existsSync(serviceAccountPath)) {
        console.log('Attempting to connect to Firebase via Service Account file...');
        const serviceAccount = require(serviceAccountPath);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Firebase Admin connected successfully (File Mode)');
      } 
      // Method 2: Using Environment Variables (Ideal for Production/Docker)
      // We use Type Casting (as string) to satisfy TypeScript's requirement for non-nullable values
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        console.log('Attempting to connect to Firebase via Environment Variables...');
        
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID as string,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
            // The replace logic handles the newline characters in the private key string from .env
            privateKey: (process.env.FIREBASE_PRIVATE_KEY as string).replace(/\\n/g, '\n'), 
          }),
        });
        console.log('✅ Firebase Admin connected successfully (Env Mode)');
      } 
      else {
        console.warn('⚠️  Firebase credentials not found in env or file!');
        console.warn('⚠️  Continuing without Firebase (Push notifications will not work)');
      }
    }
  } catch (error) {
    console.error('⚠️  Firebase connection failed:', error);
  }
};

// Export the admin instance to be used across the app
export const firebaseAdmin = admin;