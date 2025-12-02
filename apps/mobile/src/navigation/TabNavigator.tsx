import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FeedScreen } from '../screens/FeedScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MyQuotesScreen } from '../screens/MyQuotesScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { AIChatScreen } from '../screens/ai/AIChatScreen';
import { SimulationScreen } from '../screens/simulation/SimulationScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator = () => {
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
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Simulation"
        component={SimulationScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'construct' : 'construct-outline'}
              size={24}
              color={focused ? '#2196F3' : color}
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
        name="MyQuotes"
        component={MyQuotesScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={24}
              color={color}
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
