import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Dumbbell, LogIn } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import StoryViewer from '@/components/StoryViewer';
import WorkoutDetailModal from '@/components/WorkoutDetailModal';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import FeedPost from '../../components/Post';
import StoriesRail from '../../components/StoriesRail';
import WorkoutCard from '../../components/WorkoutCard';
import { Story, Profile, Post, Workout } from '../../types/social';

export default function HomeScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { blockedUserIds, blockingLoading } = useBlocking();
  
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
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const videoRefs = useRef<{ [key: string]: any }>({});
  const [flaggedPosts, setFlaggedPosts] = useState<{ [postId: string]: boolean }>({});
  const [flagging, setFlagging] = useState<{ [postId: string]: boolean }>({});
  const channelsRef = useRef<{
    posts?: any;
    likes?: any;
    stories?: any;
  }>({});
  
  const loadFollowing = async () => {
    if (!isAuthenticated) return;
    
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

      const profiles = (followingData as any[])
        .map((f: any) => f.following as Profile)
        .filter(Boolean);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: storiesData } = await supabase
        .from('stories')
        .select('user_id')
        .in('user_id', profiles.map(p => p.id))
        .gte('created_at', twentyFourHoursAgo);

      const profilesWithStoryStatus = profiles.map(profile => ({
        ...profile,
        has_story: storiesData?.some((s: any) => s.user_id === profile.id) || false
      }));

      setFollowing(profilesWithStoryStatus as Profile[]);
    } catch (err) {
      console.error('Error loading following:', err);
    }
  };

  const loadStories = async (userId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
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

  const loadPosts = useCallback(async () => {
    try {
      // Get current user's gym
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('gym')
          .eq('id', user.id)
          .single();
        
        setCurrentUserGym(profile?.gym || null);
      } else {
        setCurrentUserId(null);
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
      
      // Filter out posts from blocked users
      const filteredPosts = postsWithMediaType.filter(post => 
        !blockedUserIds.includes((post.profiles as any).id)
      );
      
      setPosts(filteredPosts as Post[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [blockedUserIds]);

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
      setGymWorkouts((workouts || []) as Workout[]);
    } catch (err) {
      console.error('Error loading gym workouts:', err);
    }
  };

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
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

  const handleWorkoutPress = (workoutId: string) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    setSelectedWorkoutId(workoutId);
    setShowWorkoutModal(true);
  };

  useEffect(() => {
    // Don't load posts until blocking context is ready
    if (blockingLoading) return;
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });

    loadPosts();
    loadFollowing();
    loadGymWorkouts();
  }, [blockingLoading, blockedUserIds]);

  // Separate useEffect for channel subscriptions to avoid multiple subscriptions
  // We only create real-time subscriptions once the user is authenticated. This
  // prevents the scenario where a channel is subscribed before login and then
  // Supabase attempts a second subscribe when the session token changes,
  // triggering the "subscribe can only be called a single time per channel
  // instance" error.
  useEffect(() => {
    if (blockingLoading) return;
    if (!isAuthenticated) return;

    // Clean up existing channels
    if (channelsRef.current.posts) {
      channelsRef.current.posts.unsubscribe();
    }
    if (channelsRef.current.likes) {
      channelsRef.current.likes.unsubscribe();
    }
    if (channelsRef.current.stories) {
      channelsRef.current.stories.unsubscribe();
    }

    const postsChannel = supabase.channel('posts-channel-' + Date.now())
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

    const likesChannel = supabase.channel('likes-channel-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        () => {
          // Reload posts when likes change
          loadPosts();
        }
      )
      .subscribe();

    const storiesChannel = supabase.channel('stories-channel-' + Date.now())
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

    // Store channels in ref
    channelsRef.current = {
      posts: postsChannel,
      likes: likesChannel,
      stories: storiesChannel
    };

    return () => {
      postsChannel.unsubscribe();
      likesChannel.unsubscribe();
      storiesChannel.unsubscribe();
    };
  }, [blockingLoading, isAuthenticated]); // Re-run when auth status changes

  const handleScroll = () => {
    if (playingVideo) {
      setPlayingVideo(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
    loadFollowing();
    loadGymWorkouts();
  };

  // Filter posts based on active tab
  const filteredPosts = activeTab === 'my-gym' && currentUserGym
    ? posts.filter(post => (post.profiles as any).gym === currentUserGym)
    : posts;

  // ---------------------------
  // Virtualised list helpers
  // ---------------------------

  // Individual post renderer for FlashList
  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <FeedPost
        post={item}
        colors={colors}
        playingVideo={playingVideo}
        currentUserId={currentUserId}
        flaggedPosts={flaggedPosts}
        flagging={flagging}
        setFlagging={setFlagging}
        setFlaggedPosts={setFlaggedPosts}
        isAuthenticated={isAuthenticated}
        showAuthModal={showAuthModal}
        toggleVideoPlayback={toggleVideoPlayback}
        navigateToProfile={navigateToProfile}
        handleLike={handleLike}
        handleUnlike={handleUnlike}
        videoRefs={videoRefs}
      />
    ),
    [colors, playingVideo, currentUserId, flaggedPosts, flagging]
  );

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
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={[styles.logo, { color: colors.tint }]}>Gymsta</Text>
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          {!isAuthenticated && (
            <TouchableOpacity 
              style={styles.signInButton}
              onPress={() => router.push('/auth')}>
              <LogIn size={24} color={colors.tint} />
              <Text style={[styles.signInText, { color: colors.tint }]}>Sign In</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.weightButton}
            onPress={() => {
              if (!isAuthenticated) {
                showAuthModal();
                return;
              }
              router.push('/workout');
            }}>
            <Dumbbell size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>
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
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <FlashList
              data={filteredPosts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id}
              estimatedItemSize={600}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onScrollBeginDrag={handleScroll}
              ListHeaderComponent={() => (
                <StoriesRail
                  following={following}
                  theme={theme}
                  loadStories={loadStories}
                  isAuthenticated={isAuthenticated}
                  showAuthModal={showAuthModal}
                />
              )}
            />
          )
        ) : (
          <View style={styles.gymWorkoutsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : currentUserGym ? (
              filteredPosts.length > 0 || gymWorkouts.length > 0 ? (
                <>
                  {filteredPosts.map((post) => (
                    <FeedPost
                      key={post.id}
                      post={post}
                      colors={colors}
                      playingVideo={playingVideo}
                      currentUserId={currentUserId}
                      flaggedPosts={flaggedPosts}
                      flagging={flagging}
                      setFlagging={setFlagging}
                      setFlaggedPosts={setFlaggedPosts}
                      isAuthenticated={isAuthenticated}
                      showAuthModal={showAuthModal}
                      toggleVideoPlayback={toggleVideoPlayback}
                      navigateToProfile={navigateToProfile}
                      handleLike={handleLike}
                      handleUnlike={handleUnlike}
                      videoRefs={videoRefs}
                    />
                  ))}
                  
                  {gymWorkouts.map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      theme={theme}
                      onPress={handleWorkoutPress}
                    />
                  ))}
                </>
              ) : (
                <View style={styles.emptyGymContainer}>
                  <Text style={[styles.emptyGymText, { color: colors.textSecondary }]}>
                    No posts from your gym yet
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.emptyGymContainer}>
                <Text style={[styles.emptyGymText, { color: colors.textSecondary }]}>
                  Set your gym in profile settings to see posts from your gym
                </Text>
              </View>
            )}
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

      <WorkoutDetailModal
        workoutId={selectedWorkoutId}
        visible={showWorkoutModal}
        onClose={() => {
          setShowWorkoutModal(false);
          setSelectedWorkoutId(null);
        }}
      />
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
  headerButtons: {
    position: 'absolute',
    right: 15,
    top: 50,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginRight: 15,
  },
  signInText: {
    marginLeft: 5,
    fontWeight: '600',
  },
  weightButton: {
    padding: 8,
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
  postContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
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
    marginLeft: 12,
    alignSelf: 'flex-start',
  },
  flagButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 8,
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
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
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
  activeToggle: {},
});