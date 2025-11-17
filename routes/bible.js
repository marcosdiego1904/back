const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Bible API Proxy - Securely fetches Bible verses with premium translation protection
 * POST /api/bible/search
 *
 * Request body:
 * {
 *   reference: "John 3:16",
 *   translation: "niv" | "nlt" | "kjv" (default: "kjv")
 * }
 */
router.post('/search', authenticateToken, async (req, res) => {
  const { reference, translation = 'kjv' } = req.body;
  const userId = req.user.userId;

  try {
    // Validate required fields
    if (!reference) {
      return res.status(400).json({ error: 'Missing required field: reference' });
    }

    // Get user premium status
    const [users] = await db.query(
      'SELECT is_premium FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPremium = Boolean(users[0].is_premium);

    // Check if translation requires premium
    const premiumTranslations = ['niv', 'nlt'];
    if (premiumTranslations.includes(translation.toLowerCase()) && !isPremium) {
      return res.status(403).json({
        error: 'Premium translation requires Pro subscription',
        translation: translation,
        requiresPremium: true
      });
    }

    let verseData;

    // Route to appropriate API based on translation
    switch (translation.toLowerCase()) {
      case 'niv':
        verseData = await fetchNIV(reference);
        break;
      case 'nlt':
        verseData = await fetchNLT(reference);
        break;
      case 'kjv':
      default:
        verseData = await fetchKJV(reference);
        break;
    }

    res.json({
      success: true,
      translation: translation.toUpperCase(),
      reference: reference,
      ...verseData
    });

  } catch (error) {
    console.error('Bible API error:', error);
    res.status(500).json({
      error: 'Failed to fetch verse',
      message: error.message
    });
  }
});

/**
 * Fetch NIV translation via RapidAPI
 */
async function fetchNIV(reference) {
  try {
    const parsed = parseReference(reference);

    const response = await axios.get(
      'https://niv-bible.p.rapidapi.com/row',
      {
        params: {
          Book: parsed.book,
          Chapter: parsed.chapter,
          Verse: parsed.verse
        },
        headers: {
          'x-rapidapi-key': process.env.NIV_RAPIDAPI_KEY,
          'x-rapidapi-host': 'niv-bible.p.rapidapi.com'
        }
      }
    );

    if (response.data && response.data.length > 0) {
      const verse = response.data[0];
      return {
        text: verse.Text || verse.text,
        book: verse.Book || parsed.book,
        chapter: verse.Chapter || parsed.chapter,
        verse: verse.Verse || parsed.verse
      };
    } else {
      throw new Error('Verse not found in NIV translation');
    }
  } catch (error) {
    throw new Error(`NIV API error: ${error.message}`);
  }
}

/**
 * Fetch NLT translation via NLT API
 */
async function fetchNLT(reference) {
  try {
    const response = await axios.get(
      'https://api.nlt.to/api/passages',
      {
        params: {
          ref: reference,
          version: 'NLT',
          key: process.env.NLT_API_KEY
        }
      }
    );

    if (response.data) {
      // Parse NLT response (adjust based on actual API response structure)
      return {
        text: response.data.text || response.data.passage,
        reference: response.data.reference || reference
      };
    } else {
      throw new Error('Verse not found in NLT translation');
    }
  } catch (error) {
    throw new Error(`NLT API error: ${error.message}`);
  }
}

/**
 * Fetch KJV translation via free Bible API
 */
async function fetchKJV(reference) {
  try {
    const parsed = parseReference(reference);

    // Using api.bible or similar free KJV API
    // Alternative: https://bible-api.com (free, no auth required)
    const response = await axios.get(
      `https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`
    );

    if (response.data) {
      return {
        text: response.data.text,
        reference: response.data.reference,
        verses: response.data.verses
      };
    } else {
      throw new Error('Verse not found in KJV translation');
    }
  } catch (error) {
    throw new Error(`KJV API error: ${error.message}`);
  }
}

/**
 * Parse Bible reference into components
 * Example: "John 3:16" => { book: "John", chapter: 3, verse: 16 }
 */
function parseReference(reference) {
  const regex = /^(\d?\s?[A-Za-z]+)\s+(\d+):(\d+)$/;
  const match = reference.match(regex);

  if (!match) {
    throw new Error('Invalid reference format. Use format: "John 3:16"');
  }

  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verse: parseInt(match[3], 10)
  };
}

module.exports = router;
