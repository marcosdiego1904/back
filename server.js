const express = require('express');
const cors = require('cors');
const app = express();

// List of origins allowed to access the API.
const allowedOrigins = [
  'https://lamp2-glredjqk8-marcosdiego1904s-projects.vercel.app',
  'https://lamp2-i0kpjhigd-marcosdiego1904s-projects.vercel.app'
];

// Configure CORS options.
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

// Apply the CORS middleware.
app.use(cors(corsOptions));

// Example endpoint.
app.get('/api/categories', (req, res) => {
  // Replace this with your actual categories data.
  res.json({ categories: [] });
});

// Start the server.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
