// Knex Migration Configuration
// This file configures the database connection for migrations
require('dotenv').config();

// Parse MYSQL_URL if available (Railway format)
// Format: mysql://user:password@host:port/database
function parseMySQLUrl(url) {
  if (!url) return null;

  try {
    const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = url.match(regex);

    if (match) {
      return {
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: match[2],
        database: match[5]
      };
    }
  } catch (err) {
    console.error('Error parsing MYSQL_URL:', err);
  }

  return null;
}

// Get database configuration from environment
const parsedUrl = parseMySQLUrl(process.env.MYSQL_URL);

const dbConfig = parsedUrl || {
  host: process.env.MYSQLHOST || 'localhost',
  port: parseInt(process.env.MYSQLPORT) || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway'
};

// Knex configuration
module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      ...dbConfig,
      charset: 'utf8mb4'
    },
    migrations: {
      directory: './migrations/knex',
      tableName: 'knex_migrations',
      extension: 'js'
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  production: {
    client: 'mysql2',
    connection: {
      ...dbConfig,
      charset: 'utf8mb4',
      ssl: process.env.SSL_STRICT === 'true' ? {
        rejectUnauthorized: true
      } : undefined
    },
    migrations: {
      directory: './migrations/knex',
      tableName: 'knex_migrations',
      extension: 'js'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};

// Log configuration for debugging (hide password)
const configForLogging = {
  ...dbConfig,
  password: dbConfig.password ? '***' : undefined
};
console.log('📊 Knex database configuration:', configForLogging);
