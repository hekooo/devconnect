// src/contexts/UserProfileContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import supabase from '../lib/supabase';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  role: string;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Ref to hold realtime subscription
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    // If no user, clean up and exit
    if (!user?.id) {
      setProfile(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio, role')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchErr) throw fetchErr;
        
        if (!data) {
          console.log('Profile not found, creating new profile for user:', user.id);
          // Create a new profile if one doesn't exist
          const username = user.email?.split('@')[0] || `user_${Math.random().toString(36).substring(2, 10)}`;
          const newProfile = {
            id: user.id,
            username,
            full_name: user.user_metadata?.full_name || username,
            avatar_url: user.user_metadata?.avatar_url || null,
            bio: '',
            role: 'user'
          };
          
          const { data: createdProfile, error: createErr } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();
            
          if (createErr) throw createErr;
          
          if (!isCancelled) setProfile(createdProfile);
        } else {
          if (!isCancelled) setProfile(data);
        }
      } catch (err) {
        console.error('Error fetching/creating profile:', err);
        if (!isCancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();

    // Set up realtime subscription using the new channel API
    const channel = supabase.channel(`profiles:id=${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated via realtime:', payload.new);
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    // Store the channel reference
    subscriptionRef.current = channel;

    return () => {
      isCancelled = true;
      setIsLoading(false);
      // Cleanup subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const { data, error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id)
        .select();

      if (updateErr) throw updateErr;
      if (data && data.length > 0) {
        setProfile(data[0] as UserProfile);
      }
      return { error: null };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, role')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserProfileContext.Provider value={{ profile, isLoading, error, updateProfile, refreshProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}