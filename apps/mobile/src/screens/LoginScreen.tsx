import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/auth';

export const LoginScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { user, tokens } = await authService.signInWithGoogle();
      login(user, tokens);
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message || '다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Interior</Text>
          <Text style={styles.subtitle}>인테리어의 모든 것</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#333" />
            ) : (
              <>
                <Image
                  source={{
                    uri: 'https://www.google.com/favicon.ico',
                  }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Google로 계속하기</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          계속 진행하면 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
