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
 '349 Barbell','Activhealth Fitness','Anvil Strength Gym','Arc Gym','ASC Performance','Aspire South West','Big C\'s Gym','Boxcross UK Wisbech','Centurion Strength and Fitness','Crossfit 3D','CrossFit Ancoats','CrossFit Central Manchester','CrossFit Incursion','Elite Camborne Gym','Evolution Gym','Exile Gym','Fitness at Gurnard','Fitness Factory','Gainz Station - House Of Gainz','Goliath Strongman','Gorilla Grappling Academy','Gray Mania Fitness','Greenes Gym','Gym Based Athlete','Gym Nation','Hulls Strongest','Ingles Boxing Gym','Inshape Fitness Studio','Isle be fit','Isle of Wight College Gym','K2 Gym (Bridgend)','Koncept Gym','MawFIT Gym','Medina Leisure Centre','Metabolic London','Oxygen Strength & Fitness','Physical Limits','Physique Fit Gym','Prime Performance','PureGym Aldershot Westgate Retail Park','PureGym Alloa','PureGym Altrincham','PureGym Bath Victoria Park','PureGym Belfast Adelaide Street','PureGym Billericay','PureGym Birmingham Beaufort Park','PureGym Bitterne','PureGym Borehamwood','PureGym Bournemouth the Triangle','PureGym Bristol Brislington','PureGym Bristol Union Gate','PureGym Bury','PureGym Canterbury Wincheap','PureGym Cardiff Western Avenue','PureGym Newry','PureGym Shirley','PureGym Southampton Central','PureGym York','Ravelin Sports Centre','Raw PT Gym','Red Beard Barbell Club','RS Fitness','Rush242 CrossFit','SAS Gym','Serious Strength Gym','Snap Fitness Newport (Isle of Wight)','Sups Gym','The Barbell Division','The Gym at Gorse Hill','The Gym, Sandown','The Heights Leisure Centre','The Main Event Boxing Gym Essex','The Nautilus Gym','The Strong Room','THRIVE Fit','TJ\'s Gym and Fitness Studio','Train Manchester','Urban Metro','West Wight Sports and Community Centre','WF11 Strength Club','Winning Strength Southampton','BMF Battersea Park'
];