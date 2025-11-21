# Security Audit Report

**Date:** 2025-11-21
**Auditor:** Claude Code Security Analysis
**Target:** Backend Application (Node.js/Express)
**Severity Scale:** CRITICAL | HIGH | MEDIUM | LOW | INFO

---

## Executive Summary

This security audit identified **13 vulnerabilities** across the application:
- **2 CRITICAL** issues requiring immediate action
- **4 HIGH** severity issues
- **4 MEDIUM** severity issues
- **3 LOW** severity issues

**Most Urgent:** Production secrets have been committed to git and are exposed in repository history.

---

## CRITICAL SEVERITY FINDINGS

### 1. Secrets Committed to Git Repository

**Severity:** CRITICAL
**Location:** `.env` file in git history
**CVSS Score:** 9.8

**Description:**
The `.env` file containing production secrets has been committed to the git repository and exists in the commit history. This exposes:

- **MySQL Database URL** with full credentials: `mysql://root:cLytbcVXOiloQxifsSqXyvrvyeNvIhSV@crossover.proxy.rlwy.net:14951/railway`
- **Database Password:** `cLytbcVXOiloQxifsSqXyvrvyeNvIhSV`
- **JWT Secret:** `3ab38dda4c23b0ae1b004bd4ecfdb4fa68c4127085df5fbd797e4301ea61c8cfe1156c3594d21d912adfb3fd4f`

**Evidence:**
```bash
$ git ls-files | grep .env
.env

$ git log --oneline --all -- .env
b3117de up2
d8157ab hola
32d10ae up2
55d2ab9 ui
be496ab back up5
```

**Impact:**
- Anyone with repository access can obtain production database credentials
- Database can be accessed, modified, or destroyed
- JWT secret exposure allows forging authentication tokens
- Complete authentication bypass possible

**Remediation:**
1. **IMMEDIATELY** rotate ALL exposed credentials:
   - Generate new MySQL password
   - Generate new JWT_SECRET
   - Update Railway environment variables
2. Remove `.env` from git tracking:
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from tracking"
   ```
3. Use git-filter-repo or BFG Repo-Cleaner to purge history:
   ```bash
   git filter-repo --path .env --invert-paths
   ```
4. Force push to overwrite remote history (coordinate with team)
5. Consider the repository compromised if it's ever been public

---

### 2. Critical Dependency Vulnerability (form-data)

**Severity:** CRITICAL
**Location:** `node_modules/form-data`
**CVE:** GHSA-fjxv-7rqg-78g4
**CVSS Score:** Critical

**Description:**
The `form-data` package (version 4.0.0 - 4.0.3) uses an unsafe random function for choosing multipart form boundaries, making it predictable.

**Impact:**
- Request boundary prediction
- Potential request smuggling attacks
- Data manipulation in multipart uploads

**Remediation:**
```bash
npm update axios  # Updates form-data as a dependency
npm audit fix
```

---

## HIGH SEVERITY FINDINGS

### 3. IDOR Vulnerability in Subscription Management

**Severity:** HIGH
**Location:** `routes/stripe.js:138-163, 166-189`
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

**Description:**
The `/cancel-subscription` and `/resume-subscription` endpoints accept `subscriptionId` from the request body without verifying the authenticated user owns that subscription.

**Vulnerable Code:**
```javascript
// routes/stripe.js:138-149
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  const { subscriptionId } = req.body;
  // No verification that req.user owns this subscription!
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
});
```

**Impact:**
- Any authenticated user can cancel ANY user's subscription
- Any authenticated user can resume ANY user's subscription
- Financial impact and service disruption

**Remediation:**
```javascript
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  const { subscriptionId } = req.body;
  const userEmail = req.user.email;

  // Verify subscription belongs to user
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customer = await stripe.customers.retrieve(subscription.customer);

  if (customer.email !== userEmail) {
    return res.status(403).json({ error: 'Not authorized to modify this subscription' });
  }

  // Proceed with cancellation
});
```

---

### 4. Missing Rate Limiting

**Severity:** HIGH
**Location:** Application-wide
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Description:**
The application has no rate limiting implemented on any endpoints, including authentication.

**Impact:**
- Brute force attacks on login endpoint
- Credential stuffing attacks
- API abuse and DoS
- Resource exhaustion

**Remediation:**
```javascript
const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

---

### 5. Axios DoS Vulnerability

**Severity:** HIGH
**Location:** `node_modules/axios`
**CVE:** GHSA-4hjh-wcwx-xvwj
**CVSS Score:** 7.5

**Description:**
Axios versions 1.0.0 - 1.11.0 are vulnerable to denial of service attacks due to lack of data size checking.

**Impact:**
- Application crash through malformed responses
- Denial of service

**Remediation:**
```bash
npm install axios@latest
```

---

### 6. Unvalidated User ID in Checkout Session

**Severity:** HIGH
**Location:** `routes/stripe.js:31-87`
**CWE:** CWE-639

**Description:**
The `/create-checkout-session` endpoint accepts `userId` and `userEmail` from request body without validating they match the authenticated user.

**Vulnerable Code:**
```javascript
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { priceId, userId, userEmail } = req.body;
  // userId/userEmail from body, not from authenticated token!
});
```

**Impact:**
- User can create checkout sessions for other users
- Billing associated with wrong accounts

**Remediation:**
```javascript
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { priceId } = req.body;
  // Use authenticated user data, not request body
  const userId = req.user.userId;
  const userEmail = req.user.email;
});
```

---

## MEDIUM SEVERITY FINDINGS

### 7. Missing Security Headers (No Helmet)

**Severity:** MEDIUM
**Location:** `server.js`
**CWE:** CWE-693 (Protection Mechanism Failure)

**Description:**
The application does not use `helmet` middleware to set security headers.

**Missing Headers:**
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Strict-Transport-Security`
- `X-XSS-Protection`
- `Content-Security-Policy`

**Remediation:**
```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

### 8. No CSRF Protection

**Severity:** MEDIUM
**Location:** Application-wide
**CWE:** CWE-352

**Description:**
The application lacks CSRF token validation. While JWT authentication provides some protection, state-changing operations should have CSRF protection.

**Remediation:**
```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Apply to state-changing routes
app.post('/api/user/memorized-verses', authenticate, csrfProtection, ...);
```

---

### 9. SSL Certificate Validation Disabled

**Severity:** MEDIUM
**Location:** `db-railway.js:23, 71`
**CWE:** CWE-295 (Improper Certificate Validation)

**Description:**
Database connections have SSL certificate validation disabled (`rejectUnauthorized: false`), making them susceptible to man-in-the-middle attacks.

**Vulnerable Code:**
```javascript
ssl: {
  rejectUnauthorized: false  // Dangerous!
}
```

**Remediation:**
Enable strict SSL validation in production:
```javascript
ssl: {
  rejectUnauthorized: process.env.NODE_ENV === 'production'
}
```

---

### 10. Verbose Error Messages in Development

**Severity:** MEDIUM
**Location:** `server.js:219-223, 233-238`
**CWE:** CWE-209 (Information Exposure Through Error Messages)

**Description:**
Error responses include detailed error messages when `NODE_ENV=development`, but this check could be bypassed or misconfigured.

**Remediation:**
Ensure production always hides internal errors and add additional safeguards:
```javascript
const isProduction = process.env.NODE_ENV === 'production';
// Never log full error details to client
res.status(500).json({
  error: 'Internal server error',
  requestId: req.id // For support correlation
});
```

---

## LOW SEVERITY FINDINGS

### 11. brace-expansion ReDoS

**Severity:** LOW
**Location:** `node_modules/brace-expansion`
**CVE:** GHSA-v6h2-p8h4-qcjw
**CVSS Score:** 3.1

**Description:**
Regular expression denial of service vulnerability in brace-expansion package.

**Remediation:**
```bash
npm audit fix
```

---

### 12. Long JWT Token Expiry

**Severity:** LOW
**Location:** `server.js:145-149, 191-195`
**CWE:** CWE-613 (Insufficient Session Expiration)

**Description:**
JWT tokens have a 7-day expiration, which may be too long for a security-sensitive application.

**Current Code:**
```javascript
const token = jwt.sign(
  { userId, username, email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }  // 7 days is long
);
```

**Remediation:**
Consider shorter expiry with refresh token mechanism:
```javascript
{ expiresIn: '1h' }  // Short-lived access token
// Implement refresh token rotation
```

---

### 13. Potential Log Injection

**Severity:** LOW
**Location:** `server.js:178`
**CWE:** CWE-117 (Improper Output Neutralization for Logs)

**Description:**
User-controlled email is logged directly, potentially allowing log injection.

**Vulnerable Code:**
```javascript
console.error(`Attempted login for email: ${email}...`);
```

**Remediation:**
Sanitize logged values:
```javascript
console.error(`Attempted login for email: ${email.replace(/[\r\n]/g, '')}...`);
```

---

## INFORMATIONAL FINDINGS

### Positive Security Measures Observed

1. **Input Validation:** Comprehensive validation system in `src/utils/validation.js`
2. **Parameterized Queries:** SQL queries use parameterized statements (protection against SQL injection)
3. **Password Hashing:** bcrypt with 10 salt rounds
4. **JWT Authentication:** Proper token verification middleware
5. **CORS Configuration:** Explicit allowlist of origins
6. **Stripe Webhook Verification:** Proper signature verification

---

## Remediation Priority

| Priority | Finding | Effort |
|----------|---------|--------|
| P0 | Rotate ALL secrets, purge git history | High |
| P0 | Fix IDOR in subscription endpoints | Low |
| P1 | Update vulnerable dependencies | Low |
| P1 | Add rate limiting | Medium |
| P2 | Add helmet middleware | Low |
| P2 | Enable SSL certificate validation | Low |
| P3 | Add CSRF protection | Medium |
| P3 | Reduce JWT expiry, add refresh tokens | Medium |

---

## Summary

The most critical issue is the exposure of production secrets in git history. **All credentials should be rotated immediately** before proceeding with other fixes. The IDOR vulnerabilities in subscription management should be addressed urgently as they allow any authenticated user to manipulate other users' subscriptions.

The application has good foundational security practices (input validation, parameterized queries, password hashing), but lacks several layers of defense-in-depth (rate limiting, security headers, CSRF protection).
