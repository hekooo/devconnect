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
        // The hash contains the access token and other OAuth data
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (!accessToken) {
          // Check for error in the URL
          const errorParam = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          if (errorParam) {
            throw new Error(errorDescription || 'Authentication failed');
          } else {
            // If no access token and no error, something else went wrong
            throw new Error('No access token found in the URL');
          }
        }

        // Exchange the access token for a session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (data.session) {
          addToast({
            type: 'success',
            message: 'Successfully authenticated with GitHub!',
          });
          navigate('/');
        } else {
          // If no session, try to set the session with the token
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });
          
          if (sessionError) throw sessionError;
          
          if (sessionData.session) {
            addToast({
              type: 'success',
              message: 'Successfully authenticated with GitHub!',
            });
            navigate('/');
          } else {
            throw new Error('Failed to establish session');
          }
        }
      } catch (err) {
        console.error('Error during auth callback:', err);
        setError(err instanceof Error ? err.message : 'Failed to complete authentication');
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