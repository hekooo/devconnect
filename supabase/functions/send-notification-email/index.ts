// Follow users will receive email notifications when they get new notifications
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  notification_type: string;
  entity_id: string;
  entity_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  notification_settings: {
    email_notifications: boolean;
    notification_types: {
      likes: boolean;
      comments: boolean;
      follows: boolean;
      mentions: boolean;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the notification ID from the request
    const { notificationId } = await req.json();
    
    if (!notificationId) {
      return new Response(
        JSON.stringify({ error: "Notification ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get the notification details
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .single();

    if (notificationError) {
      return new Response(
        JSON.stringify({ error: "Notification not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Get the user's email and notification settings
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id, notification_settings")
      .eq("id", notification.user_id)
      .single();

    if (userError) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Get the user's email from auth.users
    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(
      notification.user_id
    );

    if (authUserError || !authUser.user) {
      return new Response(
        JSON.stringify({ error: "Auth user not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const userEmail = authUser.user.email;
    const notificationSettings = userData.notification_settings || {
      email_notifications: true,
      notification_types: {
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
      },
    };

    // Check if email notifications are enabled for this user and notification type
    const emailEnabled = notificationSettings.email_notifications;
    const notificationType = notification.notification_type;
    const typeEnabled = notificationSettings.notification_types[notificationType as keyof typeof notificationSettings.notification_types];

    if (!emailEnabled || !typeEnabled) {
      return new Response(
        JSON.stringify({ message: "Email notifications disabled for this user or notification type" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get the actor's details
    const { data: actor, error: actorError } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", notification.actor_id)
      .single();

    if (actorError) {
      return new Response(
        JSON.stringify({ error: "Actor not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Construct the email content
    const actorName = actor.full_name || actor.username;
    const notificationUrl = getNotificationUrl(notification);
    
    // In a real implementation, you would send an email here using a service like SendGrid, AWS SES, etc.
    // For this example, we'll just log the email content
    console.log(`Sending email to ${userEmail}:`);
    console.log(`Subject: New notification from DevConnect`);
    console.log(`Body: ${actorName} ${notification.message}. View it here: ${notificationUrl}`);

    // Return a success response
    return new Response(
      JSON.stringify({ 
        message: "Email notification sent successfully",
        recipient: userEmail,
        subject: "New notification from DevConnect",
        body: `${actorName} ${notification.message}. View it here: ${notificationUrl}`
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

// Helper function to get the notification URL
function getNotificationUrl(notification: Notification): string {
  const baseUrl = "https://devconnect-1.netlify.app";
  
  switch (notification.entity_type) {
    case "post":
      return `${baseUrl}/posts/${notification.entity_id}`;
    case "comment":
      return `${baseUrl}/posts/${notification.entity_id}#comments`;
    case "profile":
    case "follow":
      return `${baseUrl}/profile/${notification.actor_id}`;
    default:
      return `${baseUrl}/notifications`;
  }
}