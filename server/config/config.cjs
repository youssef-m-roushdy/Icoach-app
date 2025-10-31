require('dotenv').config();

module.exports = {
  development: {
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '123',
    database: process.env.POSTGRES_DB || 'icoach_db',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  test: {
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '123',
    database: process.env.POSTGRES_DB_TEST || 'icoach_db_test',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    ...(process.env.POSTGRES_SSL === 'true' && {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  }
};
