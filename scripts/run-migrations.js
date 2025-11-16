#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * This script runs all pending database migrations using Knex.js
 * It's designed to be run automatically by Railway before starting the server.
 *
 * Usage:
 *   node scripts/run-migrations.js
 */

const path = require('path');
require('dotenv').config();

// Determine environment
const environment = process.env.NODE_ENV || 'production';

console.log('🚀 Database Migration Runner');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Environment: ${environment}`);
console.log(`📁 Working directory: ${process.cwd()}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function runMigrations() {
  let knex;

  try {
    // Import Knex configuration
    const knexConfig = require('../knexfile.js');
    const config = knexConfig[environment];

    if (!config) {
      throw new Error(`No configuration found for environment: ${environment}`);
    }

    console.log('🔧 Initializing Knex...');

    // Initialize Knex
    const Knex = require('knex');
    knex = Knex(config);

    // Test database connection
    console.log('🔌 Testing database connection...');
    await knex.raw('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Get migration status
    console.log('📋 Checking migration status...');
    const [completed, pending] = await knex.migrate.list();

    if (completed.length > 0) {
      console.log(`✅ Completed migrations (${completed.length}):`);
      completed.forEach(migration => {
        console.log(`   - ${migration}`);
      });
      console.log('');
    }

    if (pending.length === 0) {
      console.log('✨ No pending migrations. Database is up to date!\n');
      return;
    }

    console.log(`⏳ Pending migrations (${pending.length}):`);
    pending.forEach(migration => {
      console.log(`   - ${migration}`);
    });
    console.log('');

    // Run migrations
    console.log('🔄 Running pending migrations...\n');
    const [batchNo, migrations] = await knex.migrate.latest();

    if (migrations.length === 0) {
      console.log('✨ No migrations were run.\n');
    } else {
      console.log(`\n✅ Batch ${batchNo} completed successfully!`);
      console.log(`📦 Applied migrations (${migrations.length}):`);
      migrations.forEach(migration => {
        console.log(`   - ${migration}`);
      });
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Migration process completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Migration failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${error.message}`);

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check database connection credentials in .env');
    console.error('   2. Verify database server is accessible');
    console.error('   3. Ensure migration files are valid JavaScript');
    console.error('   4. Check database user has necessary permissions');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(1);
  } finally {
    // Close database connection
    if (knex) {
      console.log('🔌 Closing database connection...');
      await knex.destroy();
    }
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('👋 Migration runner exited successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
