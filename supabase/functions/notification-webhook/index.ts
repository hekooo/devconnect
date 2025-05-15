// This function handles webhook notifications from Supabase and sends emails
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Get the request body
    const body = await req.json();
    
    // Log the webhook payload for debugging
    console.log("Received webhook payload:", JSON.stringify(body));
    
    // Extract the notification data
    const { record, table } = body;
    
    if (table !== "notifications") {
      return new Response(
        JSON.stringify({ message: "Not a notification event" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // Call the send-notification-email function
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ notificationId: record.id }),
    });
    
    const emailResult = await emailResponse.json();
    
    return new Response(
      JSON.stringify({ 
        message: "Webhook processed successfully",
        emailResult 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});