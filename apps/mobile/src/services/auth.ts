import { GoogleSignin } from '@react-native-google-signin/google-signin';
import api from './api';
import { useAuthStore } from '../store/auth';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../constants/config';
import { User, AuthTokens } from '../types';

// Initialize Google Sign In
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true,
});

export const authService = {
  async signInWithGoogle(): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data) {
        throw new Error('Google Sign In failed');
      }

      const { data } = await api.post('/auth/google', {
        googleId: userInfo.data.user.id,
        email: userInfo.data.user.email,
        name: userInfo.data.user.name,
        profileImage: userInfo.data.user.photo,
      });

      return {
        user: data.user,
        tokens: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        },
      };
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  },

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = useAuthStore.getState().refreshToken;
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  },

  async switchUserType(targetType: 'customer' | 'contractor'): Promise<User> {
    const { data } = await api.post('/users/switch-type', { targetType });
    return data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get('/users/me');
    return data;
  },

  async updateProfile(updates: { name?: string; phone?: string }): Promise<User> {
    const { data } = await api.patch('/users/me', updates);
    return data;
  },

  async deleteAccount(): Promise<void> {
    await api.delete('/users/me');
  },
};
