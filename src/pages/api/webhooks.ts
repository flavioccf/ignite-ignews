// stripe listen --forward-to http://localhost:3000/api/webhooks

import { NextApiRequest, NextApiResponse } from "next"
import { Readable } from "stream"
import Stripe from "stripe";
import { stripe } from "../../services/stripe";
import { saveSubscription } from "./_lib/manageSubscription";

async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(
      typeof chunk === "string" ? Buffer.from(chunk) : chunk
    )
  }
  return Buffer.concat(chunks)
}

export const config = {
  api: {
    bodyParser: false
  }
}

const relevantEvents = {
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  CUSTOMER_SUBSCRIPTIONS_CREATED: 'customer.subscriptions.created',
  CUSTOMER_SUBSCRIPTIONS_UPDATED :'customer.subscriptions.updated',
  CUSTOMER_SUBSCRIPTIONS_DELETED: 'customer.subscriptions.deleted'
}

const relevantEventsSet = new Set(Object.values(relevantEvents))

const webhook = async (req: NextApiRequest, res: NextApiResponse) => {
  if(req.method === 'POST') {
    const buf = await buffer(req)
    const secret = req.headers['stripe-signature']

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(buf, secret, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      return res.status(400).send(`Webhook error: ${error.message}`)
    }

    const { type } = event

    if(relevantEventsSet.has(type)) {
      try {
        switch (type) {
          case relevantEvents.CUSTOMER_SUBSCRIPTIONS_CREATED:
          case relevantEvents.CUSTOMER_SUBSCRIPTIONS_UPDATED:
          case relevantEvents.CUSTOMER_SUBSCRIPTIONS_DELETED:
            const subscription = event.data.object as Stripe.Subscription
            await saveSubscription(
              subscription.id,
              subscription.customer.toString(),
              type === relevantEvents.CUSTOMER_SUBSCRIPTIONS_CREATED
            );
            break;
          case relevantEvents.CHECKOUT_SESSION_COMPLETED:
            const checkoutSession = event.data.object as Stripe.Checkout.Session
            await saveSubscription(
              checkoutSession.subscription.toString(),
              checkoutSession.customer.toString(),
              true
            )
            break;
          default:
            throw new Error(`Unhandled event. ${type}`) 
        }
      } catch (err) {
        return res.json({ error: 'Webhook handler failed', message: err.message })
      }
    }
    res.json({received: true})
  } else {
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method not Allowed')
  }
}

export default webhook