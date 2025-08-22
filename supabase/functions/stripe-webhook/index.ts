// supabase/functions/stripe-webhook/index.ts
// Webhook Stripe para Supabase Edge (sem Stripe SDK). 100% compatível com Deno Edge.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ------------------------------ ENV ------------------------------ */
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE         = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET em falta');
if (!SUPABASE_URL)         throw new Error('SUPABASE_URL em falta');
if (!SERVICE_ROLE)         throw new Error('SUPABASE_SERVICE_ROLE_KEY em falta');

const db = createClient(SUPABASE_URL, SERVICE_ROLE);

/* ------------------------------ HELPERS ------------------------------ */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// converte ArrayBuffer -> hex
function toHex(ab: ArrayBuffer) {
  const bytes = new Uint8Array(ab);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// Valida a assinatura do Stripe (HMAC-SHA256)
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string, toleranceSec = 300) {
  // Header: t=timestamp,v1=signature[,v1=...]
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k, v];
    }),
  );

  const t = Number(parts['t']);
  if (!t || !Number.isFinite(t)) throw new Error('Signature: timestamp ausente');

  // Proteção contra replays
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - t) > toleranceSec) throw new Error('Signature: timestamp fora de tolerância');

  // Vários v1 podem existir
  const v1Values = sigHeader
    .split(',')
    .filter((s) => s.startsWith('v1='))
    .map((s) => s.slice(3));

  if (!v1Values.length) throw new Error('Signature: v1 ausente');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signedPayload = `${t}.${payload}`;
  const signatureBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expected = toHex(signatureBuf);

  // válido se QUALQUER v1 coincidir (Stripe pode enviar múltiplos)
  const valid = v1Values.some((v1) => constantTimeEqual(v1, expected));
  if (!valid) throw new Error('Signature: inválida');
}

async function markOrderPaid(
  orderId: string,
  opts: { payment_intent?: string | null; customer_id?: string | null },
) {
  const { data: order, error: selErr } = await db
    .from('orders')
    .select('id,user_id,status,horas,amount_cents')
    .eq('id', orderId)
    .single();

  if (selErr || !order) {
    console.error('[stripe-webhook] order não encontrada', orderId, selErr);
    return;
  }

  if (order.status === 'paid') return; // idempotência básica

  const { error: updErr } = await db
    .from('orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent: opts.payment_intent ?? null,
      stripe_customer_id: opts.customer_id ?? null,
    })
    .eq('id', orderId);

  if (updErr) {
    console.error('[stripe-webhook] falha ao atualizar order->paid', updErr);
    return;
  }

  const { error: opErr } = await db.from('balance_operations').insert({
    user_id: order.user_id,
    type: 'credit',
    hours_delta: order.horas,
    amount_cents: order.amount_cents,
    source: 'order',
    order_id: order.id,
    note: 'Stripe payment (webhook)',
  });

  if (opErr) console.error('[stripe-webhook] falha ao inserir balance op', opErr);
}

/* ------------------------------ HANDLER ------------------------------ */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: true });

  const sig = req.headers.get('Stripe-Signature') ?? '';
  const payload = await req.text();

  try {
    await verifyStripeSignature(payload, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] assinatura inválida:', (err as Error)?.message);
    return json({ error: 'Invalid signature' }, 400);
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  try {
    switch (event?.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data?.object ?? {};
        const paymentStatus = session.payment_status; // 'paid' | 'unpaid'
        let orderId: string | null = session.metadata?.order_id ?? null;

        // fallback via stripe_session_id
        if (!orderId && session.id) {
          const { data: found } = await db
            .from('orders')
            .select('id')
            .eq('stripe_session_id', session.id)
            .maybeSingle();
          orderId = found?.id ?? null;
        }

        if (!orderId) {
          console.warn('[stripe-webhook] sem orderId em session', session.id);
          break;
        }

        if (paymentStatus === 'paid') {
          await markOrderPaid(orderId, {
            payment_intent: session.payment_intent ?? null,
            customer_id: session.customer ?? null,
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // fallback importante quando o session.completed não chega "paid"
        const pi = event.data?.object ?? {};
        let orderId: string | null = pi.metadata?.order_id ?? null;

        if (!orderId && pi.id) {
          const { data: found } = await db
            .from('orders')
            .select('id')
            .eq('stripe_payment_intent', pi.id)
            .maybeSingle();
          orderId = found?.id ?? null;
        }

        if (!orderId) {
          console.warn('[stripe-webhook] PI sem order mapeada', pi.id);
          break;
        }

        await markOrderPaid(orderId, {
          payment_intent: pi.id ?? null,
          customer_id: pi.customer ?? null,
        });
        break;
      }

      default:
        // outros eventos ignorados
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] erro handler', err);
    // devolvemos 200 para evitar reentregas infinitas por pequenos erros internos.
  }

  return json({ received: true });
});
