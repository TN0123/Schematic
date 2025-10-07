# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe for the freemium subscription model in your productivity app.

## Prerequisites

- A Stripe account (sign up at https://stripe.com)
- Access to your Stripe Dashboard

## Step 1: Get Your API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Copy your **Publishable key** (starts with `pk_test_` for test mode)
4. Add these to your `.env` file:
   ```
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```

## Step 2: Create a Product and Price

1. Go to https://dashboard.stripe.com/products
2. Click **+ Add product**
3. Fill in the product details:
   - **Name**: Premium Subscription (or your preferred name)
   - **Description**: Unlimited documents, notes, and 150 monthly premium AI requests
4. Under **Pricing**, set up your subscription:
   - **Pricing model**: Standard pricing
   - **Price**: Your desired monthly price (e.g., $9.99)
   - **Billing period**: Monthly
   - **Currency**: USD (or your preferred currency)
5. Click **Save product**
6. Copy the **Price ID** (starts with `price_`)
7. Add it to your `.env` file:
   ```
   NEXT_PUBLIC_STRIPE_PRICE_ID="price_..."
   ```

## Step 3: Set Up Webhooks

Webhooks allow Stripe to notify your app about subscription events (new subscriptions, cancellations, payment failures, etc.).

### For Local Development (using Stripe CLI):

1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`) from the terminal output
5. Add it to your `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

### For Production:

1. Go to https://dashboard.stripe.com/webhooks
2. Click **+ Add endpoint**
3. Set the **Endpoint URL** to: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your production `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

## Step 4: Configure Customer Portal

The customer portal allows users to manage their subscriptions (update payment methods, cancel subscription, etc.).

1. Go to https://dashboard.stripe.com/settings/billing/portal
2. Click **Activate test link** (for test mode)
3. Configure your portal settings:
   - **Product information**: Add your product name and description
   - **Features**: Enable "Cancel subscriptions" and "Update payment methods"
   - **Business information**: Add your business name, contact email, and support URL
4. Click **Save changes**

## Step 5: Test Your Integration

### Test the Checkout Flow:

1. Make sure your development server is running
2. Go to the Settings page (`/settings`)
3. Click **Upgrade to Premium**
4. You should be redirected to a Stripe Checkout page
5. Use Stripe test card: `4242 4242 4242 4242`
   - Use any future expiry date
   - Use any 3-digit CVC
   - Use any ZIP code
6. Complete the checkout
7. You should be redirected back to your app

### Test the Customer Portal:

1. After subscribing, go to Settings
2. Click **Manage Subscription**
3. You should be redirected to the Stripe Customer Portal
4. Test canceling or updating the subscription

### Test Webhooks:

With the Stripe CLI running (`stripe listen --forward-to ...`), complete a test subscription and watch the webhook events in the terminal.

## Subscription Limits

The app enforces the following limits:

### Free Tier:

- 10 documents maximum
- 10 notes maximum
- 10 premium AI requests per week

### Premium Tier ($9.99/month - or your set price):

- Unlimited documents
- Unlimited notes
- 150 premium AI requests per month

## Going Live

When you're ready to go live:

1. Switch to **Live mode** in your Stripe Dashboard
2. Update your `.env` with **live mode** API keys (start with `sk_live_` and `pk_live_`)
3. Set up **production webhooks** as described in Step 3
4. Test thoroughly with real payment methods (you can refund test charges)
5. Update `NEXT_PUBLIC_URL` in your `.env` to your production domain

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive keys
- In production, ensure your webhook endpoint uses HTTPS
- Stripe automatically verifies webhook signatures for security

## Troubleshooting

### Webhooks not working:

- Check that the Stripe CLI is running for local development
- Verify the webhook secret matches between Stripe and your `.env`
- Check the webhook endpoint URL is correct
- View webhook events in the Stripe Dashboard to see delivery status

### Subscription not activating:

- Check the browser console for errors
- Verify the price ID is correct
- Ensure webhooks are being received and processed
- Check your database for the user's subscription status

### Customer portal not showing:

- Verify the customer has an active subscription
- Check that the customer portal is activated in Stripe Dashboard
- Ensure the user has a `stripeCustomerId` in the database

## Support

For more information:

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Stripe Testing: https://stripe.com/docs/testing
