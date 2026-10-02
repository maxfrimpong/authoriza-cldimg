import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export const Login = () => {
  const { login, user, logoUrl, copyrightText } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    
    try {
      // The login function in AppContext is async, so we must await it
      // to get the actual boolean result instead of a Promise object (which is always truthy)
      const success = await login(email, password);
      
      if (success) {
        setError('');
        // Navigation is handled by the useEffect above upon user state update
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark dark:bg-gray-900 flex flex-col items-center justify-between p-4 transition-colors duration-200">
      {/* Main Content Wrapper to center form */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
          <div className="mb-8 text-center flex flex-col items-center">
            <h1 className="text-4xl font-bold text-white mb-2">
                SendREQ
            </h1>
            <p className="text-brand-teal font-medium">YOTA Payment Request System</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md transition-colors duration-200">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Sign In</h2>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal dark:bg-gray-700 dark:text-white"
                  placeholder="you@yotaweb.org"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} className="text-red-500 dark:text-red-400 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-teal hover:bg-[#008f7a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
      </div>

      {/* Copyright Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400" dangerouslySetInnerHTML={{ __html: copyrightText }}></p>
      </footer>
    </div>
  );
};