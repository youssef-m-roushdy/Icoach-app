import { Sequelize } from 'sequelize';
import mongoose from 'mongoose';

// PostgreSQL configuration with Sequelize
export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'icoach_db',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// MongoDB configuration with Mongoose
export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/icoach_nosql';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Database initialization
export const initializeDatabases = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    
    // Sync models (in development only)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
    }
    
    // Connect to MongoDB
    await connectMongoDB();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};