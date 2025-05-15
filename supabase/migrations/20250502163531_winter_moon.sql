/*
  # Add increment_view_count function
  
  1. New Functions
    - `increment_view_count`: Increments the view_count for a post
      - Parameter: post_id (uuid)
      - Returns: void
      - Updates the view_count column in the posts table
      - Includes security definer to ensure it can be called by any authenticated user
  
  2. Security
    - Function is marked as SECURITY DEFINER to run with elevated privileges
    - Access is restricted to authenticated users through GRANT
*/

-- Create the function to increment post view counts
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = post_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO authenticated;