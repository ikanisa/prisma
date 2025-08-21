// Authentication hook - placeholder for Supabase integration
import { useState, useEffect } from 'react';
import { useAppStore, User } from '@/stores/mock-data';

export interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
}

export function useAuth(): AuthState {
  const { currentUser, setCurrentUser, users } = useAppStore();
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    // Placeholder: In real app, this would call Supabase auth
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = users.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
    } else {
      throw new Error('Invalid credentials');
    }
    setLoading(false);
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    // Placeholder: In real app, this would call Supabase auth
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser: User = {
      id: Math.random().toString(),
      email,
      name,
      createdAt: new Date().toISOString()
    };
    setCurrentUser(newUser);
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    // Placeholder: In real app, this would call Supabase auth
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser(null);
    setLoading(false);
  };

  const sendMagicLink = async (email: string) => {
    setLoading(true);
    // Placeholder: In real app, this would call Supabase auth
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  return {
    user: currentUser,
    loading,
    signIn,
    signUp,
    signOut,
    sendMagicLink
  };
}