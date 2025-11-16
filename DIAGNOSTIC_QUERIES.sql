-- =====================================================
-- DIAGNOSTIC QUERIES FOR RANKING SYSTEM
-- =====================================================
-- Run these in your database console to check data
-- =====================================================

-- Query 1: Check if migration columns exist
DESCRIBE users;

-- Query 2: Check current user verse counts
SELECT
  id,
  username,
  verses_memorized,
  current_rank,
  rank_updated_at
FROM users
ORDER BY verses_memorized DESC
LIMIT 20;

-- Query 3: Check how many users have memorized verses
SELECT
  COUNT(*) as total_users,
  SUM(CASE WHEN verses_memorized > 0 THEN 1 ELSE 0 END) as users_with_verses,
  MAX(verses_memorized) as max_verses,
  AVG(verses_memorized) as avg_verses
FROM users;

-- Query 4: Check user_memorized_verses table
SELECT
  user_id,
  COUNT(*) as verses_count
FROM user_memorized_verses
GROUP BY user_id
ORDER BY verses_count DESC
LIMIT 10;

-- Query 5: Compare actual verses vs verses_memorized column
SELECT
  u.id,
  u.username,
  u.verses_memorized as counted_in_column,
  (SELECT COUNT(*) FROM user_memorized_verses umv WHERE umv.user_id = u.id) as actual_verses
FROM users u
WHERE EXISTS (SELECT 1 FROM user_memorized_verses umv WHERE umv.user_id = u.id)
LIMIT 20;

-- =====================================================
-- FIX: If verses_memorized is 0 but users have verses
-- =====================================================
-- This re-initializes the count for all users
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

-- Verify the fix worked
SELECT
  COUNT(*) as users_updated,
  SUM(verses_memorized) as total_verses
FROM users
WHERE verses_memorized > 0;
