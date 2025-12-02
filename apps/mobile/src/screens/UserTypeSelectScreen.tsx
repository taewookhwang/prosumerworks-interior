import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/auth';
import { api } from '../services/api';

export const UserTypeSelectScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, setUser } = useAuthStore();

  const handleSelectUserType = async (userType: 'customer' | 'contractor') => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/user-type', { userType });
      setUser({ ...user!, userType: response.data.userType });
    } catch (error: any) {
      Alert.alert('오류', error.message || '다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>어떤 서비스를 이용하시겠어요?</Text>
        <Text style={styles.subtitle}>
          나중에 마이페이지에서 변경할 수 있어요
        </Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelectUserType('customer')}
            disabled={isLoading}>
            <Text style={styles.optionEmoji}>🏠</Text>
            <Text style={styles.optionTitle}>인테리어를 찾고 있어요</Text>
            <Text style={styles.optionDescription}>
              시공 사례를 보고{'\n'}업체에 견적을 요청할 수 있어요
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelectUserType('contractor')}
            disabled={isLoading}>
            <Text style={styles.optionEmoji}>🔨</Text>
            <Text style={styles.optionTitle}>시공업체입니다</Text>
            <Text style={styles.optionDescription}>
              포트폴리오를 등록하고{'\n'}고객을 만날 수 있어요
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <ActivityIndicator
            size="large"
            color="#2196F3"
            style={styles.loading}
          />
        )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  optionEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loading: {
    marginTop: 24,
  },
});
