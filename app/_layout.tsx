import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { BlockingProvider } from '@/context/BlockingContext';

function AppContent() {
  useFrameworkReady();
  const { loading } = useAuth();
  const { theme } = useTheme();
  
  if (loading) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  return (
    <ThemeProvider>
      <AuthProvider>
        <BlockingProvider>
          <AppContent />
        </BlockingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}