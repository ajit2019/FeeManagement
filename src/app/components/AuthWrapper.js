'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const username = localStorage.getItem('username');
      const isLoginPage = pathname === '/';

      if (!username) {
        if (!isLoginPage) {
          router.replace('/');
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      } else {
        if (isLoginPage) {
          router.replace('/dashboard');
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not authorized (redirecting), render loading/empty to prevent flashing contents
  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Redirecting...</p>
        </div>
      </div>
    );
  }

  return children;
}
