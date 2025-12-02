import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MyPortfoliosScreen } from '../screens/contractor/MyPortfoliosScreen';
import { AIQuoteOffersScreen } from '../screens/contractor/AIQuoteOffersScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AIChatScreen } from '../screens/ai/AIChatScreen';

const Tab = createBottomTabNavigator();

export const ContractorTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#262626',
        tabBarInactiveTintColor: '#8e8e8e',
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: '#dbdbdb',
          backgroundColor: '#fafafa',
          height: 85,
          paddingBottom: 30,
        },
      }}>
      <Tab.Screen
        name="MyPortfolios"
        component={MyPortfoliosScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AIQuoteOffers"
        component={AIQuoteOffersScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'mail' : 'mail-outline'}
              size={24}
              color={focused ? '#FF9800' : color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'hardware-chip' : 'hardware-chip-outline'}
              size={24}
              color={focused ? '#FF9800' : color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
