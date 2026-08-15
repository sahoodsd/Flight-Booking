import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../utils/stripeClient';
import * as bookingService from '../services/bookingService';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    // req.body must be the RAW buffer here, not JSON-parsed — see app.ts wiring below
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    // signature invalid = untrusted request, reject without touching any booking state
    return res.status(400).send('Webhook signature verification failed');
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    await bookingService.confirmBookingPayment(pi.id);
  } else if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    await bookingService.failBookingPayment(pi.id);
  }

  res.json({ received: true });
}