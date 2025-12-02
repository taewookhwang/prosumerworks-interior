import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;
