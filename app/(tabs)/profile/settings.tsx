import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { ArrowLeft, Lock, Trash2, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export default function SettingsScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const colors = Colors[theme];

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_private')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsPrivate(data?.is_private || false);
    } catch (err) {
      console.error('Error loading privacy settings:', err);
    }
  };

  const handlePrivacyToggle = async () => {
    setSavingPrivacy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ is_private: !isPrivate })
        .eq('id', user.id);

      if (error) throw error;
      setIsPrivate(!isPrivate);
    } catch (err) {
      console.error('Error updating privacy settings:', err);
    } finally {
      setSavingPrivacy(false);
    }
  };
  
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    setShowDeleteConfirmation(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the RPC function to delete the account
      const { error } = await supabase.rpc('delete_my_account');
      
      if (error) throw error;

      // Sign out and redirect to home
      await supabase.auth.clearSession();
      router.replace('/');
    } catch (err) {
      console.error('Error deleting account:', err);
      Alert.alert('Error', 'Failed to delete account. Please try again later.');
    } finally {
      setDeletingAccount(false);
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>
      
      <ScrollView style={styles.settingsContainer}>
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              trackColor={{ false: '#E5E5E5', true: '#a395e9' }}
              thumbColor={isDarkMode ? '#6C5CE7' : '#f4f3f4'}
              ios_backgroundColor="#E5E5E5"
              onValueChange={toggleTheme}
              value={isDarkMode}
            />
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy</Text>
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLabelContainer}>
              <Lock size={20} color={colors.text} style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Private Account</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Only followers can see your posts
                </Text>
              </View>
            </View>
            {savingPrivacy ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Switch
                trackColor={{ false: '#E5E5E5', true: '#a395e9' }}
                thumbColor={isPrivate ? '#6C5CE7' : '#f4f3f4'}
                ios_backgroundColor="#E5E5E5"
                onValueChange={handlePrivacyToggle}
                value={isPrivate}
              />
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.button }]}
          onPress={handleSignOut}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteAccountButton, { backgroundColor: colors.error }]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}>
          {deletingAccount ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Trash2 size={20} color="#fff" style={styles.deleteIcon} />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showDeleteConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmation(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.warningIconContainer}>
              <AlertTriangle size={48} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account?</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              This action cannot be undone. All your data, posts, messages, and profile information will be permanently deleted.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowDeleteConfirmation(false)}>
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.error }]}
                onPress={confirmDeleteAccount}>
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsContainer: {
    flex: 1,
  },
  section: {
    borderBottomWidth: 1,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 15,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  signOutButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
    marginHorizontal: 20,
  },
  deleteAccountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteIcon: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  warningIconContainer: {
    marginBottom: 16,
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
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});