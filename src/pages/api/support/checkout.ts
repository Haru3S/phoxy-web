import type {
  APIRoute,
} from 'astro';

import {
  getSecret,
} from 'astro:env/server';

import Stripe from 'stripe';

import {
  validateDisplayName,
} from '../../../lib/support/displayNameValidation';

import {
  moderateDisplayName,
} from '../../../lib/support/displayNameModeration';

export const prerender = false;

const MIN_SUPPORT_CENTS = 100;
const MAX_SUPPORT_CENTS = 100_000;

type CheckoutRequest = {
  amount?: unknown;
  displayName?: unknown;
  anonymous?: unknown;
};

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

function dollarsToCents(
  value: unknown
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  const cents =
    Math.round(value * 100);

  if (
    cents < MIN_SUPPORT_CENTS ||
    cents > MAX_SUPPORT_CENTS
  ) {
    return null;
  }

  return cents;
}

export const GET: APIRoute =
  async ({ request }) => {
    const stripeSecretKey =
      getSecret(
        'STRIPE_SECRET_KEY'
      );

    if (!stripeSecretKey) {
      console.error(
        'STRIPE_SECRET_KEY is not configured.'
      );

      return jsonResponse(
        {
          error:
            'Payment service is unavailable.',
        },
        500
      );
    }

    const requestUrl =
      new URL(
        request.url
      );

    const sessionId =
      requestUrl.searchParams.get(
        'session_id'
      );

    if (
      !sessionId ||
      !sessionId.startsWith(
        'cs_'
      )
    ) {
      return jsonResponse(
        {
          error:
            'Invalid checkout session.',
        },
        400
      );
    }

    const stripe =
      new Stripe(
        stripeSecretKey
      );

    try {
      const session =
        await stripe
          .checkout
          .sessions
          .retrieve(
            sessionId
          );

      if (
        session.payment_status !==
          'paid' ||
        session.currency !==
          'usd' ||
        session.amount_total ===
          null
      ) {
        return jsonResponse(
          {
            verified: false,
            error:
              'Payment has not been confirmed.',
          },
          409
        );
      }

      return jsonResponse({
        verified: true,
        amount:
          session.amount_total /
          100,
      });
    } catch (error) {
      console.error(
        'Stripe Checkout Session verification failed.',
        error
      );

      return jsonResponse(
        {
          verified: false,
          error:
            'Payment could not be confirmed.',
        },
        400
      );
    }
  };

export const POST: APIRoute =
  async ({ request }) => {
    const stripeSecretKey =
      getSecret(
        'STRIPE_SECRET_KEY'
      );

    if (!stripeSecretKey) {
      console.error(
        'STRIPE_SECRET_KEY is not configured.'
      );

      return jsonResponse(
        {
          error:
            'Payment service is unavailable.',
        },
        500
      );
    }

    let body: CheckoutRequest;

    try {
      body =
        await request.json();
    } catch {
      return jsonResponse(
        {
          error:
            'Invalid request body.',
        },
        400
      );
    }

    const amountCents =
      dollarsToCents(
        body.amount
      );

    if (amountCents === null) {
      return jsonResponse(
        {
          error:
            'Invalid support amount.',
        },
        400
      );
    }

    if (
      typeof body.anonymous !==
      'boolean'
    ) {
      return jsonResponse(
        {
          error:
            'Invalid supporter identity.',
        },
        400
      );
    }

    let displayName =
      'Anonymous';

    if (!body.anonymous) {
      if (
        typeof body.displayName !==
        'string'
      ) {
        return jsonResponse(
          {
            error:
              'Invalid display name.',
          },
          400
        );
      }

      const validation =
        validateDisplayName(
          body.displayName
        );

      if (
        validation.valid ===
        false
      ) {
        return jsonResponse(
          {
            error:
              'Invalid display name.',
          },
          400
        );
      }

      const moderation =
        moderateDisplayName(
          validation.displayName
        );

      if (
        moderation.status !==
        'approved'
      ) {
        return jsonResponse(
          {
            error:
              'That public display name cannot be used.',
          },
          400
        );
      }

      displayName =
        validation.displayName;
    }

    const stripe =
      new Stripe(
        stripeSecretKey
      );

    const requestUrl =
      new URL(
        request.url
      );

    const origin =
      requestUrl.origin;

    try {
      const session =
        await stripe
          .checkout
          .sessions
          .create({
            mode: 'payment',

            line_items: [
              {
                price_data: {
                  currency: 'usd',

                  product_data: {
                    name:
                      'Support Phoxy Fox',

                    description:
                      'Optional support for independent creative work.',
                  },

                  unit_amount:
                    amountCents,
                },

                quantity: 1,
              },
            ],

            metadata: {
              supporter_name:
                displayName,

              supporter_anonymous:
                body.anonymous
                  ? 'true'
                  : 'false',
            },

            success_url:
              `${origin}/support?payment=success&session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
              `${origin}/support?payment=cancelled`,
          });

      if (!session.url) {
        console.error(
          'Stripe Checkout Session did not return a URL.',
          session.id
        );

        return jsonResponse(
          {
            error:
              'Could not start checkout.',
          },
          500
        );
      }

      return jsonResponse({
        checkoutUrl:
          session.url,
      });
    } catch (error) {
      console.error(
        'Stripe Checkout Session creation failed.',
        error
      );

      return jsonResponse(
        {
          error:
            'Could not start checkout.',
        },
        500
      );
    }
  };