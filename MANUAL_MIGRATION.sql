-- =====================================================
-- MANUAL MIGRATION FOR RENDER
-- =====================================================
-- Run this in Render's MySQL console if automatic migrations fail
-- =====================================================

-- Step 1: Add ranking columns to users table
-- Note: If columns already exist, you'll see "Duplicate column" errors - that's OK, ignore them
ALTER TABLE users
  ADD COLUMN verses_memorized INT DEFAULT 0 NOT NULL;

ALTER TABLE users
  ADD COLUMN current_rank VARCHAR(50) DEFAULT 'Nicodemus';

ALTER TABLE users
  ADD COLUMN rank_updated_at TIMESTAMP NULL;

-- Step 2: Create rank_history table
CREATE TABLE IF NOT EXISTS rank_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  previous_rank VARCHAR(50) NOT NULL,
  new_rank VARCHAR(50) NOT NULL,
  verses_count INT NOT NULL,
  achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_history (user_id, achieved_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Add performance indexes
-- Note: If indexes already exist, you'll see "Duplicate key" errors - that's OK, ignore them
CREATE INDEX idx_users_verses_rank
  ON users(verses_memorized DESC, rank_updated_at ASC);

CREATE INDEX idx_memorized_verses_user
  ON user_memorized_verses(user_id);

CREATE INDEX idx_memorized_verses_user_verse
  ON user_memorized_verses(user_id, verse_id);

-- Step 4: Initialize verses_memorized for existing users
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
UPDATE users u
SET rank_updated_at = (
  SELECT MAX(memorized_date)
  FROM user_memorized_verses umv
  WHERE umv.user_id = u.id
)
WHERE verses_memorized > 0 AND rank_updated_at IS NULL;

-- Verify migration
SELECT 'Migration complete!' as status,
       COUNT(*) as total_users,
       SUM(verses_memorized) as total_verses,
       COUNT(DISTINCT current_rank) as unique_ranks
FROM users;
