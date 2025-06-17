import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Image, Text } from 'react-native';
import { Profile } from '../types/social';
import Colors from '@/constants/Colors';

interface StoriesRailProps {
  following: Profile[];
  theme: keyof typeof Colors;
  loadStories: (userId: string) => void;
  isAuthenticated: boolean;
  showAuthModal: () => void;
}

const StoriesRail: React.FC<StoriesRailProps> = ({
  following,
  theme,
  loadStories,
  isAuthenticated,
  showAuthModal,
}) => {
  const colors = Colors[theme];
  return (
    <View style={styles.storiesContainer}>      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContent}
      >
        {following
          .filter((profile) => profile.has_story)
          .map((profile) => (
            <TouchableOpacity
              key={profile.id ?? profile.username}
              style={styles.storyItem}
              onPress={() => {
                if (!isAuthenticated) {
                  showAuthModal();
                  return;
                }
                loadStories(profile.id ?? '');
              }}
            >
              <View
                style={[styles.storyRing, profile.has_story && styles.activeStoryRing]}
              >
                <Image
                  source={{
                    uri:
                      profile.avatar_url ||
                      `https://source.unsplash.com/random/100x100/?portrait&${profile.id ?? profile.username}`,
                  }}
                  style={styles.storyAvatar}
                />
              </View>
              <Text
                style={[styles.storyUsername, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {profile.username}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
};

export default StoriesRail;

const styles = StyleSheet.create({
  storiesContainer: {
    paddingVertical: 10,
  },
  storiesContent: {
    paddingHorizontal: 15,
    gap: 15,
  },
  storyItem: {
    alignItems: 'center',
    width: 80,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    backgroundColor: '#E5E5E5',
    marginBottom: 4,
  },
  activeStoryRing: {
    backgroundColor: '#3B82F6',
  },
  storyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyUsername: {
    fontSize: 12,
    textAlign: 'center',
  },
}); 