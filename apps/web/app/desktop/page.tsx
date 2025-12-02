'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DesktopIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const token = await invoke('get_stored_token');
        
        if (token) {
          router.push('/client');
        } else {
          router.push('/desktop/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/desktop/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl" />
      </div>
    </div>
  );
}
