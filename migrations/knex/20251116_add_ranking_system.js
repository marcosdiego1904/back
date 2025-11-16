/**
 * Migration: Add Biblical Ranking System
 *
 * This migration adds the ranking and gamification features to track
 * user progress in memorizing Bible verses.
 *
 * Changes:
 * - Adds verses_memorized, current_rank, rank_updated_at columns to users table
 * - Creates rank_history table to track progression
 * - Adds performance indexes for leaderboard queries
 * - Initializes verse counts for existing users
 */

exports.up = async function(knex) {
  console.log('🔄 Running migration: Add Biblical Ranking System');

  // Step 1: Add ranking columns to users table
  console.log('  📝 Adding ranking columns to users table...');
  const hasVersesMemorized = await knex.schema.hasColumn('users', 'verses_memorized');
  const hasCurrentRank = await knex.schema.hasColumn('users', 'current_rank');
  const hasRankUpdatedAt = await knex.schema.hasColumn('users', 'rank_updated_at');

  await knex.schema.alterTable('users', (table) => {
    if (!hasVersesMemorized) {
      table.integer('verses_memorized').notNullable().defaultTo(0);
    }
    if (!hasCurrentRank) {
      table.string('current_rank', 50).defaultTo('Nicodemus');
    }
    if (!hasRankUpdatedAt) {
      table.timestamp('rank_updated_at').nullable();
    }
  });

  // Step 2: Create rank_history table
  console.log('  📝 Creating rank_history table...');
  const hasRankHistory = await knex.schema.hasTable('rank_history');

  if (!hasRankHistory) {
    await knex.schema.createTable('rank_history', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('previous_rank', 50).notNullable();
      table.string('new_rank', 50).notNullable();
      table.integer('verses_count').notNullable();
      table.timestamp('achieved_at').defaultTo(knex.fn.now());

      // Foreign key constraint
      table.foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');

      // Index for faster queries
      table.index(['user_id', 'achieved_at'], 'idx_user_history');
    });
  }

  // Step 3: Add performance indexes
  console.log('  📝 Adding performance indexes...');

  // Index for leaderboard queries (ORDER BY verses_memorized DESC)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_verses_rank
    ON users(verses_memorized DESC, rank_updated_at ASC)
  `).catch(err => {
    if (!err.message.includes('Duplicate key name')) {
      throw err;
    }
    console.log('    ⚠️  Index idx_users_verses_rank already exists, skipping');
  });

  // Index for user_memorized_verses lookups
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_memorized_verses_user
    ON user_memorized_verses(user_id)
  `).catch(err => {
    if (!err.message.includes('Duplicate key name')) {
      throw err;
    }
    console.log('    ⚠️  Index idx_memorized_verses_user already exists, skipping');
  });

  // Index for checking verse existence
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_memorized_verses_user_verse
    ON user_memorized_verses(user_id, verse_id)
  `).catch(err => {
    if (!err.message.includes('Duplicate key name')) {
      throw err;
    }
    console.log('    ⚠️  Index idx_memorized_verses_user_verse already exists, skipping');
  });

  // Step 4: Initialize verses_memorized count for existing users
  console.log('  📝 Initializing verse counts for existing users...');
  await knex.raw(`
    UPDATE users u
    SET verses_memorized = (
      SELECT COUNT(*)
      FROM user_memorized_verses umv
      WHERE umv.user_id = u.id
    )
    WHERE EXISTS (
      SELECT 1
      FROM user_memorized_verses umv
      WHERE umv.user_id = u.id
    )
  `);

  // Step 5: Set rank_updated_at for users with verses
  console.log('  📝 Setting rank_updated_at for users with verses...');
  await knex.raw(`
    UPDATE users u
    SET rank_updated_at = (
      SELECT MAX(memorized_date)
      FROM user_memorized_verses umv
      WHERE umv.user_id = u.id
    )
    WHERE verses_memorized > 0 AND rank_updated_at IS NULL
  `);

  console.log('✅ Migration completed successfully!');
};

exports.down = async function(knex) {
  console.log('🔄 Rolling back migration: Add Biblical Ranking System');

  // Drop indexes
  console.log('  📝 Dropping indexes...');
  await knex.raw('DROP INDEX IF EXISTS idx_users_verses_rank ON users');
  await knex.raw('DROP INDEX IF EXISTS idx_memorized_verses_user ON user_memorized_verses');
  await knex.raw('DROP INDEX IF EXISTS idx_memorized_verses_user_verse ON user_memorized_verses');

  // Drop rank_history table
  console.log('  📝 Dropping rank_history table...');
  await knex.schema.dropTableIfExists('rank_history');

  // Remove ranking columns from users table
  console.log('  📝 Removing ranking columns from users table...');
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('verses_memorized');
    table.dropColumn('current_rank');
    table.dropColumn('rank_updated_at');
  });

  console.log('✅ Rollback completed successfully!');
};

// Configuration
exports.config = {
  transaction: true
};
