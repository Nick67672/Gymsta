import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { Plus, Minus, Save, X, Camera, CircleCheck as CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface Set {
  reps: string;
  weight: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
  isPR: boolean;
}

export default function WorkoutScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: '', sets: [{ reps: '', weight: '' }], isPR: false }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState<boolean>(true);
  const [caption, setCaption] = useState('');
  const [totalWorkouts, setTotalWorkouts] = useState(43);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const currentDate = new Date();
  const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos to upload workout images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const addExercise = () => {
    const newId = Date.now().toString();
    setExercises([...exercises, { id: newId, name: '', sets: [{ reps: '', weight: '' }], isPR: false }]);
  };

  const addSet = (exerciseId: string) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId) {
        return {
          ...exercise,
          sets: [...exercise.sets, { reps: '', weight: '' }]
        };
      }
      return exercise;
    }));
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId && exercise.sets.length > 1) {
        return {
          ...exercise,
          sets: exercise.sets.filter((_, index) => index !== setIndex)
        };
      }
      return exercise;
    }));
  };

  const handleExerciseNameChange = (id: string, text: string) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === id) {
        return { ...exercise, name: text };
      }
      return exercise;
    }));
  };

  const handleSetChange = (exerciseId: string, setIndex: number, field: keyof Set, value: string) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId) {
        const newSets = [...exercise.sets];
        newSets[setIndex] = {
          ...newSets[setIndex],
          [field]: value
        };
        return { ...exercise, sets: newSets };
      }
      return exercise;
    }));
  };

  const togglePR = (exerciseId: string) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId) {
        return { ...exercise, isPR: !exercise.isPR };
      }
      return exercise;
    }));
  };

  const handleSubmit = async () => {
    const validExercises = exercises.filter(ex => {
      return ex.name.trim() && ex.sets.every(set => set.reps.trim() && set.weight.trim());
    });
    
    if (validExercises.length === 0) {
      setError('Please add at least one exercise with complete set information');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let progress_image_url = null;

      if (imageUri) {
        setUploadingImage(true);
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('workout_images')
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('workout_images')
          .getPublicUrl(fileName);

        progress_image_url = publicUrl;
        setUploadingImage(false);
      }

      const formattedExercises = validExercises.map(ex => ({
        name: ex.name,
        sets: ex.sets.map(set => ({
          reps: parseInt(set.reps),
          weight: parseFloat(set.weight)
        })),
        isPR: ex.isPR
      }));

      const { error: saveError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          date: currentDate.toISOString().split('T')[0],
          exercises: formattedExercises,
          caption: caption.trim() || null,
          is_private: isPrivate,
          progress_image_url
        });

      if (saveError) throw saveError;

      setExercises([{ id: '1', name: '', sets: [{ reps: '', weight: '' }], isPR: false }]);
      setCaption('');
      setImageUri(null);
      Alert.alert('Success', 'Workout saved successfully!');
    } catch (err) {
      console.error('Error saving workout:', err);
      setError('Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Track Workout</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.dateText, { color: colors.text }]}>{formattedDate}</Text>

        <TouchableOpacity 
          style={styles.imageUploadContainer}
          onPress={pickImage}
          disabled={uploadingImage}>
          {imageUri ? (
            <Image 
              source={{ uri: imageUri }} 
              style={styles.uploadedImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.imageUploadPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <Camera size={24} color={colors.textSecondary} />
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                Add photo
              </Text>
            </View>
          )}
          {uploadingImage && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color={colors.tint} />
            </View>
          )}
        </TouchableOpacity>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseContainer}>
            <View style={styles.exerciseHeader}>
              <TextInput
                style={[styles.exerciseInput, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                  flex: 1
                }]}
                placeholder="Exercise name"
                placeholderTextColor={colors.textSecondary}
                value={exercise.name}
                onChangeText={(text) => handleExerciseNameChange(exercise.id, text)}
              />
              <TouchableOpacity
                style={[
                  styles.prButton,
                  exercise.isPR && styles.prButtonActive,
                  { borderColor: colors.tint }
                ]}
                onPress={() => togglePR(exercise.id)}>
                <CheckCircle
                  size={24}
                  color={exercise.isPR ? colors.tint : colors.textSecondary}
                  fill={exercise.isPR ? colors.tint : 'none'}
                />
                <Text style={[
                  styles.prButtonText,
                  { color: exercise.isPR ? colors.tint : colors.textSecondary }
                ]}>PR</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.setsHeader}>
              <Text style={[styles.setsLabel, { color: colors.text }]}>Sets</Text>
              <Text style={[styles.repsLabel, { color: colors.text }]}>Reps</Text>
              <Text style={[styles.weightLabel, { color: colors.text }]}>Weight (kg)</Text>
            </View>

            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setContainer}>
                <Text style={[styles.setNumber, { color: colors.text }]}>{setIndex + 1}</Text>
                <TextInput
                  style={[styles.setInput, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border
                  }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={set.reps}
                  onChangeText={(text) => handleSetChange(exercise.id, setIndex, 'reps', text)}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.setInput, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border
                  }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={set.weight}
                  onChangeText={(text) => handleSetChange(exercise.id, setIndex, 'weight', text)}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.removeSetButton}
                  onPress={() => removeSet(exercise.id, setIndex)}>
                  <Minus size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addSetButton, { borderColor: colors.tint }]}
              onPress={() => addSet(exercise.id)}>
              <Plus size={20} color={colors.tint} />
              <Text style={[styles.addSetText, { color: colors.tint }]}>Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addExerciseButton, { backgroundColor: colors.tint }]}
          onPress={addExercise}>
          <Plus size={24} color="#fff" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>

        <View style={styles.visibilityContainer}>
          <Text style={[styles.visibilityTitle, { color: colors.text }]}>Who can see this workout?</Text>
          <View style={styles.visibilityOptions}>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                !isPrivate && styles.visibilityOptionActive,
                { borderColor: colors.border }
              ]}
              onPress={() => setIsPrivate(false)}>
              <Text style={[
                styles.visibilityOptionText,
                !isPrivate && styles.visibilityOptionTextActive,
                { color: isPrivate ? colors.text : colors.tint }
              ]}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                isPrivate && styles.visibilityOptionActive,
                { borderColor: colors.border }
              ]}
              onPress={() => setIsPrivate(true)}>
              <Text style={[
                styles.visibilityOptionText,
                isPrivate && styles.visibilityOptionTextActive,
                { color: !isPrivate ? colors.text : colors.tint }
              ]}>My Archive</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled, { backgroundColor: colors.tint }]}
          onPress={handleSubmit}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Save Workout</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.workoutCount, { color: colors.textSecondary }]}>
          {totalWorkouts} workouts logged
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  imageUploadContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageUploadPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseContainer: {
    marginBottom: 25,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  exerciseInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  prButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  prButtonActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  prButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 30,
  },
  setsLabel: {
    width: 50,
    fontSize: 14,
    fontWeight: '600',
  },
  repsLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  weightLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  setContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  setNumber: {
    width: 30,
    fontSize: 16,
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
  },
  removeSetButton: {
    padding: 5,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  addSetText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 20,
  },
  addExerciseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  visibilityContainer: {
    marginBottom: 20,
  },
  visibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  visibilityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  visibilityOptionActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  visibilityOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  visibilityOptionTextActive: {
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  workoutCount: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    textAlign: 'center',
  },
});