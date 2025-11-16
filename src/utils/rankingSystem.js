/**
 * Biblical Ranking System
 *
 * This module implements the gamification ranking system for verse memorization.
 * Users progress through biblical character ranks based on the number of verses memorized.
 *
 * IMPORTANT: This logic must match the frontend implementation exactly.
 */

/**
 * Biblical ranks with their verse requirements
 * Each rank represents a biblical character known for their spiritual journey
 *
 * @type {Array<{level: string, minVerses: number, maxVerses: number, nextLevel: string|null}>}
 */
const biblicalRanks = [
  {
    level: "Nicodemus",
    minVerses: 1,
    maxVerses: 3,
    nextLevel: "Thomas",
    description: "Just beginning your journey, seeking truth"
  },
  {
    level: "Thomas",
    minVerses: 4,
    maxVerses: 8,
    nextLevel: "Peter",
    description: "Growing in faith, overcoming doubts"
  },
  {
    level: "Peter",
    minVerses: 9,
    maxVerses: 16,
    nextLevel: "John",
    description: "Bold and passionate follower"
  },
  {
    level: "John",
    minVerses: 17,
    maxVerses: 27,
    nextLevel: "Paul",
    description: "Drawing close to the heart of God"
  },
  {
    level: "Paul",
    minVerses: 28,
    maxVerses: 40,
    nextLevel: "David",
    description: "Transformed and zealous for the Word"
  },
  {
    level: "David",
    minVerses: 41,
    maxVerses: 55,
    nextLevel: "Daniel",
    description: "A person after God's own heart"
  },
  {
    level: "Daniel",
    minVerses: 56,
    maxVerses: 75,
    nextLevel: "Solomon",
    description: "Steadfast in faith and commitment"
  },
  {
    level: "Solomon",
    minVerses: 76,
    maxVerses: 100,
    nextLevel: null,
    description: "Wise and deeply rooted in Scripture"
  }
];

/**
 * Calculate user's current rank based on verses memorized
 *
 * @param {number} versesCount - Number of verses the user has memorized
 * @returns {{
 *   currentRank: object,
 *   progress: number,
 *   versesToNextRank: number
 * }} Rank information object
 *
 * @example
 * const result = calculateUserRank(25);
 * // Returns:
 * // {
 * //   currentRank: { level: "John", minVerses: 17, maxVerses: 27, ... },
 * //   progress: 81.82,
 * //   versesToNextRank: 3
 * // }
 */
function calculateUserRank(versesCount) {
  // Handle users with no verses
  if (versesCount <= 0) {
    const firstRank = biblicalRanks[0];
    return {
      currentRank: firstRank,
      progress: 0,
      versesToNextRank: firstRank.minVerses
    };
  }

  // Find the appropriate rank for the verse count
  let currentRank = biblicalRanks[0];

  for (const rank of biblicalRanks) {
    if (versesCount >= rank.minVerses && versesCount <= rank.maxVerses) {
      currentRank = rank;
      break;
    }
  }

  // Handle users who exceed the maximum rank (Solomon)
  if (versesCount > biblicalRanks[biblicalRanks.length - 1].maxVerses) {
    currentRank = biblicalRanks[biblicalRanks.length - 1];
  }

  // Calculate progress within current rank (0-100%)
  let progress = 0;
  const levelRange = currentRank.maxVerses - currentRank.minVerses + 1;

  if (versesCount >= 100 && currentRank.level === "Solomon") {
    // Max rank reached at 100 verses
    progress = 100;
  } else {
    const versesInCurrentLevel = versesCount - currentRank.minVerses + 1;
    progress = Math.min(
      Math.max((versesInCurrentLevel / levelRange) * 100, 0),
      100
    );
  }

  // Calculate verses needed to reach next rank
  let versesToNextRank = 0;
  if (currentRank.nextLevel) {
    versesToNextRank = Math.max(currentRank.maxVerses + 1 - versesCount, 0);
  }

  return {
    currentRank,
    progress: Math.round(progress * 100) / 100, // Round to 2 decimal places
    versesToNextRank
  };
}

/**
 * Get rank information by level name
 *
 * @param {string} levelName - Name of the rank (e.g., "Paul", "David")
 * @returns {object|null} Rank object or null if not found
 */
function getRankByLevel(levelName) {
  return biblicalRanks.find(rank => rank.level === levelName) || null;
}

/**
 * Get the next rank after a given level
 *
 * @param {string} currentLevel - Current rank level name
 * @returns {object|null} Next rank object or null if at max rank
 */
function getNextRank(currentLevel) {
  const currentRank = getRankByLevel(currentLevel);
  if (!currentRank || !currentRank.nextLevel) {
    return null;
  }
  return getRankByLevel(currentRank.nextLevel);
}

/**
 * Check if user has leveled up after memorizing a new verse
 *
 * @param {number} previousVersesCount - Previous verse count
 * @param {number} newVersesCount - New verse count after memorizing
 * @returns {{
 *   leveledUp: boolean,
 *   previousRank: object,
 *   newRank: object
 * }} Level up information
 */
function checkLevelUp(previousVersesCount, newVersesCount) {
  const previousRankInfo = calculateUserRank(previousVersesCount);
  const newRankInfo = calculateUserRank(newVersesCount);

  const leveledUp = previousRankInfo.currentRank.level !== newRankInfo.currentRank.level;

  return {
    leveledUp,
    previousRank: previousRankInfo.currentRank,
    newRank: newRankInfo.currentRank
  };
}

/**
 * Get all available ranks
 *
 * @returns {Array} Array of all rank objects
 */
function getAllRanks() {
  return [...biblicalRanks];
}

module.exports = {
  biblicalRanks,
  calculateUserRank,
  getRankByLevel,
  getNextRank,
  checkLevelUp,
  getAllRanks
};
