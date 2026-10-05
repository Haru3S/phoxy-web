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

import {
  insertContribution,
} from '../../../lib/support/contributionRepository';

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

        if (
          session.payment_status !==
          'paid'
        ) {
          console.warn(
            'Ignoring completed Stripe Checkout session without paid status.',
            {
              eventId:
                event.id,

              sessionId:
                session.id,

              paymentStatus:
                session.payment_status,
            }
          );

          break;
        }

        if (
          session.currency !==
          'usd'
        ) {
          console.error(
            'Stripe Checkout session used an unexpected currency.',
            {
              eventId:
                event.id,

              sessionId:
                session.id,

              currency:
                session.currency,
            }
          );

          return jsonResponse(
            {
              error:
                'Unexpected payment currency.',
            },
            400
          );
        }

        const amountTotal =
          session.amount_total;

        if (
          amountTotal === null ||
          !Number.isSafeInteger(
            amountTotal
          ) ||
          amountTotal <= 0
        ) {
          console.error(
            'Stripe Checkout session has an invalid payment amount.',
            {
              eventId:
                event.id,

              sessionId:
                session.id,

              amountTotal,
            }
          );

          return jsonResponse(
            {
              error:
                'Invalid payment amount.',
            },
            400
          );
        }

        const requestedAnonymous =
          session.metadata
            ?.supporter_anonymous ===
          'true';

        const submittedDisplayName =
          session.metadata
            ?.supporter_name ??
          '';

        let displayName:
          string | null =
          null;

        let normalizedDisplayName:
          string | null =
          null;

        let anonymous =
          true;

        let moderationStatus:
          'approved' |
          'rejected' |
          'pending' =
          'approved';

        let moderationReason:
          'hate' |
          'extremism' |
          'harassment' |
          'threat' |
          'impersonation' |
          'political_advocacy' |
          'other' |
          null =
          null;

        if (!requestedAnonymous) {
          const validation =
            validateDisplayName(
              submittedDisplayName
            );

          if (validation.valid) {
            const moderation =
              moderateDisplayName(
                validation.displayName
              );

            moderationStatus =
              moderation.status;

            moderationReason =
              moderation.reason;

            if (
              moderation.status ===
              'approved'
            ) {
              displayName =
                validation.displayName;

              normalizedDisplayName =
                validation.displayName
                  .toLowerCase();

              anonymous =
                false;
            }
          }
        }

        try {
          const result =
            await insertContribution({
              displayName,

              normalizedDisplayName,

              anonymous,

              amountUsdCents:
                amountTotal,

              source:
                'stripe',

              asset:
                'usd',

              nativeAmount:
                null,

              supportedAt:
                new Date(
                  event.created *
                    1000
                ),

              moderationStatus,

              moderationReason,

              stripeEventId:
                event.id,

              stripeSessionId:
                session.id,
            });

          if (!result.inserted) {
            console.log(
              'Stripe contribution already exists in PHXF-DB.',
              {
                eventId:
                  event.id,

                sessionId:
                  session.id,
              }
            );

            break;
          }

          console.log(
            'Verified Stripe contribution stored in PHXF-DB:',
            {
              contributionId:
                result.id,

              eventId:
                event.id,

              sessionId:
                session.id,

              displayName:
                displayName ??
                'Anonymous',

              anonymous,

              amountTotal,

              currency:
                session.currency,
            }
          );
        } catch (error) {
          console.error(
            'Failed to store verified Stripe contribution in PHXF-DB.',
            error
          );

          return jsonResponse(
            {
              error:
                'Failed to persist contribution.',
            },
            500
          );
        }

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