import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services';
import { setGlobalRefreshTokenFunction } from '../services/api';
import { socketService } from '../services/socketService';
import type { User } from '../types';
import SuccessModal from '../components/common/SuccessModal'; // Adjust path as needed

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthState: (
    token: string,
    user: User,
    refreshToken?: string
  ) => Promise<void>;
  updateUser: (user: User) => void;
  token: string | null;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@icoach_token';
const REFRESH_TOKEN_KEY = '@icoach_refresh_token';
const USER_KEY = '@icoach_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Success Modal state
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalData, setSuccessModalData] = useState({
    title: '',
    message: '',
    onPrimaryPress: () => {}
  });

  // =========================================
  // Load stored auth on mount
  // =========================================
  const loadStoredAuth = useCallback(async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  // =========================================
  // Update user data
  // =========================================
  const updateUser = useCallback((userData: User) => {
    setUser(userData);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)).catch((error) => {
      console.error('Error updating stored user:', error);
    });
  }, []);

  // =========================================
  // Login
  // =========================================
  const login = useCallback(
    async (userData: User, authToken: string, refreshToken?: string) => {
      try {
        setUser(userData);
        setToken(authToken);

        await AsyncStorage.setItem(TOKEN_KEY, authToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

        if (refreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          console.log('✅ Refresh token stored successfully in login');
        } else {
          console.warn('⚠️ No refresh token provided to login function');
        }
      } catch (error) {
        console.error('Error saving auth data:', error);
        throw error;
      }
    },
    []
  );

  // =========================================
  // Set auth state
  // =========================================
  const setAuthState = useCallback(
    async (authToken: string, userData: User, refreshToken?: string) => {
      try {
        setUser(userData);
        setToken(authToken);

        await AsyncStorage.setItem(TOKEN_KEY, authToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

        if (refreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          console.log('✅ Refresh token stored successfully');
        } else {
          console.warn('⚠️ No refresh token provided to setAuthState');
        }
      } catch (error) {
        console.error('Error setting auth state:', error);
        throw error;
      }
    },
    []
  );

  // =========================================
  // Logout
  // =========================================
  const logout = useCallback(async () => {
    // 1. Fire and forget the API call so the UI doesn't hang waiting for the network
    if (token) {
      authService.logout(token).catch(error => {
        console.error('Logout API error:', error);
      });
    }

    // 2. Disconnect realtime services
    socketService.disconnect();

    // 3. Clear local state IMMEDIATELY to trigger the instant jump to WelcomeScreen
    setUser(null);
    setToken(null);

    // 4. Remove storage tokens without awaiting
    AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]).catch(err => {
      console.error('Failed to clear storage:', err);
    });
  }, [token]);

  // =========================================
  // Refresh access token
  // =========================================
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('🔄 Attempting to refresh access token...');

      const storedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

      if (!storedRefreshToken) {
        console.error('❌ No refresh token available in storage');
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('🔑 Stored keys:', allKeys);
        return null;
      }

      console.log('✅ Refresh token found, calling API...');
      const response = await authService.refreshToken(storedRefreshToken);

      if (response.success && response.data?.accessToken) {
        const newAccessToken = response.data.accessToken;

        setToken(newAccessToken);
        await AsyncStorage.setItem(TOKEN_KEY, newAccessToken);

        if (response.data.refreshToken) {
          await AsyncStorage.setItem(
            REFRESH_TOKEN_KEY,
            response.data.refreshToken
          );
          console.log('✅ Refresh token rotated and stored successfully');
        }

        return newAccessToken;
      }

      console.warn('⚠️ Refresh response did not contain a valid access token');
      return null;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);

      // لو refresh فشل، نعمل logout كامل
      await logout();
      return null;
    }
  }, [logout]);

  // =========================================
  // Register refresh function globally for api.ts
  // =========================================
  useEffect(() => {
    setGlobalRefreshTokenFunction(refreshAccessToken);
  }, [refreshAccessToken]);

  // =========================================
  // Handle email verification event from socket
  // =========================================
  const handleEmailVerified = useCallback(
    (data: {
      success: boolean;
      message: string;
      user: { id: string | number; email: string; isEmailVerified: boolean; firstName?: string };
    }) => {
      console.log('\n========== AUTH CONTEXT: EMAIL VERIFIED HANDLER ==========');
      console.log('📧 [AUTH] Received data:', JSON.stringify(data, null, 2));
      console.log('📧 [AUTH] Current user state:', JSON.stringify(user, null, 2));
      console.log('📧 [AUTH] Current user isEmailVerified:', user?.isEmailVerified);
      console.log('📧 [AUTH] Data success:', data.success);
      console.log('📧 [AUTH] User exists:', !!user);

      if (data.success && user) {
        console.log('📧 [AUTH] ✅ Conditions met! Updating user state...');

        const updatedUser = { ...user, isEmailVerified: true };
        console.log('📧 [AUTH] Updated user object:', JSON.stringify(updatedUser, null, 2));

        setUser(updatedUser);

        AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
          .then(() => console.log('📧 [AUTH] AsyncStorage updated successfully'))
          .catch((err) =>
            console.error('📧 [AUTH] AsyncStorage update failed:', err)
          );

        // Show success modal instead of Alert
        setSuccessModalData({
          title: '✅ Email Verified!',
          message: data.message || 'Your email has been verified successfully. You now have full access to all features.',
          onPrimaryPress: () => {
            setSuccessModalVisible(false);
            // Optional: Add any navigation or additional logic here
          }
        });
        setSuccessModalVisible(true);

        console.log('========================================================\n');
      } else {
        console.log('📧 [AUTH] ⚠️ Conditions NOT met!');
        console.log('📧 [AUTH] data.success:', data.success);
        console.log('📧 [AUTH] user:', !!user);
        console.log('========================================================\n');
      }
    },
    [user]
  );

  // =========================================
  // Socket connection management
  // =========================================
  useEffect(() => {
    console.log('\n========== AUTH CONTEXT: SOCKET CONNECTION EFFECT ==========');
    console.log('🔌 [AUTH SOCKET] user?.id:', user?.id);
    console.log('🔌 [AUTH SOCKET] user?.isEmailVerified:', user?.isEmailVerified);
    console.log(
      '🔌 [AUTH SOCKET] Should connect:',
      !!(user?.id && !user?.isEmailVerified)
    );

    if (user?.id && !user?.isEmailVerified) {
      console.log('🔌 [AUTH SOCKET] ✅ Connecting socket for unverified user:', user.id);

      socketService.connect(String(user.id), {
        onEmailVerified: handleEmailVerified,
        onConnected: () => {
          console.log('✅ [AUTH SOCKET] Socket connected for real-time updates');
          console.log('✅ [AUTH SOCKET] Handler registered for user:', user.id);
        },
        onDisconnected: (reason) =>
          console.log('🔌 [AUTH SOCKET] Socket disconnected:', reason),
      });
    } else {
      console.log('🔌 [AUTH SOCKET] Disconnecting socket (no user or already verified)');
      socketService.disconnect();
    }

    console.log('===========================================================\n');

    return () => {
      socketService.disconnect();
    };
  }, [user?.id, user?.isEmailVerified, handleEmailVerified]);

  return (
    <>
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: !!user && !!token,
          isLoading,
          login,
          logout,
          setAuthState,
          updateUser,
          token,
          refreshAccessToken,
        }}
      >
        {children}
      </AuthContext.Provider>
      
      {/* Success Modal */}
      <SuccessModal
        visible={successModalVisible}
        title={successModalData.title}
        message={successModalData.message}
        primaryButtonText="Great!"
        onPrimaryPress={successModalData.onPrimaryPress}
        iconName="checkmark-circle"
      />
    </>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};