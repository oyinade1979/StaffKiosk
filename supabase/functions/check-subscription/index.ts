import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Price ID → plan label mapping
const PRICE_PLAN_MAP: Record<string, string> = {
  "price_1To01MP9fDU1WUDlTcQMCYy8": "monthly",
  "price_1To01bP9fDU1WUDl6qRAczWc": "yearly",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header not provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false, plan: null, subscription_end: null, trialing: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });

    // Find active or trialing subscription
    const activeSub = subscriptions.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (!activeSub) {
      logStep("No active/trialing subscription");
      return new Response(JSON.stringify({ subscribed: false, plan: null, subscription_end: null, trialing: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const priceId = activeSub.items.data[0]?.price?.id ?? "";
    const plan = PRICE_PLAN_MAP[priceId] ?? "monthly";
    const subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
    const trialing = activeSub.status === "trialing";
    const trialEnd = activeSub.trial_end
      ? new Date(activeSub.trial_end * 1000).toISOString()
      : null;

    logStep("Subscription found", { plan, subscriptionEnd, trialing });

    return new Response(
      JSON.stringify({ subscribed: true, plan, subscription_end: subscriptionEnd, trialing, trial_end: trialEnd }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("Error", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
