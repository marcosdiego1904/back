/**
 * Input Validation and Sanitization System
 * Protects against SQL injection, XSS, and malicious input
 */

// Email validation regex (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Username validation (alphanumeric, underscore, dash, 3-30 chars)
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

// Password validation (minimum 8 chars, at least 1 letter, 1 number)
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

/**
 * Sanitize string input to prevent XSS attacks
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/script/gi, '') // Remove script tags
    .trim();
}

/**
 * Validate and sanitize email
 */
function validateEmail(email) {
  const errors = [];
  
  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors, sanitized: '' };
  }
  
  if (typeof email !== 'string') {
    errors.push('Email must be a string');
    return { isValid: false, errors, sanitized: '' };
  }
  
  const sanitized = sanitizeString(email.toLowerCase());
  
  if (sanitized.length > 254) {
    errors.push('Email must be less than 254 characters');
  }
  
  if (!EMAIL_REGEX.test(sanitized)) {
    errors.push('Email format is invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate and sanitize username
 */
function validateUsername(username) {
  const errors = [];
  
  if (!username) {
    errors.push('Username is required');
    return { isValid: false, errors, sanitized: '' };
  }
  
  if (typeof username !== 'string') {
    errors.push('Username must be a string');
    return { isValid: false, errors, sanitized: '' };
  }
  
  const sanitized = sanitizeString(username);
  
  if (!USERNAME_REGEX.test(sanitized)) {
    errors.push('Username must be 3-30 characters, alphanumeric, underscore, or dash only');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (typeof password !== 'string') {
    errors.push('Password must be a string');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  if (!PASSWORD_REGEX.test(password)) {
    errors.push('Password must contain at least one letter and one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate numeric ID parameters
 */
function validateId(id, fieldName = 'ID') {
  const errors = [];
  
  if (id === undefined || id === null) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors, parsed: null };
  }
  
  const parsed = parseInt(id, 10);
  
  if (isNaN(parsed) || parsed < 1 || parsed > 2147483647) {
    errors.push(`${fieldName} must be a valid positive integer`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    parsed: errors.length === 0 ? parsed : null
  };
}

/**
 * Validate and sanitize verse text
 */
function validateVerseText(text, fieldName = 'Text', maxLength = 5000) {
  const errors = [];
  
  if (!text) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors, sanitized: '' };
  }
  
  if (typeof text !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return { isValid: false, errors, sanitized: '' };
  }
  
  const sanitized = sanitizeString(text);
  
  if (sanitized.length > maxLength) {
    errors.push(`${fieldName} must be less than ${maxLength} characters`);
  }
  
  if (sanitized.length < 1) {
    errors.push(`${fieldName} cannot be empty after sanitization`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate verse reference format
 */
function validateVerseReference(reference) {
  const errors = [];
  
  if (!reference) {
    errors.push('Verse reference is required');
    return { isValid: false, errors, sanitized: '' };
  }
  
  if (typeof reference !== 'string') {
    errors.push('Verse reference must be a string');
    return { isValid: false, errors, sanitized: '' };
  }
  
  const sanitized = sanitizeString(reference);
  
  if (sanitized.length > 50) {
    errors.push('Verse reference must be less than 50 characters');
  }
  
  // Basic format validation (Book Chapter:Verse)
  const referencePattern = /^[a-zA-Z0-9\s]+\s\d+:\d+(-\d+)?$/;
  if (!referencePattern.test(sanitized)) {
    errors.push('Verse reference format is invalid (expected: "Book Chapter:Verse")');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Comprehensive validation middleware factory
 */
function createValidationMiddleware(validationSchema) {
  return (req, res, next) => {
    const errors = [];
    const sanitizedData = {};
    
    for (const [field, validator] of Object.entries(validationSchema)) {
      const value = req.body[field] || req.params[field] || req.query[field];
      const result = validator(value);
      
      if (!result.isValid) {
        errors.push(...result.errors);
      } else {
        sanitizedData[field] = result.sanitized !== undefined ? result.sanitized : result.parsed;
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // Attach sanitized data to request
    req.sanitized = sanitizedData;
    next();
  };
}

module.exports = {
  validateEmail,
  validateUsername,
  validatePassword,
  validateId,
  validateVerseText,
  validateVerseReference,
  sanitizeString,
  createValidationMiddleware
}; 