import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current URL
        const url = window.location.href;
        console.log("Auth callback URL:", url);
        
        // Check for errors in the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (errorParam) {
          setError(errorDescription || 'Authentication failed');
          addToast({
            type: 'error',
            message: errorDescription || 'Authentication failed',
          });
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // The session should be automatically set by Supabase Auth
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          // Create or update the user profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();
            
          if (!existingProfile) {
            // Create new profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                username: session.user.user_metadata.preferred_username || session.user.user_metadata.user_name,
                full_name: session.user.user_metadata.full_name || session.user.user_metadata.name,
                avatar_url: session.user.user_metadata.avatar_url,
                created_at: new Date().toISOString(),
              });
              
            if (profileError) {
              console.error("Error creating profile:", profileError);
            }
          }
          
          addToast({
            type: 'success',
            message: 'Successfully authenticated!',
          });
          navigate('/');
        } else {
          // If no session, redirect to login
          navigate('/login');
        }
      } catch (err) {
        console.error('Error during auth callback:', err);
        setError('Failed to complete authentication');
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to complete authentication',
        });
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, addToast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {error ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-error-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <p>Redirecting you back to login...</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
          <h2 className="text-2xl font-bold mb-4">Completing authentication...</h2>
          <p className="text-gray-600 dark:text-gray-400">Please wait while we log you in.</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;