'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState('');

  useEffect(() => {
    setUsername(localStorage.getItem('username') || '');
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('username');
    router.replace('/');
  };

  // Hide header entirely on the login page
  if (pathname === '/') {
    return null;
  }

  const isDashboard = pathname === '/dashboard';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left section: Back button or Logo */}
          <div className="flex-1 flex items-center">
            {!isDashboard ? (
              <a
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 shadow-sm group"
              >
                <svg
                  className="w-5 h-5 mr-2 -ml-1 text-gray-500 group-hover:text-blue-600 transform group-hover:-translate-x-1 transition-transform duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                BACK TO DASHBOARD
              </a>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-900">Shivam Education</span>
              </div>
            )}
          </div>

          {/* Right section: User profile & Logout */}
          <div className="flex items-center space-x-4">
            {username && (
              <div className="hidden sm:flex items-center space-x-2 bg-gray-50 px-3.5 py-1.5 rounded-full border border-gray-150">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User: {username}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors duration-150 shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
