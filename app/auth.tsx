import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export default function AuthScreen() {
  const params = useLocalSearchParams();
  const initialMode = params.mode === 'signin' ? 'signin' : 'signup';
  
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [eulaChecked, setEulaChecked] = useState(false);
  const [showEula, setShowEula] = useState(false);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

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
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={[styles.headerText, { color: colors.tint }]}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </Text>
          
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

          {mode === 'signup' && (
            <TouchableOpacity
              style={styles.eulaRow}
              onPress={() => setEulaChecked(!eulaChecked)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, eulaChecked && { backgroundColor: colors.tint, borderColor: colors.tint }]}> 
                {eulaChecked && <Check size={16} color="#fff" />}
              </View>
              <Text style={[styles.eulaText, { color: colors.text }]}>by checking this box you agree to the <Text style={[styles.eulaLink, { color: colors.tint }]} onPress={(e) => { e.stopPropagation(); setShowEula(true); }}>EULA</Text></Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.signInButton, loading && styles.buttonDisabled, { backgroundColor: colors.button }]}
            onPress={mode === 'signin' ? signInWithEmail : signUpWithEmail}
            disabled={loading || (mode === 'signup' && !eulaChecked)}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            <Text style={[styles.switchModeText, { color: colors.tint }]}>
              {mode === 'signin' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* EULA Modal */}
        <Modal
          visible={showEula}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEula(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>  
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.tint }]}>End User License Agreement</Text>
                <TouchableOpacity onPress={() => setShowEula(false)}>
                  <Text style={[styles.closeButton, { color: colors.tint }]}>Close</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 16 }}>
                <Text style={[styles.modalText, { color: colors.text }]}>{`
END USER LICENSE AGREEMENT (EULA)

This End User License Agreement ("Agreement") is a legal agreement between you and Gymsta ("the App"). By using the App, you agree to be bound by the terms of this Agreement.

1. LICENSE
You are granted a non-exclusive, non-transferable, revocable license to use the App for personal, non-commercial purposes on your iOS device.

2. THIRD-PARTY CONTENT
The App may display, include, or make available third-party content (including data, information, applications, and other products or services) or provide links to third-party websites or services ("Third-Party Content"). You acknowledge and agree that Gymsta is not responsible for any Third-Party Content, including its accuracy, completeness, timeliness, validity, copyright compliance, legality, decency, quality, or any other aspect thereof. Gymsta does not assume and will not have any liability or responsibility to you or any other person or entity for any Third-Party Content.

3. ZERO TOLERANCE FOR OBJECTIONABLE CONTENT AND ABUSIVE USERS
You agree that you will not post, upload, share, or otherwise make available any content that is objectionable, offensive, abusive, harassing, threatening, defamatory, obscene, or otherwise inappropriate. Gymsta maintains a strict zero-tolerance policy for objectionable content and abusive users. Any user found to be engaging in such behavior may have their account suspended or terminated without notice, and any such content may be removed at the sole discretion of Gymsta.

4. RESTRICTIONS
You may not:
- Copy, modify, or create derivative works of the App;
- Reverse engineer, decompile, or disassemble the App;
- Remove, alter, or obscure any proprietary notices;
- Use the App for any unlawful purpose.

5. INTELLECTUAL PROPERTY
All rights, title, and interest in and to the App (excluding Third-Party Content) are owned by Gymsta and its licensors.

6. TERMINATION
This Agreement is effective until terminated by you or Gymsta. Your rights under this Agreement will terminate automatically if you fail to comply with any term(s) of this Agreement.

7. DISCLAIMER OF WARRANTIES
The App is provided "AS IS" and "AS AVAILABLE" without warranty of any kind. Gymsta disclaims all warranties, express or implied, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.

8. LIMITATION OF LIABILITY
To the maximum extent permitted by law, Gymsta shall not be liable for any damages arising out of or in connection with your use or inability to use the App or any Third-Party Content.

9. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of your jurisdiction.

By using the App, you acknowledge that you have read, understood, and agree to be bound by this Agreement.
`}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 10,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  headerText: {
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 16,
  },
  error: {
    color: '#6C5CE7',
    marginBottom: 16,
    textAlign: 'center',
  },
  eulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eulaText: {
    fontSize: 14,
    flex: 1,
    flexWrap: 'wrap',
  },
  eulaLink: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalScroll: {
    // Removed flex: 1 to fix modal content not showing on mobile
    // Optionally, add maxHeight for long EULA text
    // maxHeight: '80%',
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
  },
});