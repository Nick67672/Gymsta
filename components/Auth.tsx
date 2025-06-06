import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [showEula, setShowEula] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { theme } = useTheme();
  const colors = Colors[theme];

  async function signInWithEmail() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password to sign in');
      return;
    }

    if (!eulaAccepted) {
      setError('You must agree to the End User License Agreement to continue');
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

    if (!eulaAccepted) {
      setError('You must agree to the End User License Agreement to continue');
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

  const toggleEulaAccepted = () => {
    setEulaAccepted(!eulaAccepted);
  };

  const openEula = () => {
    setShowEula(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.formContainer}>
        <Text style={[styles.header, { color: colors.tint }]}>
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

        <TouchableOpacity
          style={styles.eulaContainer}
          onPress={toggleEulaAccepted}
          activeOpacity={0.7}>
          <View style={[
            styles.checkbox, 
            { borderColor: colors.tint },
            eulaAccepted && { backgroundColor: colors.tint }
          ]}>
            {eulaAccepted && <Check size={16} color="#fff" />}
          </View>
          <View style={styles.eulaTextContainer}>
            <Text style={[styles.eulaText, { color: colors.text }]}>
              I agree to the{' '}
              <Text 
                style={[styles.eulaLink, { color: colors.tint }]}
                onPress={(e) => {
                  e.stopPropagation();
                  openEula();
                }}>
                End User License Agreement
              </Text>
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.signInButton, loading && styles.buttonDisabled, { backgroundColor: colors.button }]}
          onPress={mode === 'signin' ? signInWithEmail : signUpWithEmail}
          disabled={loading}>
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

      <Modal
        visible={showEula}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEula(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>End User License Agreement</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowEula(false)}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.eulaScrollView}>
              <Text style={[styles.eulaFullText, { color: colors.text }]}>
                This End User License Agreement ("Agreement") is a legal agreement between you ("User" or "You") and Vanta ("Company"), governing your use of the Gymsta application ("App") made available through the Apple App Store.{"\n\n"}

                1. License{"\n"}
                Vanta grants you a non-exclusive, non-transferable, revocable license to use the App strictly in accordance with this Agreement and Apple's usage rules set forth in the Apple Media Services Terms and Conditions.{"\n\n"}

                2. Restrictions{"\n"}
                You agree not to:{"\n"}
                • Modify, reverse engineer, or create derivative works of the App;{"\n"}
                • Rent, lease, lend, sell, redistribute, or sublicense the App;{"\n"}
                • Use the App for any unlawful or unauthorized purpose.{"\n\n"}

                3. Ownership{"\n"}
                The App is licensed, not sold. All rights, title, and interest in and to the App (including all intellectual property rights) remain with Vanta.{"\n\n"}

                4. Termination{"\n"}
                This Agreement is effective until terminated by you or Vanta. Your rights under this Agreement will terminate automatically if you fail to comply with any of its terms.{"\n\n"}

                5. External Services{"\n"}
                The App may enable access to third-party services and websites. You agree to use these services at your own risk and acknowledge that Vanta is not responsible for their content or practices.{"\n\n"}

                6. Disclaimer of Warranties{"\n"}
                The App is provided "AS IS" and "AS AVAILABLE," without warranties of any kind. Vanta disclaims all warranties, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.{"\n\n"}

                7. Limitation of Liability{"\n"}
                To the fullest extent permitted by law, Vanta shall not be liable for any indirect, incidental, special, or consequential damages arising out of or related to your use of the App.{"\n\n"}

                8. Governing Law{"\n"}
                This Agreement is governed by and construed in accordance with the laws of your local jurisdiction, without regard to its conflict of law provisions.{"\n\n"}

                9. Contact{"\n"}
                If you have any questions about this Agreement, please contact us at:{"\n"}
                📧 founder@vantafitness.com{"\n\n"}

                Apple-Specific Clause{"\n"}
                This license is granted to you for use only on Apple-branded products and is subject to the Apple Media Services Terms and Conditions. Apple is not responsible for the App or its content. In the event of any failure of the App to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price, if applicable. To the maximum extent permitted by law, Apple will have no other warranty obligation whatsoever with respect to the App.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                setEulaAccepted(true);
                setShowEula(false);
              }}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  eulaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eulaTextContainer: {
    flex: 1,
  },
  eulaText: {
    fontSize: 14,
    lineHeight: 20,
  },
  eulaLink: {
    textDecorationLine: 'underline',
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
  modalOverlay: {
    flex: 1,
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
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  eulaScrollView: {
    padding: 16,
    maxHeight: 400,
  },
  eulaFullText: {
    fontSize: 14,
    lineHeight: 20,
  },
  acceptButton: {
    padding: 16,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});