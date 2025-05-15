import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import supabase from '../lib/supabase';

export function useEmailNotifications() {
  const { user } = useAuth();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user) {
      fetchEmailSettings();
    }
  }, [user]);

  const fetchEmailSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', user?.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (data && data.notification_settings) {
        setEmailEnabled(data.notification_settings.email_notifications);
      }
    } catch (err) {
      console.error('Error fetching email settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch email settings'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEmailNotifications = async () => {
    if (!user) return { error: new Error('User not authenticated') };
    
    try {
      // Get current notification settings
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update email_notifications in the settings
      const updatedSettings = {
        ...(data?.notification_settings || {}),
        email_notifications: !emailEnabled
      };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ notification_settings: updatedSettings })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setEmailEnabled(!emailEnabled);
      return { error: null };
    } catch (err) {
      console.error('Error updating email settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to update email settings'));
      return { error: err };
    }
  };

  const updateNotificationTypes = async (types: Record<string, boolean>) => {
    if (!user) return { error: new Error('User not authenticated') };
    
    try {
      // Get current notification settings
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update notification types in the settings
      const updatedSettings = {
        ...(data?.notification_settings || {}),
        notification_types: {
          ...(data?.notification_settings?.notification_types || {}),
          ...types
        }
      };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ notification_settings: updatedSettings })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      return { error: null };
    } catch (err) {
      console.error('Error updating notification types:', err);
      setError(err instanceof Error ? err : new Error('Failed to update notification types'));
      return { error: err };
    }
  };

  return {
    emailEnabled,
    isLoading,
    error,
    toggleEmailNotifications,
    updateNotificationTypes
  };
}