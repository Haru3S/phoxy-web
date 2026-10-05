import type {
  APIRoute,
} from 'astro';

import {
  getSecret,
} from 'astro:env/server';

import Stripe from 'stripe';

export const prerender = false;

function jsonResponse(
  body: object,
  status = 200
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type':
          'application/json',
        'Cache-Control':
          'no-store',
      },
    }
  );
}

export const POST: APIRoute =
  async ({ request }) => {
    const stripeSecretKey =
      getSecret(
        'STRIPE_SECRET_KEY'
      );

    const webhookSecret =
      getSecret(
        'STRIPE_WEBHOOK_SECRET'
      );

    if (
      !stripeSecretKey ||
      !webhookSecret
    ) {
      console.error(
        'Stripe webhook environment variables are not configured.'
      );

      return jsonResponse(
        {
          error:
            'Webhook service is unavailable.',
        },
        500
      );
    }

    const signature =
      request.headers.get(
        'stripe-signature'
      );

    if (!signature) {
      console.warn(
        'Stripe webhook request did not include a signature.'
      );

      return jsonResponse(
        {
          error:
            'Missing Stripe signature.',
        },
        400
      );
    }

    const rawBody =
      await request.text();

    const stripe =
      new Stripe(
        stripeSecretKey
      );

    let event:
      Stripe.Event;

    try {
      event =
        stripe.webhooks
          .constructEvent(
            rawBody,
            signature,
            webhookSecret
          );
    } catch (error) {
      console.error(
        'Stripe webhook signature verification failed.',
        error
      );

      return jsonResponse(
        {
          error:
            'Invalid Stripe signature.',
        },
        400
      );
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session =
          event.data.object;

        const displayName =
          session.metadata
            ?.supporter_name ??
          'Anonymous';

        const anonymous =
          session.metadata
            ?.supporter_anonymous ===
          'true';

        const amountTotal =
          session.amount_total;

        const currency =
          session.currency;

        const paymentStatus =
          session.payment_status;

        console.log(
          'Verified Stripe Checkout payment:',
          {
            eventId:
              event.id,

            sessionId:
              session.id,

            displayName,

            anonymous,

            amountTotal,

            currency,

            paymentStatus,
          }
        );

        break;
      }

      default: {
        console.log(
          `Ignoring Stripe event: ${event.type}`
        );
      }
    }

    return jsonResponse({
      received: true,
    });
  };