const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Import the database connection
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  validateEmail,
  validateUsername,
  validatePassword,
  validateId,
  validateVerseText,
  validateVerseReference,
  createValidationMiddleware
} = require('./src/utils/validation');
const { calculateUserRank } = require('./src/utils/rankingSystem');

const app = express();

// IMPORTANT: Webhook route BEFORE body parser (needs raw body)
const stripeRoutes = require('./routes/stripe');
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Middleware
app.use(express.json()); // Parse JSON bodies

// List of origins allowed to access the API
const allowedOrigins = [
  'https://lamp2-glredjqk8-marcosdiego1904s-projects.vercel.app',
  'https://lamp2-i0kpjhigd-marcosdiego1904s-projects.vercel.app',
  'https://front-self-eight.vercel.app', 
  'https://www.lamptomyfeet.co',
  'https://lamptomyfeet.co',
  'http://localhost:3000',
  'http://localhost:5173' 
];

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Register Stripe routes (AFTER body parser)
app.use('/api/stripe', stripeRoutes);

// Validate JWT_SECRET is present
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is required for security. Please set it in your environment variables.');
  console.error('This is critical for token security in production.');
  process.exit(1);
}

// Authentication middleware
const authenticate = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Validation middleware definitions
const validateRegistration = createValidationMiddleware({
  username: validateUsername,
  email: validateEmail,
  password: validatePassword
});

const validateLogin = createValidationMiddleware({
  email: validateEmail,
  password: validatePassword
});

const validateCategoryId = createValidationMiddleware({
  categoryId: (id) => validateId(id, 'Category ID')
});

const validateSubcategoryId = createValidationMiddleware({
  subcategoryId: (id) => validateId(id, 'Subcategory ID')
});

const validateVerseId = createValidationMiddleware({
  verseId: (id) => validateId(id, 'Verse ID')
});

const validateMemorizedVerse = createValidationMiddleware({
  verseId: (id) => validateId(id, 'Verse ID'),
  verseReference: validateVerseReference,
  verseText: (text) => validateVerseText(text, 'Verse text', 2000),
  contextText: (text) => text ? validateVerseText(text, 'Context text', 1000) : { isValid: true, sanitized: '' }
});

// Auth routes
// Register a new user
app.post('/api/auth/register', validateRegistration, async (req, res) => {
  try {
    // Use sanitized data from validation middleware
    const { username, email, password } = req.sanitized;
    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    // Insert new user
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    // Get the user ID from the insert result
    const userId = result.insertId;
    // Generate JWT token
    const token = jwt.sign(
      { userId, username, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, username, email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', validateLogin, async (req, res) => {
  try {
    // Use sanitized data from validation middleware
    const { email, password } = req.sanitized;
    // Find user by email
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];

    // Defensive check to prevent bcrypt errors
    if (!password || !user.password_hash) {
      console.error('Login error: Missing password from request or password hash from DB.');
      console.error(`Attempted login for email: ${email}. Password provided: ${!!password}, User has hash: ${!!user.password_hash}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Categories endpoint
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories');
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Database error', 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Subcategories endpoint
app.get('/api/subcategories/:categoryId', validateCategoryId, async (req, res) => {
  try {
    // Use validated and parsed ID from middleware
    const categoryId = req.sanitized.categoryId;
    const [rows] = await db.query('SELECT * FROM subcategories WHERE category_id = ?', [categoryId]);
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Database error', 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Verses endpoint
app.get('/api/verses/:subcategoryId', validateSubcategoryId, async (req, res) => {
  try {
    // Use validated and parsed ID from middleware
    const subcategoryId = req.sanitized.subcategoryId;
    const [rows] = await db.query('SELECT * FROM verses WHERE subcategory_id = ?', [subcategoryId]);
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Database error', 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Protected route example
app.get('/api/user/profile', authenticate, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, email, created_at, last_login FROM users WHERE id = ?', [req.user.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user: users[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Categories: http://localhost:${PORT}/api/categories`);
});
app.post('/api/user/memorized-verses', authenticate, validateMemorizedVerse, async (req, res) => {
  try {
    // Use sanitized data from validation middleware
    const { verseId, verseReference, verseText, contextText } = req.sanitized;
    const userId = req.user.userId;

    // Check if this verse is already saved by the user
    const [existingVerses] = await db.query(
      'SELECT * FROM user_memorized_verses WHERE user_id = ? AND verse_id = ?',
      [userId, verseId]
    );

    if (existingVerses.length > 0) {
      // Update the existing record to update the timestamp
      await db.query(
        'UPDATE user_memorized_verses SET memorized_date = NOW() WHERE user_id = ? AND verse_id = ?',
        [userId, verseId]
      );

      // Get current progress without updating rank
      const [users] = await db.query(
        'SELECT verses_memorized, current_rank FROM users WHERE id = ?',
        [userId]
      );

      const versesCount = users[0].verses_memorized || 0;
      const rankInfo = calculateUserRank(versesCount);

      return res.json({
        success: true,
        message: 'Verse memorization updated successfully',
        isNew: false,
        progress: {
          versesCount,
          currentRank: rankInfo.currentRank,
          progress: rankInfo.progress,
          versesToNextRank: rankInfo.versesToNextRank,
          leveledUp: false,
          previousRank: users[0].current_rank
        }
      });
    }

    // Get user's previous rank before adding new verse
    const [previousUser] = await db.query(
      'SELECT verses_memorized, current_rank FROM users WHERE id = ?',
      [userId]
    );

    const previousVersesCount = previousUser[0].verses_memorized || 0;
    const previousRankLevel = previousUser[0].current_rank;

    // Insert the new memorized verse
    await db.query(
      'INSERT INTO user_memorized_verses (user_id, verse_id, verse_reference, verse_text, context_text, memorized_date) VALUES (?, ?, ?, ?, ?, NOW())',
      [userId, verseId, verseReference, verseText, contextText || '']
    );

    // Calculate new verse count
    const newVersesCount = previousVersesCount + 1;

    // Calculate new rank using the ranking system
    const rankInfo = calculateUserRank(newVersesCount);
    const newRankLevel = rankInfo.currentRank.level;

    // Check if user leveled up
    const leveledUp = previousRankLevel !== newRankLevel;

    // Update user's verse count and rank in the database
    await db.query(
      'UPDATE users SET verses_memorized = ?, current_rank = ?, rank_updated_at = NOW() WHERE id = ?',
      [newVersesCount, newRankLevel, userId]
    );

    // If user leveled up, record it in rank_history
    if (leveledUp) {
      await db.query(
        'INSERT INTO rank_history (user_id, previous_rank, new_rank, verses_count) VALUES (?, ?, ?, ?)',
        [userId, previousRankLevel, newRankLevel, newVersesCount]
      );
    }

    res.status(201).json({
      success: true,
      message: leveledUp
        ? `Congratulations! You've reached ${newRankLevel} rank!`
        : 'Verse added to your memorized collection',
      isNew: true,
      progress: {
        versesCount: newVersesCount,
        currentRank: rankInfo.currentRank,
        progress: rankInfo.progress,
        versesToNextRank: rankInfo.versesToNextRank,
        leveledUp,
        previousRank: previousRankLevel
      }
    });

  } catch (error) {
    console.error('Save memorized verse error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving memorized verse'
    });
  }
});

// Get user's memorized verses
app.get('/api/user/memorized-verses', authenticate, async (req, res) => {
  try {
    const [verses] = await db.query(
      'SELECT * FROM user_memorized_verses WHERE user_id = ? ORDER BY memorized_date DESC',
      [req.user.userId]
    );
    
    res.json(verses);
  } catch (error) {
    console.error('Fetch memorized verses error:', error);
    res.status(500).json({ message: 'Server error while fetching memorized verses' });
  }
});
// Add this to your server.js file

// Get verse by ID endpoint
app.get('/api/verse/:verseId', validateVerseId, async (req, res) => {
  try {
    // Use validated and parsed ID from middleware
    const verseId = req.sanitized.verseId;
    const [rows] = await db.query('SELECT * FROM verses WHERE id = ?', [verseId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Verse not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Database error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// =====================================================
// RANKING & LEADERBOARD ENDPOINTS
// =====================================================

/**
 * GET /api/ranking - Global Leaderboard
 * Returns the global leaderboard of users ranked by verses memorized
 * Includes current user's position even if not in top results
 */
app.get('/api/ranking', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Validate limit and offset
    if (limit < 1 || limit > 500) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 500'
      });
    }

    if (offset < 0) {
      return res.status(400).json({
        success: false,
        message: 'Offset must be non-negative'
      });
    }

    // Get top users ordered by verses_memorized
    // Using a subquery to calculate rank efficiently
    const [leaderboard] = await db.query(`
      SELECT
        u.id as userId,
        u.username,
        u.verses_memorized as versesCount,
        u.current_rank as rankLevel,
        u.rank_updated_at as achievedAt,
        (
          SELECT COUNT(*) + 1
          FROM users u2
          WHERE u2.verses_memorized > u.verses_memorized
        ) as \`rank\`
      FROM users u
      WHERE u.verses_memorized > 0
      ORDER BY u.verses_memorized DESC, u.rank_updated_at ASC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Get current user's position
    const [currentUserResult] = await db.query(`
      SELECT
        u.id as userId,
        u.username,
        u.verses_memorized as versesCount,
        u.current_rank as rankLevel,
        u.rank_updated_at as achievedAt,
        (
          SELECT COUNT(*) + 1
          FROM users u2
          WHERE u2.verses_memorized > u.verses_memorized
        ) as \`rank\`
      FROM users u
      WHERE u.id = ?
    `, [currentUserId]);

    // Get total users with memorized verses
    const [totalCountResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM users
      WHERE verses_memorized > 0
    `);

    const currentUser = currentUserResult.length > 0
      ? { ...currentUserResult[0], isCurrentUser: true }
      : null;

    res.json({
      success: true,
      leaderboard: leaderboard,
      currentUser: currentUser,
      totalUsers: totalCountResult[0].total
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaderboard'
    });
  }
});

/**
 * GET /api/user/progress - User's Rank Progress
 * Returns the current user's rank information and progress towards next rank
 */
app.get('/api/user/progress', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's current verse count
    const [users] = await db.query(
      'SELECT verses_memorized, current_rank FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    const versesCount = user.verses_memorized || 0;

    // Calculate rank information using the ranking system
    const rankInfo = calculateUserRank(versesCount);

    res.json({
      success: true,
      versesMemorized: versesCount,
      currentRank: {
        level: rankInfo.currentRank.level,
        description: rankInfo.currentRank.description,
        minVerses: rankInfo.currentRank.minVerses,
        maxVerses: rankInfo.currentRank.maxVerses,
        nextLevel: rankInfo.currentRank.nextLevel
      },
      progress: rankInfo.progress,
      versesToNextRank: rankInfo.versesToNextRank
    });

  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching progress'
    });
  }
});

