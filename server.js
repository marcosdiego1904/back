const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Import the database connection
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies

// List of origins allowed to access the API
const allowedOrigins = [
  'https://lamp2-glredjqk8-marcosdiego1904s-projects.vercel.app',
  'https://lamp2-i0kpjhigd-marcosdiego1904s-projects.vercel.app',
  'https://front-self-eight.vercel.app', // Your new Vercel deployment URL
  'http://localhost:3000',
  'http://localhost:5173' // Common Vite port
];

// Simpler CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Auth routes
// Register a new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }
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
      { userId, username },
      process.env.JWT_SECRET || 'your-secret-key',
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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Find user by email
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
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
app.get('/api/subcategories/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
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
app.get('/api/verses/:subcategoryId', async (req, res) => {
  try {
    const subcategoryId = req.params.subcategoryId;
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});