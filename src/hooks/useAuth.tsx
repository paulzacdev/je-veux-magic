import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Language } from '@/lib/i18n';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  preferred_language: Language;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (data) setProfile(data as Profile);
      if (error) console.error('Profile fetch error:', error.message);
    } catch (err) {
      console.error('Profile fetch exception:', err);
    }
  }, []);

  useEffect(() => {
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'SIGNED_OUT') {
        // Clear everything on sign out
        setProfile(null);
        queryClient.clear();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Reset profile before fetching new one to avoid showing stale data
          setProfile(null);
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => fetchProfile(session.user.id), 0);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, queryClient]);

  const setLanguage = async (lang: Language) => {
    if (!session?.user) return;
    await supabase
      .from('profiles')
      .update({ preferred_language: lang })
      .eq('user_id', session.user.id);
    setProfile(prev => prev ? { ...prev, preferred_language: lang } : prev);
  };

  const signOut = async () => {
    setProfile(null);
    queryClient.clear();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      language: (profile?.preferred_language as Language) ?? 'fr',
      setLanguage,
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
