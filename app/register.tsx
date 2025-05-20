import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gym, setGym] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGymSuggestions, setShowGymSuggestions] = useState(false);
  const { theme } = useTheme();
  const colors = Colors[theme];

  const filteredGyms = GYM_LIST.filter(g => 
    g.toLowerCase().includes(gym.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        router.replace('/');
        return;
      }

      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingUser) {
        setError('Username is already taken');
        return;
      }

      // Create new profile
      const { data: profile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: username.trim(),
          bio: bio.trim() || null,
          gym: gym.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        if (createError.message.includes('duplicate key')) {
          setError('Username is already taken');
          return;
        }
        throw createError;
      }

      if (!profile) {
        throw new Error('Failed to create profile');
      }

      // Redirect to home screen on success
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Profile creation error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'An unexpected error occurred while creating your profile'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.tint }]}>Complete Your Profile</Text>
      
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}
      
      <TextInput
        style={[
          styles.input, 
          { 
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
            color: colors.text
          }
        ]}
        placeholder="Username"
        placeholderTextColor={colors.textSecondary}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
      />
      
      <TextInput
        style={[
          styles.input,
          styles.bioInput, 
          { 
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
            color: colors.text
          }
        ]}
        placeholder="Bio (optional)"
        placeholderTextColor={colors.textSecondary}
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
        maxLength={160}
      />

      <View style={styles.gymInputContainer}>
        <TextInput
          style={[
            styles.input,
            { 
              borderColor: colors.border,
              backgroundColor: colors.inputBackground,
              color: colors.text,
              marginBottom: showGymSuggestions && filteredGyms.length > 0 ? 0 : 16,
              borderBottomLeftRadius: showGymSuggestions && filteredGyms.length > 0 ? 0 : 8,
              borderBottomRightRadius: showGymSuggestions && filteredGyms.length > 0 ? 0 : 8
            }
          ]}
          placeholder="Gym (optional)"
          placeholderTextColor={colors.textSecondary}
          value={gym}
          onChangeText={(text) => {
            setGym(text);
            setShowGymSuggestions(true);
          }}
          onFocus={() => setShowGymSuggestions(true)}
        />
        
        {showGymSuggestions && filteredGyms.length > 0 && (
          <ScrollView 
            style={[
              styles.suggestionsContainer,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border
              }
            ]}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filteredGyms.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.suggestionItem,
                  { borderBottomColor: colors.border }
                ]}
                onPress={() => {
                  setGym(suggestion);
                  setShowGymSuggestions(false);
                }}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled, { backgroundColor: colors.button }]}
        onPress={handleSubmit}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Complete Registration</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  gymInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  suggestionsContainer: {
    maxHeight: 200,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 16,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 16,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

const GYM_LIST = [
'1Rebel Broadgate','1Rebel South Bank','1Rebel St Mary Axe','1Rebel Victoria','Activhealth Fitness','Barrys', 'Bootcamp','Barrecore','Bermondsey Gym','Blok','Bodyism','Bodyspace','BXR','Club Health','Core Collective','E by Equinox','Equinox','F45 Training','Finsbury Park Gym','Fitness First','Frame Kings Cross','KX Life','Lanserhof at the Arts Club','Psycle','Pure Gym London Acton','Pure Gym London Aldgate','Pure Gym London Angel','Pure Gym London Bank','Pure Gym London Bayswater','Pure Gym London Beckton','Pure Gym London Bethnal Green','Pure Gym London Borough','Pure Gym London Bow Wharf','Pure Gym London Bromley','Pure Gym London Camberwell New Road','Pure Gym London Camberwell Southampton Way','Pure Gym London Camden','Pure Gym London Canary Wharf','Pure Gym London Catford Rushey Green','Pure Gym London Charlton','Pure Gym London Clapham','Pure Gym London Colindale','Pure Gym London Crouch End','Pure Gym London Croydon','Pure Gym London Ealing Broadway','Pure Gym London East India Dock','Pure Gym London East Sheen','Pure Gym London Edgware','Pure Gym London Enfield','Pure Gym London Farringdon','Pure Gym London Feltham','Pure Gym London Finchley','Pure Gym London Fulham','Pure Gym London Piccadilly','Pure Gym Waterloo','Studio Fix','Sweat IT','The Engine Room','The Foundry','Third Space','Trib3','Virgin Active','Workshop',
];