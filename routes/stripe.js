const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const db = require('../db'); // Import database connection

// Authentication middleware (inline version based on server.js authenticate)
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

// PUBLIC ENDPOINT: Get Stripe publishable key
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// PROTECTED ENDPOINT: Create a checkout session for subscription
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    // SECURITY: Use authenticated user data from JWT token, not request body
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Validate required fields
    if (!priceId) {
      return res.status(400).json({
        error: 'Missing required field: priceId'
      });
    }

    if (!userId || !userEmail) {
      return res.status(401).json({
        error: 'Invalid authentication token'
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

    // Use URLs from frontend if provided, otherwise fallback to environment variable
    const finalSuccessUrl = successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions?canceled=true`;

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
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
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

// PROTECTED ENDPOINT: Get user's subscription status
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

// PROTECTED ENDPOINT: Cancel subscription (at end of billing period)
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userEmail = req.user.email;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscriptionId' });
    }

    // SECURITY: Verify the subscription belongs to the authenticated user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customer = await stripe.customers.retrieve(subscription.customer);

    if (customer.email !== userEmail) {
      console.error(`SECURITY: User ${userEmail} attempted to cancel subscription belonging to ${customer.email}`);
      return res.status(403).json({ error: 'Not authorized to modify this subscription' });
    }

    // Cancel at period end (so user can use it until billing cycle ends)
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    res.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
      }
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// PROTECTED ENDPOINT: Resume a canceled subscription
router.post('/resume-subscription', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userEmail = req.user.email;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscriptionId' });
    }

    // SECURITY: Verify the subscription belongs to the authenticated user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customer = await stripe.customers.retrieve(subscription.customer);

    if (customer.email !== userEmail) {
      console.error(`SECURITY: User ${userEmail} attempted to resume subscription belonging to ${customer.email}`);
      return res.status(403).json({ error: 'Not authorized to modify this subscription' });
    }

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });

    res.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end
      }
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// PROTECTED ENDPOINT: Create a customer portal session
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

// PUBLIC ENDPOINT: Webhook endpoint to handle Stripe events
// IMPORTANT: This endpoint needs raw body, not JSON parsed body
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
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      console.log('Subscription created/updated:', subscription.id);

      // Activate premium if subscription is active or trialing
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer);
          const userId = customer.metadata.userId;

          if (userId) {
            await db.query(
              'UPDATE users SET is_premium = 1 WHERE id = ?',
              [userId]
            );
            console.log(`✅ Premium activated for user ${userId}`);
          } else {
            console.error('No userId found in customer metadata');
          }
        } catch (error) {
          console.error('Error activating premium:', error);
        }
      }
      break;

    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object;
      console.log('Subscription deleted:', subscriptionDeleted.id);

      // Deactivate premium
      try {
        const customer = await stripe.customers.retrieve(subscriptionDeleted.customer);
        const userId = customer.metadata.userId;

        if (userId) {
          await db.query(
            'UPDATE users SET is_premium = 0 WHERE id = ?',
            [userId]
          );
          console.log(`❌ Premium deactivated for user ${userId}`);
        } else {
          console.error('No userId found in customer metadata');
        }
      } catch (error) {
        console.error('Error deactivating premium:', error);
      }
      break;

    case 'invoice.paid':
      const invoicePaid = event.data.object;
      console.log('Invoice paid:', invoicePaid.id);

      // Ensure premium is active when invoice is paid
      if (invoicePaid.subscription) {
        try {
          const customer = await stripe.customers.retrieve(invoicePaid.customer);
          const userId = customer.metadata.userId;

          if (userId) {
            await db.query(
              'UPDATE users SET is_premium = 1 WHERE id = ?',
              [userId]
            );
            console.log(`✅ Premium confirmed for user ${userId} (invoice paid)`);
          }
        } catch (error) {
          console.error('Error confirming premium on invoice payment:', error);
        }
      }
      break;

    case 'invoice.payment_failed':
      const invoiceFailed = event.data.object;
      console.log('Invoice payment failed:', invoiceFailed.id);

      // Optionally deactivate premium on payment failure
      try {
        const customer = await stripe.customers.retrieve(invoiceFailed.customer);
        const userId = customer.metadata.userId;

        if (userId) {
          await db.query(
            'UPDATE users SET is_premium = 0 WHERE id = ?',
            [userId]
          );
          console.log(`⚠️ Premium deactivated for user ${userId} (payment failed)`);
        }
      } catch (error) {
        console.error('Error handling failed payment:', error);
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
