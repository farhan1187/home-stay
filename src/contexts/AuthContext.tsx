import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth from real Supabase session
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        } catch (err) {
          console.error('Session retrieval error:', err);
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      if (mounted) setLoading(false);
    }

    init();

    // Listen to Supabase auth state changes
    let subscription: any = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, manager_homestays(homestay_id)')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          ...data,
          assigned_homestay_ids: (data.manager_homestays || []).map((mh: any) => mh.homestay_id),
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }

  const signIn = async (email: string, pass: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error(
          'Supabase is not configured. Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
        ),
      };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error(
          'Supabase is not configured. Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
        ),
      };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const role: UserRole = profile?.role || 'manager';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
