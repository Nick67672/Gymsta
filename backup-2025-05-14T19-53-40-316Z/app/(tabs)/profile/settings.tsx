import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export default function SettingsScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
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
    } finally {
      setLoading(false);
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
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
});