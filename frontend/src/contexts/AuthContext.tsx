import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { storage } from '@/src/utils/storage';
import { useTranslation } from 'react-i18next';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  email: string;
  name: string;
  picture: string;
  language: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { i18n } = useTranslation();

  // Check existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Handle deep links (for mobile)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = async (event: { url: string }) => {
      await processAuthUrl(event.url);
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    // Check initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) processAuthUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle session_id on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const checkWebAuth = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      let sessionId = null;
      if (hash.includes('session_id=')) {
        sessionId = hash.split('session_id=')[1].split('&')[0];
      } else if (search.includes('session_id=')) {
        sessionId = new URLSearchParams(search).get('session_id');
      }

      if (sessionId) {
        await processSessionId(sessionId);
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    checkWebAuth();
  }, []);

  const checkSession = async () => {
    try {
      const storedToken = await (Platform.OS === 'web' 
        ? storage.getItem('auth_token', null)
        : storage.secureGet('auth_token', null));
      
      if (storedToken) {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setToken(storedToken);
          // Set language from user preference
          if (userData.language) {
            i18n.changeLanguage(userData.language);
          }
        } else {
          // Clear invalid token
          await clearAuth();
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const processAuthUrl = async (url: string) => {
    try {
      let sessionId = null;
      if (url.includes('session_id=')) {
        if (url.includes('#')) {
          sessionId = url.split('session_id=')[1].split('&')[0];
        } else {
          const urlObj = new URL(url);
          sessionId = urlObj.searchParams.get('session_id');
        }
      }

      if (sessionId) {
        await processSessionId(sessionId);
      }
    } catch (error) {
      console.error('Failed to process auth URL:', error);
    }
  };

  const processSessionId = async (sessionId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const userData = await response.json();
      
      // Get session token from backend (it should return it)
      // For now, we'll fetch it again
      const sessionResponse = await fetch(
        'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
        {
          headers: {
            'X-Session-ID': sessionId,
          },
        }
      );

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        const sessionToken = sessionData.session_token;

        // Store token
        if (Platform.OS === 'web') {
          await storage.setItem('auth_token', sessionToken);
        } else {
          await storage.secureSet('auth_token', sessionToken);
        }

        setToken(sessionToken);
        setUser(userData);
        
        // Set language from user preference
        if (userData.language) {
          i18n.changeLanguage(userData.language);
        }
      }
    } catch (error) {
      console.error('Failed to process session:', error);
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      let redirectUrl;
      
      if (Platform.OS === 'web') {
        redirectUrl = window.location.origin + '/';
      } else {
        redirectUrl = Linking.createURL('');
      }

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          await processAuthUrl(result.url);
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuth();
    }
  };

  const clearAuth = async () => {
    if (Platform.OS === 'web') {
      await storage.removeItem('auth_token');
    } else {
      await storage.secureRemove('auth_token');
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};
