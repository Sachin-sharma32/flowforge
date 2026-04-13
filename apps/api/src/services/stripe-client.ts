import StripeConstructor = require('stripe');
import { config } from '../config';

let stripeClient: unknown = null;

export function getStripeClient(): unknown {
  if (!stripeClient) {
    stripeClient = new StripeConstructor(config.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}
