import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Path to the downloaded Service Account file (ensure it matches your actual path)
// Recommended: Place it in the 'server' root directory next to package.json, not inside 'src', so it can be easily gitignored.
const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

// Firebase initialization
export const initializeFirebase = (): void => {
  console.log('Starting Firebase Admin initialization...');

  try {
    // Ensure Firebase is not initialized more than once to prevent errors
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
      // Method 2: Using Environment Variables (Ideal for Production Deployment)
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        console.log('Attempting to connect to Firebase via Environment Variables...');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // The replace logic is crucial for the server to parse newline characters in the private key correctly
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), 
          }),
        });
        console.log('✅ Firebase Admin connected successfully (Env Mode)');
      } 
      else {
        console.warn('⚠️  Firebase credentials not found!');
        console.warn('⚠️  Continuing without Firebase (Push notifications will not work)');
      }
    }
  } catch (error) {
    console.warn('⚠️  Firebase connection failed:', error);
  }
};

// Export the admin instance to be used across the app for sending push notifications
export const firebaseAdmin = admin;