-- Migration: Add Search History and Favorites tables
-- Date: 2025-01-07
-- Description: Adds tables for tracking user search history and favorite verses

-- ============================================
-- Table: verse_search_history
-- Purpose: Track user's Bible verse searches
-- ============================================
CREATE TABLE IF NOT EXISTS verse_search_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  verse_reference VARCHAR(255) NOT NULL,
  translation VARCHAR(10) NOT NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_searched (user_id, searched_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: user_favorites
-- Purpose: Store user's favorite Bible verses
-- ============================================
CREATE TABLE IF NOT EXISTS user_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  verse_reference VARCHAR(255) NOT NULL,
  verse_text TEXT NOT NULL,
  translation VARCHAR(10) NOT NULL,
  note TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_verse (user_id, verse_reference, translation),
  INDEX idx_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Verification Queries (Run these after migration)
-- ============================================
-- SHOW TABLES LIKE 'verse_search_history';
-- SHOW TABLES LIKE 'user_favorites';
-- DESC verse_search_history;
-- DESC user_favorites;
