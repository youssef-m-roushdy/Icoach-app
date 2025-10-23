import { Sequelize } from 'sequelize';
import mongoose from 'mongoose';

// PostgreSQL configuration with Sequelize
export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'icoach_db',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '123',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// MongoDB configuration with Mongoose (for logging and AI data only)
export const connectMongoDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/icoach_nosql';
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB connected successfully (for logging and AI data)');
};

// Database initialization
export const initializeDatabases = async (): Promise<void> => {
  console.log('Starting database initialization...');
  
  // PostgreSQL connection
  try {
    console.log('Attempting to connect to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    
    // Sync models (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('Syncing database models...');
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synced');
    }
  } catch (error) {
    console.warn('⚠️  PostgreSQL connection failed:', error);
    console.warn('⚠️  Continuing without PostgreSQL (some features may not work)');
  }
  
  // MongoDB connection
  try {
    console.log('Attempting to connect to MongoDB...');
    await connectMongoDB();
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed:', error);
    console.warn('⚠️  Continuing without MongoDB (logging features may not work)');
  }
  
  console.log('Database initialization completed');
};