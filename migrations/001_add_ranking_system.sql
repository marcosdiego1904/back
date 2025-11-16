-- =====================================================
-- RANKING SYSTEM DATABASE MIGRATION
-- =====================================================
-- This migration adds ranking and gamification features
-- to track user progress in memorizing Bible verses
-- =====================================================

-- Step 1: Add ranking columns to users table
-- =====================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verses_memorized INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS current_rank VARCHAR(50) DEFAULT 'Nicodemus',
  ADD COLUMN IF NOT EXISTS rank_updated_at TIMESTAMP NULL;

-- Step 2: Create rank_history table to track progression
-- =====================================================
CREATE TABLE IF NOT EXISTS rank_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  previous_rank VARCHAR(50) NOT NULL,
  new_rank VARCHAR(50) NOT NULL,
  verses_count INT NOT NULL,
  achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint
  CONSTRAINT fk_rank_history_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  -- Index for faster queries
  INDEX idx_user_history (user_id, achieved_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Add performance indexes
-- =====================================================

-- Index for leaderboard queries (ORDER BY verses_memorized DESC)
CREATE INDEX IF NOT EXISTS idx_users_verses_rank
  ON users(verses_memorized DESC, rank_updated_at ASC);

-- Index for user_memorized_verses lookups
CREATE INDEX IF NOT EXISTS idx_memorized_verses_user
  ON user_memorized_verses(user_id);

-- Index for checking verse existence
CREATE INDEX IF NOT EXISTS idx_memorized_verses_user_verse
  ON user_memorized_verses(user_id, verse_id);

-- Step 4: Initialize verses_memorized count for existing users
-- =====================================================
-- This updates the count for users who already have memorized verses
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
);

-- Step 5: Set rank_updated_at for users with verses
-- =====================================================
UPDATE users u
SET rank_updated_at = (
  SELECT MAX(memorized_date)
  FROM user_memorized_verses umv
  WHERE umv.user_id = u.id
)
WHERE verses_memorized > 0 AND rank_updated_at IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- To apply this migration, run:
--   mysql -u [username] -p [database_name] < migrations/001_add_ranking_system.sql
--
-- Or via Railway dashboard:
--   Copy and paste this SQL into the Railway MySQL console
-- =====================================================

-- Verify migration success
SELECT
  'Migration complete!' as status,
  COUNT(*) as total_users,
  SUM(verses_memorized) as total_verses_memorized,
  COUNT(DISTINCT current_rank) as unique_ranks
FROM users;
