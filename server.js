const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Import the database connection

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