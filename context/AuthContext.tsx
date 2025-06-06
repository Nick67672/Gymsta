import { createContext, useState, useContext, useEffect } from 'react';
import { Alert, Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useTheme } from './ThemeContext';
import Colors from '@/constants/Colors';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  showAuthModal: () => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  showAuthModal: () => {},
  signOut: async () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useTheme();
  const colors = Colors[theme];

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showAuthModal = () => {
    setModalVisible(true);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSignIn = () => {
    setModalVisible(false);
    router.push('/auth');
  };

  const handleSignUp = () => {
    setModalVisible(false);
    router.push('/auth');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        session, 
        loading, 
        showAuthModal, 
        signOut,
        isAuthenticated: !!session
      }}
    >
      {children}
      
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sign in Required</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              You need to sign in to access this feature.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.signInButton, { backgroundColor: colors.tint }]}
                onPress={handleSignIn}
              >
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.signUpButton, { borderColor: colors.tint }]}
                onPress={handleSignUp}
              >
                <Text style={[styles.signUpButtonText, { color: colors.tint }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    minHeight: 280,
    maxHeight: '70%',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButton: {
    // Background color set through component
  },
  signInButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  signUpButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  signUpButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});