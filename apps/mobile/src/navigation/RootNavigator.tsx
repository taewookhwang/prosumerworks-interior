import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/auth';
import { LoginScreen } from '../screens/LoginScreen';
import { UserTypeSelectScreen } from '../screens/UserTypeSelectScreen';
import { ContractorRegisterScreen } from '../screens/ContractorRegisterScreen';
import { PortfolioDetailScreen } from '../screens/PortfolioDetailScreen';
import { PortfolioCreateScreen } from '../screens/contractor/PortfolioCreateScreen';
import { PortfolioEditScreen } from '../screens/contractor/PortfolioEditScreen';
import { ContractorProfileEditScreen } from '../screens/contractor/ContractorProfileEditScreen';
import { ContractorDetailScreen } from '../screens/ContractorDetailScreen';
import { QuoteRequestScreen } from '../screens/QuoteRequestScreen';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { TabNavigator } from './TabNavigator';
import { ContractorTabNavigator } from './ContractorTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, user, setLoading } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [setLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // 로그인 안됨
  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // 로그인됨 but 유저타입 미선택 (첫 가입)
  // userType이 없거나 설정되지 않은 경우
  const needsUserTypeSelection = !user?.userType;

  if (needsUserTypeSelection) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="UserTypeSelect" component={UserTypeSelectScreen} />
      </Stack.Navigator>
    );
  }

  // 시공업자인 경우
  if (user?.userType === 'contractor') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ContractorTabs" component={ContractorTabNavigator} />
        <Stack.Screen
          name="PortfolioDetail"
          component={PortfolioDetailScreen}
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="PortfolioCreate"
          component={PortfolioCreateScreen}
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="PortfolioEdit"
          component={PortfolioEditScreen}
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="ChatRoom"
          component={ChatRoomScreen}
          options={{
            headerShown: true,
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="ProfileSettings"
          component={ProfileSettingsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ContractorProfileEdit"
          component={ContractorProfileEditScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    );
  }

  // 고객인 경우
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="PortfolioDetail"
        component={PortfolioDetailScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="ContractorRegister"
        component={ContractorRegisterScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ContractorDetail"
        component={ContractorDetailScreen}
        options={{
          headerShown: true,
          headerTitle: '업체 정보',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="QuoteRequest"
        component={QuoteRequestScreen}
        options={{
          headerShown: true,
          headerTitle: '견적 문의',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{
          headerShown: true,
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};
