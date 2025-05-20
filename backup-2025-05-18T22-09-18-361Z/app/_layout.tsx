import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import Auth from '@/components/Auth';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

function AppContent() {
  useFrameworkReady();
  const { session, loading } = useAuth();
  const { theme } = useTheme();
  
  if (loading) {
    return null;
  }

  return (
    <>
      {session ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      ) : (
        <Auth />
      )}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}