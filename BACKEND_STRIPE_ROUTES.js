// ============================================================================
// STRIPE ROUTES FOR BACKEND
// ============================================================================
// Save this file as: back/routes/stripe.js
//
// This file contains all the Stripe subscription endpoints your backend needs.
// Follow the instructions at the bottom to integrate it into your backend.
// ============================================================================

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ============================================================================
// IMPORTANT: Replace this with your actual auth middleware path
// ============================================================================
const authenticateToken = require('../middleware/auth'); // Adjust path as needed

// ============================================================================
// PUBLIC ENDPOINT: Get Stripe publishable key
// ============================================================================
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// ============================================================================
// PROTECTED ENDPOINT: Create a checkout session for subscription
// ============================================================================
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { priceId, userId, userEmail } = req.body;

    // Validate required fields
    if (!priceId || !userId || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields: priceId, userId, userEmail'
      });
    }

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

// ============================================================================
// PROTECTED ENDPOINT: Get user's subscription status
// ============================================================================
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
          name: sub.items.data[0].price.nickname || 'Basic Plan',
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

// ============================================================================
// PROTECTED ENDPOINT: Cancel subscription (at end of billing period)
// ============================================================================
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscriptionId' });
    }

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

// ============================================================================
// PROTECTED ENDPOINT: Resume a canceled subscription
// ============================================================================
router.post('/resume-subscription', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscriptionId' });
    }

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

// ============================================================================
// PROTECTED ENDPOINT: Create a customer portal session
// ============================================================================
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

// ============================================================================
// PUBLIC ENDPOINT: Webhook endpoint to handle Stripe events
// ============================================================================
// IMPORTANT: This endpoint needs raw body, not JSON parsed body
// See integration instructions below
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
      // TODO: Update your database here if needed
      // Example: Save subscription to database
      break;

    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object;
      console.log('Subscription updated:', subscriptionUpdated.id);
      // TODO: Update your database here if needed
      break;

    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object;
      console.log('Subscription deleted:', subscriptionDeleted.id);
      // TODO: Update your database here if needed
      break;

    case 'invoice.paid':
      const invoicePaid = event.data.object;
      console.log('Invoice paid:', invoicePaid.id);
      // TODO: Grant/extend access in your database
      break;

    case 'invoice.payment_failed':
      const invoiceFailed = event.data.object;
      console.log('Invoice payment failed:', invoiceFailed.id);
      // TODO: Send notification to user about failed payment
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;

// ============================================================================
// INTEGRATION INSTRUCTIONS
// ============================================================================
/*

1. INSTALL STRIPE PACKAGE
   Run in your backend directory:
   npm install stripe

2. ADD ENVIRONMENT VARIABLES
   Add to your backend .env file:

   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   FRONTEND_URL=http://localhost:5173

3. REGISTER ROUTES IN server.js
   Add these lines to your server.js:

   // Add with your other route imports
   const stripeRoutes = require('./routes/stripe');

   // IMPORTANT: Add webhook route BEFORE body parser middleware
   // This is because Stripe webhooks need raw body, not JSON parsed
   app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

   // Add with your other route registrations (AFTER body parser)
   app.use('/api/stripe', stripeRoutes);

4. UPDATE AUTH MIDDLEWARE PATH
   In this file (line 13), update the path to your auth middleware:
   const authenticateToken = require('../middleware/auth');

5. TEST LOCALLY
   - Start your backend server
   - The frontend will automatically connect to http://localhost:3001/api/stripe
   - Use test card: 4242 4242 4242 4242

6. SET UP WEBHOOK (see separate instructions below)

*/

// ============================================================================
// WEBHOOK SETUP INSTRUCTIONS
// ============================================================================
/*

FOR LOCAL DEVELOPMENT:

1. Install Stripe CLI:
   - macOS: brew install stripe/stripe-cli/stripe
   - Windows: Download from https://github.com/stripe/stripe-cli/releases

2. Login to Stripe CLI:
   stripe login

3. Forward webhooks to your local server:
   stripe listen --forward-to localhost:3001/api/stripe/webhook

4. Copy the webhook signing secret (starts with whsec_) and add to .env:
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx


FOR PRODUCTION:

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: https://api.lamptomyfeet.co/api/stripe/webhook
4. Select events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.paid
   - invoice.payment_failed
5. Copy the signing secret and add to your production environment variables

*/
