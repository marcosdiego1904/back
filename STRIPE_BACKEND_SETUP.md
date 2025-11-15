# Stripe Backend Setup Instructions

This file contains the backend code you need to add to your `back/` repository to enable Stripe subscriptions.

## Step 1: Install Stripe Package

In your backend repository (`back/`), run:
```bash
npm install stripe
```

## Step 2: Add Environment Variables

Add these to your `.env` file in the backend:
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

Get these keys from: https://dashboard.stripe.com/test/apikeys

## Step 3: Create Stripe Routes File

Create a new file `back/routes/stripe.js`:

```javascript
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Middleware to verify JWT token (use your existing auth middleware)
const authenticateToken = require('../middleware/auth'); // Adjust path as needed

// Get Stripe publishable key
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// Create a checkout session for subscription
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { priceId, userId, userEmail } = req.body;

    // Create or retrieve Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId.toString()
        }
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions?canceled=true`,
      metadata: {
        userId: userId.toString()
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's subscription status
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email; // From JWT token

    // Find customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      return res.json({
        hasSubscription: false,
        subscriptions: []
      });
    }

    const customer = customers.data[0];

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });

    res.json({
      hasSubscription: subscriptions.data.length > 0,
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        plan: {
          name: sub.items.data[0].price.nickname || 'Subscription',
          amount: sub.items.data[0].price.unit_amount / 100,
          currency: sub.items.data[0].price.currency,
          interval: sub.items.data[0].price.recurring.interval
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    // Cancel at period end (so user can use it until billing cycle ends)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resume subscription
router.post('/resume-subscription', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a customer portal session
router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;

    // Find customer
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'No customer found' });
    }

    const customer = customers.data[0];

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint to handle Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
      const subscriptionCreated = event.data.object;
      console.log('Subscription created:', subscriptionCreated.id);
      // Update your database here
      break;

    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object;
      console.log('Subscription updated:', subscriptionUpdated.id);
      // Update your database here
      break;

    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object;
      console.log('Subscription deleted:', subscriptionDeleted.id);
      // Update your database here
      break;

    case 'invoice.paid':
      const invoicePaid = event.data.object;
      console.log('Invoice paid:', invoicePaid.id);
      // Update your database here
      break;

    case 'invoice.payment_failed':
      const invoiceFailed = event.data.object;
      console.log('Invoice payment failed:', invoiceFailed.id);
      // Handle failed payment - notify user
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
```

## Step 4: Register Routes in server.js

In your `back/server.js`, add:

```javascript
// Add this with your other route imports
const stripeRoutes = require('./routes/stripe');

// Add this with your other route registrations (after body parser middleware)
app.use('/api/stripe', stripeRoutes);

// IMPORTANT: For the webhook endpoint, you need to add the raw body parser BEFORE your other middleware
// Add this BEFORE app.use(express.json()):
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
```

## Step 5: Create Subscription Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Create your subscription tiers (example):
   - **Basic Plan**: $9.99/month
   - **Pro Plan**: $19.99/month
   - **Premium Plan**: $29.99/month

4. Copy the Price IDs (they start with `price_`) - you'll need these in the frontend

## Step 6: Set up Webhooks

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://your-backend-url.com/api/stripe/webhook`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

## Step 7: Database Schema (Optional)

Consider adding a subscriptions table to track user subscriptions:

```sql
CREATE TABLE subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50),
  plan_name VARCHAR(100),
  current_period_end DATETIME,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Testing

1. Use Stripe test mode with test card: `4242 4242 4242 4242`
2. Use any future expiry date and any CVC
3. Test the webhook locally with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```

## Notes

- The code above uses your existing authentication middleware
- Make sure CORS is configured to allow requests from your frontend
- Update `FRONTEND_URL` in your backend `.env` to match your deployed frontend URL
- Keep all Stripe keys secure and never commit them to git
