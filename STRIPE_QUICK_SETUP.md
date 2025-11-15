# Quick Stripe Setup Guide

## ✅ What's Already Done

1. **Frontend Updated** - Your Subscriptions page now uses the real Price ID
2. **Stripe Account** - You have test mode enabled with Basic Plan created
3. **API Keys** - You have your publishable and secret keys

---

## 🎯 Next Steps - Backend Setup

### Step 1: Navigate to Your Backend Repository

Open a new terminal and navigate to your backend directory (wherever your `back/` folder is located).

### Step 2: Install Stripe Package

```bash
npm install stripe
```

### Step 3: Add Environment Variables

Add these to your backend `.env` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Webhook Secret (we'll add this later after setting up webhooks)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### Step 4: Create the Stripe Routes File

1. In your backend, create a new file: `back/routes/stripe.js`
2. Copy the entire contents from the file: `BACKEND_STRIPE_ROUTES.js` (in this frontend repo)
3. Paste it into `back/routes/stripe.js`

### Step 5: Update the Auth Middleware Path

In `back/routes/stripe.js`, find this line (around line 13):

```javascript
const authenticateToken = require('../middleware/auth');
```

Update the path to match your actual auth middleware location. For example:
- If your auth middleware is at `back/middleware/authenticate.js`, use: `'../middleware/authenticate'`
- If it's at `back/utils/auth.js`, use: `'../utils/auth'`

### Step 6: Register Routes in Your Backend Server

Open your `back/server.js` (or `app.js` or `index.js` - whatever your main file is).

**IMPORTANT: Add in this specific order:**

```javascript
// 1. At the top with other imports
const stripeRoutes = require('./routes/stripe');

// 2. BEFORE your body parser middleware (express.json())
//    Add this line BEFORE app.use(express.json())
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// 3. Your existing body parser
app.use(express.json());

// 4. AFTER body parser, register the stripe routes
app.use('/api/stripe', stripeRoutes);
```

**Example of correct order:**

```javascript
const express = require('express');
const app = express();
const stripeRoutes = require('./routes/stripe'); // 1. Import

// 2. Webhook route FIRST (needs raw body)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// 3. Then body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Your other routes
app.use('/api/stripe', stripeRoutes);
app.use('/api/auth', authRoutes);
// ... other routes
```

### Step 7: Start Your Backend

```bash
npm run dev
# or
npm start
```

Verify you see no errors when the server starts.

---

## 🧪 Testing the Integration

### Test Without Webhooks First

1. Start your backend server
2. Start your frontend: `npm run dev`
3. Navigate to http://localhost:5173/subscriptions
4. Click "Subscribe Now"
5. You should be redirected to Stripe Checkout

### Test Cards (Stripe Test Mode)

Use these test card numbers:

- **Success:** `4242 4242 4242 4242`
- **Declined:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

For all cards:
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Test the Flow

1. Click "Subscribe Now" on the Basic Plan
2. Enter test card `4242 4242 4242 4242`
3. Complete checkout
4. You should be redirected back to `/subscriptions?success=true`
5. You should see a success message

---

## 🪝 Setting Up Webhooks (For Development)

Webhooks allow Stripe to notify your backend about subscription events (payments, cancellations, etc.).

### Option A: Stripe CLI (Recommended for Development)

1. **Install Stripe CLI:**
   - **macOS:** `brew install stripe/stripe-cli/stripe`
   - **Windows:** Download from https://github.com/stripe/stripe-cli/releases
   - **Linux:** Download from same link

2. **Login:**
   ```bash
   stripe login
   ```
   This will open your browser to authorize.

3. **Forward Webhooks:**
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```

4. **Copy the Webhook Secret:**
   The CLI will output something like:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
   ```

5. **Update .env:**
   Add the secret to your backend `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

6. **Restart Backend Server**

### Option B: Skip Webhooks for Now

You can test subscriptions without webhooks - they're mainly for:
- Tracking subscription lifecycle events
- Handling failed payments
- Updating your database automatically

The subscription functionality will work without webhooks, but you won't get automatic updates about payment failures, cancellations, etc.

---

## ✅ Verification Checklist

After completing the setup, verify:

- [ ] Backend runs without errors
- [ ] Can access `/subscriptions` page on frontend
- [ ] Clicking "Subscribe Now" redirects to Stripe Checkout
- [ ] Can complete test payment with `4242 4242 4242 4242`
- [ ] After payment, redirected back to app with success message
- [ ] Can see active subscription in "Your Active Subscriptions"
- [ ] "Manage Billing" button opens Stripe Customer Portal
- [ ] Can cancel subscription (it should say "cancels at end of period")
- [ ] Can resume canceled subscription

---

## 🚨 Troubleshooting

### "Cannot GET /api/stripe/config"
- Make sure backend is running
- Check that routes are registered correctly in server.js
- Verify the route path matches: `/api/stripe`

### "Webhook signature verification failed"
- Make sure `STRIPE_WEBHOOK_SECRET` is set in .env
- Restart backend after adding the secret
- If using Stripe CLI, make sure it's running: `stripe listen --forward-to localhost:3001/api/stripe/webhook`

### CORS Errors
- Make sure your backend has CORS enabled for `http://localhost:5173`
- Check your backend's CORS configuration

### "No customer found" when clicking "Manage Billing"
- You need to complete at least one checkout first
- This creates a Stripe customer linked to your email

---

## 🎉 What's Next?

Once everything is working in test mode:

1. **Add More Plans** (Optional)
   - Create Pro and Premium plans in Stripe
   - Add their Price IDs to the frontend

2. **Database Integration** (Optional)
   - Store subscription data in your MySQL database
   - Update webhook handlers to save subscription events

3. **Feature Gating** (Optional)
   - Restrict certain features to subscribers only
   - Add subscription checks in your routes

4. **Go Live**
   - Switch to live mode in Stripe
   - Create live products
   - Update environment variables with live keys
   - Set up production webhooks

---

## 📞 Need Help?

If you run into issues:

1. Check backend terminal for errors
2. Check browser console for frontend errors
3. Check Stripe Dashboard > Developers > Logs for API errors
4. Check Stripe Dashboard > Webhooks for webhook delivery status

Let me know what error you're seeing and I'll help debug!
