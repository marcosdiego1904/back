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
  'https://lamp-to-my-feet-4.onrender.com', // Your Vercel frontend domain
  'http://localhost:3000',
  'http://localhost:5173', // Common Vite port
  'https://front-4vx5.vercel.app' // Add your actual Vercel domain here
];

// Configure CORS
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(null, true); // Temporarily allow all origins for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
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