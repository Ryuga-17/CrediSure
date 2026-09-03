"use client"
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('User is not authenticated, redirecting to signup...');
      router.push('/signup');
    }
  }, [isAuthenticated, loading, router]); 
  if (loading || !isAuthenticated) {
    return null;
  }

  return children;
}