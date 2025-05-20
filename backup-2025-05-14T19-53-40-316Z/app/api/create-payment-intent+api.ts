import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { productId, shippingDetails } = await request.json();

    // Get product details from Supabase
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('price, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response('Product not found', { status: 404 });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(product.price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        productId,
        productName: product.name,
        shippingAddress: JSON.stringify(shippingDetails),
      },
    });

    return Response.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return new Response('Error creating payment intent', { status: 500 });
  }
}