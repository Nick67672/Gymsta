import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, isDarkMode } = useTheme();
  const colors = Colors[theme];

  async function signInWithEmail() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password to sign in');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has a profile
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (!profile) {
          router.replace('/register');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password to sign up');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!user) throw new Error('No user data returned from signup');

      // After successful signup, redirect to register page to complete profile
      router.replace('/register');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.formContainer}>
        <Text style={[styles.header, { color: colors.tint }]}>Welcome to Gymsta</Text>
        
        {error && <Text style={styles.error}>{error}</Text>}
        
        <TextInput
          style={[styles.input, { 
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
            color: colors.text 
          }]}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={[styles.input, { 
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
            color: colors.text 
          }]}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, styles.signInButton, loading && styles.buttonDisabled, { backgroundColor: colors.button }]}
          onPress={signInWithEmail}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button, 
            styles.signUpButton, 
            loading && styles.buttonDisabled,
            { 
              backgroundColor: colors.background,
              borderColor: colors.tint 
            }
          ]}
          onPress={signUpWithEmail}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            <Text style={[styles.buttonText, styles.signUpButtonText, { color: colors.tint }]}>Sign Up</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signInButton: {
    // Background color set in component
  },
  signUpButton: {
    borderWidth: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButtonText: {
    // Color set in component
  },
  error: {
    color: '#6C5CE7',
    marginBottom: 16,
    textAlign: 'center',
  },
});