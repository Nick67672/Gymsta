import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, CircleCheck as CheckCircle2, Heart, Settings, X, Dumbbell, Pause, Play } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import StoryViewer from '@/components/StoryViewer';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface Story {
  id: string;
  media_url: string;
  user_id: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  has_story: boolean;
}

interface Post {
  id: string;
  caption: string | null;
  image_url: string;
  media_type: string;
  created_at: string;
  product_id: string | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    gym: string | null;
  };
  likes: {
    id: string;
    user_id: string;
  }[];
}

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

export default function HomeScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [activeTab, setActiveTab] = useState<'explore' | 'my-gym'>('explore');
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);
  const [showingStories, setShowingStories] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [currentUserGym, setCurrentUserGym] = useState<string | null>(null);
  const [gymWorkouts, setGymWorkouts] = useState<Workout[]>([]);
  const videoRefs = useRef<{ [key: string]: any }>({});
  
  const screenWidth = Dimensions.get('window').width;

  const loadFollowing = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select(`
          following:following_id(
            id,
            username,
            avatar_url
          )
        `)
        .eq('follower_id', user.id);

      if (followingError) throw followingError;

      const profiles = followingData
        .map(f => f.following)
        .filter((p): p is Profile => p !== null);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: storiesData } = await supabase
        .from('stories')
        .select('user_id')
        .in('user_id', profiles.map(p => p.id))
        .gte('created_at', twentyFourHoursAgo);

      const profilesWithStoryStatus = profiles.map(profile => ({
        ...profile,
        has_story: storiesData?.some(s => s.user_id === profile.id) || false
      }));

      setFollowing(profilesWithStoryStatus);
    } catch (err) {
      console.error('Error loading following:', err);
    }
  };

  const loadStories = async (userId: string) => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: stories, error } = await supabase
        .from('stories')
        .select('id, media_url, user_id')
        .eq('user_id', userId)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (stories && stories.length > 0) {
        setSelectedStories(stories);
        setShowingStories(true);
      }
    } catch (err) {
      console.error('Error loading stories:', err);
    }
  };

  const loadPosts = async () => {
    try {
      // Get current user's gym
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gym')
          .eq('id', user.id)
          .single();
        
        setCurrentUserGym(profile?.gym || null);
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          image_url,
          media_type,
          created_at,
          product_id,
          profiles (
            id,
            username,
            avatar_url,
            is_verified,
            gym
          ),
          likes (
            id,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const postsWithMediaType = (data || []).map(post => ({
        ...post,
        media_type: post.media_type || 'image'
      }));
      
      setPosts(postsWithMediaType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadGymWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id,
          user_id,
          exercises,
          created_at,
          progress_image_url,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGymWorkouts(workouts || []);
    } catch (err) {
      console.error('Error loading gym workouts:', err);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) throw error;

      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes: [...post.likes, { id: 'temp-id', user_id: user.id }]
            };
          }
          return post;
        })
      );
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleUnlike = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes: post.likes.filter(like => like.user_id !== user.id)
            };
          }
          return post;
        })
      );
    } catch (err) {
      console.error('Error unliking post:', err);
    }
  };

  const toggleVideoPlayback = (postId: string) => {
    if (playingVideo === postId) {
      if (videoRefs.current[postId]) {
        videoRefs.current[postId].pauseAsync();
      }
      setPlayingVideo(null);
    } else {
      if (playingVideo && videoRefs.current[playingVideo]) {
        videoRefs.current[playingVideo].pauseAsync();
      }
      
      if (videoRefs.current[postId]) {
        videoRefs.current[postId].playAsync();
      }
      setPlayingVideo(postId);
    }
  };

  const navigateToProfile = (userId: string, username: string) => {
    if (userId === currentUserId) {
      router.push('/profile');
    } else {
      router.push(`/${username}`);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });

    loadPosts();
    loadFollowing();
    loadGymWorkouts();

    const postsChannel = supabase.channel('posts-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          const { data: newPost, error } = await supabase
            .from('posts')
            .select(`
              id,
              caption,
              image_url,
              media_type,
              created_at,
              product_id,
              profiles (
                id,
                username,
                avatar_url,
                is_verified,
                gym
              ),
              likes (
                id,
                user_id
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && newPost) {
            const postWithMediaType = {
              ...newPost,
              media_type: newPost.media_type || 'image'
            };
            setPosts(currentPosts => [postWithMediaType, ...currentPosts]);
          }
        }
      )
      .subscribe();

    const likesChannel = supabase.channel('likes-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    const storiesChannel = supabase.channel('stories-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        () => {
          loadFollowing();
        }
      )
      .subscribe();

    return () => {
      postsChannel.unsubscribe();
      likesChannel.unsubscribe();
      storiesChannel.unsubscribe();
    };
  }, []);

  const handleScroll = () => {
    if (playingVideo) {
      setPlayingVideo(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
    loadFollowing();
  };

  // Filter posts based on active tab
  const filteredPosts = activeTab === 'my-gym' && currentUserGym
    ? posts.filter(post => post.profiles.gym === currentUserGym)
    : posts;

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.logo, { color: colors.tint }]}>Gymsta</Text>
        <TouchableOpacity 
          style={styles.weightButton}
          onPress={() => router.push('/workout')}>
          <Dumbbell size={24} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeTab === 'explore' && styles.activeToggle
          ]}
          onPress={() => setActiveTab('explore')}>
          <Text style={[
            styles.toggleText,
            { color: colors.text },
            activeTab === 'explore' && styles.activeToggleText
          ]}>Explore</Text>
          {activeTab === 'explore' && <View style={[styles.underline, { backgroundColor: colors.tint }]} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeTab === 'my-gym' && styles.activeToggle
          ]}
          onPress={() => setActiveTab('my-gym')}>
          <Text style={[
            styles.toggleText,
            { color: colors.text },
            activeTab === 'my-gym' && styles.activeToggleText
          ]}>My Gym</Text>
          {activeTab === 'my-gym' && <View style={[styles.underline, { backgroundColor: colors.tint }]} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScrollBeginDrag={handleScroll}
        style={{ backgroundColor: colors.background }}
      >
        {activeTab === 'explore' ? (
          <>
            <View style={styles.storiesContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesContent}>
                {following.filter(profile => profile.has_story).map((profile) => (
                  <TouchableOpacity
                    key={profile.id}
                    style={styles.storyItem}
                    onPress={() => loadStories(profile.id)}>
                    <View style={[
                      styles.storyRing,
                      profile.has_story && styles.activeStoryRing
                    ]}>
                      <Image
                        source={{
                          uri: profile.avatar_url ||
                            `https://source.unsplash.com/random/100x100/?portrait&${profile.id}`
                        }}
                        style={styles.storyAvatar}
                      />
                    </View>
                    <Text style={[styles.storyUsername, { color: colors.textSecondary }]} numberOfLines={1}>
                      {profile.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.feed}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.tint} />
                </View>
              ) : (
                filteredPosts.map((post) => (
                  <View key={post.id} style={[styles.post, { backgroundColor: colors.card }]}>
                    <TouchableOpacity 
                      style={styles.postHeader}
                      onPress={() => navigateToProfile(post.profiles.id, post.profiles.username)}>
                      <Image
                        source={{
                          uri: post.profiles.avatar_url ||
                            'https://source.unsplash.com/random/40x40/?portrait',
                        }}
                        style={styles.profilePic}
                      />
                      <View style={styles.usernameContainer}>
                        <Text style={[styles.username, { color: colors.text }]}>{post.profiles.username}</Text>
                        {post.profiles.is_verified && (
                          <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    {post.media_type === 'video' ? (
                      <View style={styles.videoWrapper}>
                        <View style={styles.videoBackdrop} />
                        <TouchableOpacity 
                          style={styles.videoContainer}
                          activeOpacity={0.9}
                          onPress={() => toggleVideoPlayback(post.id)}
                        >
                          <Video
                            ref={ref => { videoRefs.current[post.id] = ref; }}
                            source={{ uri: post.image_url }}
                            style={styles.videoContent}
                            resizeMode={ResizeMode.CONTAIN}
                            useNativeControls={false}
                            isLooping
                            shouldPlay={false}
                            onPlaybackStatusUpdate={status => {
                              if (status?.isPlaying && playingVideo !== post.id) {
                                setPlayingVideo(post.id);
                              } else if (!status?.isPlaying && playingVideo === post.id) {
                                setPlayingVideo(null);
                              }
                            }}
                          />
                          <View style={styles.videoPlayButton}>
                            {playingVideo === post.id ? (
                              <Pause size={40} color="#fff" />
                            ) : (
                              <Play size={40} color="#fff" />
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.imageContainer}>
                        <Image 
                          source={{ uri: post.image_url }} 
                          style={styles.postImage}
                        />
                      </View>
                    )}
                    
                    <View style={styles.postContent}>
                      <View style={styles.captionContainer}>
                        <Text 
                          style={[styles.username, { color: colors.text }]}
                          onPress={() => navigateToProfile(post.profiles.id, post.profiles.username)}>
                          {post.profiles.username}
                        </Text>
                        {post.caption && (
                          <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>
                            {post.caption}
                          </Text>
                        )}
                        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                          {new Date(post.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      
                      <View style={styles.likeContainer}>
                        <TouchableOpacity 
                          onPress={() => {
                            const isLiked = currentUserId ? post.likes.some(like => like.user_id === currentUserId) : false;
                            if (isLiked) {
                              handleUnlike(post.id);
                            } else {
                              handleLike(post.id);
                            }
                          }}
                        >
                          <Heart
                            size={24}
                            color={colors.text}
                            fill={currentUserId && post.likes.some(like => like.user_id === currentUserId) ? colors.text : 'none'}
                          />
                        </TouchableOpacity>
                        <Text style={[styles.likes, { color: colors.text }]}>{post.likes.length} likes</Text>
                      </View>
                    </View>

                    {post.product_id && (
                      <TouchableOpacity
                        style={styles.seeProductButton}
                        onPress={() => router.push(`/marketplace/${post.product_id}`)}>
                        <Text style={styles.seeProductText}>See Product</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <View style={styles.gymWorkoutsContainer}>
            {gymWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={[styles.workoutCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/workout/${workout.id}`)}>
                <View style={styles.workoutHeader}>
                  <Image
                    source={{
                      uri: workout.profiles.avatar_url ||
                        `https://source.unsplash.com/random/100x100/?portrait&${workout.user_id}`
                    }}
                    style={styles.workoutAvatar}
                  />
                  <Text style={[styles.workoutUsername, { color: colors.text }]}>
                    {workout.profiles.username}
                  </Text>
                </View>
                {workout.progress_image_url && (
                  <Image
                    source={{ uri: workout.progress_image_url }}
                    style={styles.workoutImage}
                  />
                )}
                <View style={styles.workoutInfo}>
                  <Text style={[styles.workoutExercises, { color: colors.textSecondary }]}>
                    {workout.exercises.length} exercises
                  </Text>
                  <Text style={[styles.workoutTime, { color: colors.textSecondary }]}>
                    {new Date(workout.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showingStories}
        animationType="fade"
        onRequestClose={() => setShowingStories(false)}>
        <StoryViewer
          stories={selectedStories}
          onComplete={() => setShowingStories(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  weightButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    padding: 8,
    zIndex: 10,
  },
  error: {
    textAlign: 'center',
    marginTop: 20,
  },
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
  feed: {
    flex: 1,
  },
  post: {
    marginBottom: 20,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 25,
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontWeight: '600',
  },
  imageContainer: {
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: 400,
    borderRadius: 16,
  },
  videoWrapper: {
    width: Dimensions.get('window').width,
    aspectRatio: 16/9,
    maxHeight: 400,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
  },
  videoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContent: {
    width: '100%',
    height: '100%',
  },
  videoPlayButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    padding: 10,
  },
  postContent: {
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
  captionContainer: {
    marginBottom: 10,
  },
  caption: {
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likes: {
    fontSize: 14,
    fontWeight: '500',
  },
  seeProductButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 25,
    marginTop: 0,
    backgroundColor: '#3B82F6',
  },
  seeProductText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyGymContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyGymText: {
    textAlign: 'center',
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeToggleText: {
    fontWeight: '600',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    width: '50%',
    height: 2,
    borderRadius: 1,
  },
  gymWorkoutsContainer: {
    padding: 15,
    gap: 15,
  },
  workoutCard: {
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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