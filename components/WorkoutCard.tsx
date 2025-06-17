import React from 'react';
import { TouchableOpacity, View, Image, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

interface Workout {
  id: string;
  user_id: string;
  exercises: any[];
  created_at: string;
  progress_image_url: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface WorkoutCardProps {
  workout: Workout;
  theme: keyof typeof Colors;
  onPress: (workoutId: string) => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout, theme, onPress }) => {
  const colors = Colors[theme];
  return (
    <TouchableOpacity
      style={[styles.workoutCard, { backgroundColor: colors.card }]}
      onPress={() => onPress(workout.id)}
    >
      <View style={styles.workoutHeader}>
        <Image
          source={{
            uri:
              workout.profiles.avatar_url ||
              `https://source.unsplash.com/random/100x100/?portrait&${workout.user_id}`,
          }}
          style={styles.workoutAvatar}
        />
        <Text style={[styles.workoutUsername, { color: colors.text }]}> {workout.profiles.username} </Text>
      </View>
      {workout.progress_image_url && (
        <Image source={{ uri: workout.progress_image_url }} style={styles.workoutImage} />
      )}
      <View style={styles.workoutInfo}>
        <Text style={[styles.workoutExercises, { color: colors.textSecondary }]}> {workout.exercises.length} exercises </Text>
        <Text style={[styles.workoutTime, { color: colors.textSecondary }]}> {new Date(workout.created_at).toLocaleDateString()} </Text>
      </View>
    </TouchableOpacity>
  );
};

export default WorkoutCard;

const styles = StyleSheet.create({
  workoutCard: {
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 15,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  workoutAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  workoutUsername: {
    fontSize: 16,
    fontWeight: '600',
  },
  workoutImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  workoutInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutExercises: {
    fontSize: 14,
  },
  workoutTime: {
    fontSize: 14,
  },
}); 