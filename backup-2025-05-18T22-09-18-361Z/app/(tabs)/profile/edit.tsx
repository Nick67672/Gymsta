import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setUsername(data.username);
        setBio(data.bio || '');
        setAvatar(data.avatar_url);
      }
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Profile load error:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permission to access gallery was denied. Please enable it in your device settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setAvatar(result.assets[0].uri);
        setError(null);
      }
    } catch (err) {
      setError('Failed to access the gallery. Please try again.');
      console.error('Image picker error:', err);
    }
  };

  const uploadAvatar = async (uri: string, userId: string): Promise<string | null> => {
    try {
      setUploadingAvatar(true);
      const fileName = `${userId}/${Date.now()}.jpg`;
      
      // Handle image upload based on platform
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
      } else {
        // For native platforms (iOS/Android)
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: fileName,
          type: 'image/jpeg',
        } as any);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, formData, {
            contentType: 'multipart/form-data',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Avatar upload error:', err);
      throw err;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to update your profile');
        return;
      }

      let avatarUrl = avatar;

      // Upload new avatar if it's a local file (starts with file:// or content://)
      if (avatar && (avatar.startsWith('file://') || avatar.startsWith('content://'))) {
        try {
          avatarUrl = await uploadAvatar(avatar, user.id);
        } catch (err) {
          if (err instanceof Error) {
            if (err.message.includes('Bucket not found')) {
              setError('Avatar storage is not properly configured. Please contact support.');
            } else if (err.message.includes('Permission denied')) {
              setError('You do not have permission to upload avatars.');
            } else if (err.message.includes('Entity too large')) {
              setError('Image file is too large. Please choose a smaller image.');
            } else {
              setError(`Avatar upload failed: ${err.message}`);
            }
          } else {
            setError('Failed to upload avatar. Please try again.');
          }
          return;
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.message.includes('duplicate key')) {
          setError('This username is already taken. Please choose another one.');
        } else if (updateError.message.includes('check constraint')) {
          setError('Invalid input. Please check your username and bio.');
        } else {
          setError('Failed to update profile. Please try again.');
        }
        return;
      }

      // Success - navigate back to profile
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Profile update error:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Edit</Text>
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { 
              backgroundColor: colors.background,
              borderColor: colors.error 
            }]} 
            onPress={() => setError(null)}>
            <Text style={[styles.retryText, { color: colors.error }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={styles.avatarContainer} 
        onPress={pickImage}
        disabled={uploadingAvatar}>
        {uploadingAvatar ? (
          <View style={[styles.avatarPlaceholder, { 
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border 
          }]}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { 
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border 
          }]}>
            <Camera size={40} color={colors.textSecondary} />
            <Text style={[styles.avatarText, { color: colors.textSecondary }]}>Change Profile Picture</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={[styles.input, { 
          borderColor: colors.border,
          backgroundColor: colors.inputBackground,
          color: colors.text
        }]}
        placeholder="Username"
        placeholderTextColor={colors.textSecondary}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
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
        placeholder="Bio"
        placeholderTextColor={colors.textSecondary}
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button, 
            styles.cancelButton, 
            { 
              backgroundColor: colors.background, 
              borderColor: colors.tint 
            }
          ]}
          onPress={() => router.back()}
          disabled={loading || uploadingAvatar}>
          <Text style={[styles.cancelButtonText, { color: colors.tint }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button, 
            styles.saveButton, 
            (loading || uploadingAvatar) && styles.buttonDisabled, 
            { backgroundColor: colors.tint }
          ]}
          onPress={handleSave}
          disabled={loading || uploadingAvatar}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  error: {
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  retryText: {
    fontWeight: '600',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  avatarText: {
    marginTop: 8,
    fontSize: 12,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});