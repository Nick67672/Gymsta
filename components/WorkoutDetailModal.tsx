import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { ArrowLeft, CircleCheck as CheckCircle, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface Workout {
  id: string;
  date: string;
  exercises: {
    name: string;
    sets: {
      reps: number;
      weight: number;
    }[];
    isPR?: boolean;
  }[];
  caption: string | null;
  progress_image_url: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface WorkoutDetailModalProps {
  workoutId: string | null;
  visible: boolean;
  onClose: () => void;
}

export default function WorkoutDetailModal({ workoutId, visible, onClose }: WorkoutDetailModalProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workoutId && visible) {
      loadWorkout();
    }
  }, [workoutId, visible]);

  const loadWorkout = async () => {
    if (!workoutId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          exercises,
          caption,
          progress_image_url,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('id', workoutId)
        .single();

      if (error) throw error;
      setWorkout(data);
    } catch (err) {
      console.error('Error loading workout:', err);
      setError('Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.modalBackground }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Workout Details</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            </View>
          ) : workout ? (
            <ScrollView style={styles.content}>
              <View style={styles.userInfo}>
                <Image
                  source={{
                    uri: workout.profiles.avatar_url ||
                      `https://source.unsplash.com/random/100x100/?portrait`
                  }}
                  style={styles.avatar}
                />
                <Text style={[styles.username, { color: colors.text }]}>
                  {workout.profiles.username}
                </Text>
              </View>

              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {new Date(workout.date).toLocaleDateString()}
              </Text>

              {workout.progress_image_url && (
                <Image
                  source={{ uri: workout.progress_image_url }}
                  style={styles.progressImage}
                />
              )}

              {workout.caption && (
                <Text style={[styles.caption, { color: colors.text }]}>
                  {workout.caption}
                </Text>
              )}

              <View style={styles.exercises}>
                {workout.exercises.map((exercise, index) => (
                  <View 
                    key={index} 
                    style={[styles.exerciseCard, { backgroundColor: colors.card }]}>
                    <View style={styles.exerciseHeader}>
                      <Text style={[styles.exerciseName, { color: colors.text }]}>
                        {exercise.name}
                      </Text>
                      {exercise.isPR && (
                        <View style={[styles.prBadge, { backgroundColor: colors.tint + '20' }]}>
                          <CheckCircle size={16} color={colors.tint} fill={colors.tint} />
                          <Text style={[styles.prText, { color: colors.tint }]}>PR</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.setsHeader}>
                      <Text style={[styles.setLabel, { color: colors.textSecondary }]}>Set</Text>
                      <Text style={[styles.setLabel, { color: colors.textSecondary }]}>Reps</Text>
                      <Text style={[styles.setLabel, { color: colors.textSecondary }]}>Weight</Text>
                    </View>

                    {exercise.sets.map((set, setIndex) => (
                      <View key={setIndex} style={styles.setRow}>
                        <Text style={[styles.setText, { color: colors.text }]}>{setIndex + 1}</Text>
                        <Text style={[styles.setText, { color: colors.text }]}>{set.reps}</Text>
                        <Text style={[styles.setText, { color: colors.text }]}>{set.weight} kg</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.error, { color: colors.error }]}>Workout not found</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    left: 15,
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    textAlign: 'center',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    marginBottom: 15,
  },
  progressImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 15,
  },
  caption: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  exercises: {
    gap: 15,
    marginBottom: 20,
  },
  exerciseCard: {
    borderRadius: 12,
    padding: 15,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  prText: {
    fontSize: 14,
    fontWeight: '600',
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  setLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  setRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  setText: {
    flex: 1,
    fontSize: 16,
  },
});