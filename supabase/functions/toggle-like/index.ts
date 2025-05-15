import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the post ID and user ID from the request
    const { postId, userId } = await req.json();
    
    if (!postId || !userId) {
      return new Response(
        JSON.stringify({ error: "Post ID and User ID are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if the post exists
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: "Post not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Check if the user exists in the profiles table (not users table)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Check if the like already exists
    const { data: existingLike, error: likeError } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (likeError) {
      return new Response(
        JSON.stringify({ error: "Error checking like status" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    let result;
    if (existingLike) {
      // Unlike: Delete the existing like
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) {
        throw deleteError;
      }

      result = { action: "unliked" };
    } else {
      // Like: Create a new like
      const { data: newLike, error: insertError } = await supabase
        .from("likes")
        .insert({ post_id: postId, user_id: userId })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      result = { action: "liked", like: newLike };
    }

    // Get the updated like count
    const { count } = await supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    return new Response(
      JSON.stringify({ ...result, likeCount: count }),
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