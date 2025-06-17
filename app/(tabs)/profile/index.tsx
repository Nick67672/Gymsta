import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Platform, PanResponder } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CircleCheck as CheckCircle2, Heart, Settings, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import StoryViewer from '@/components/StoryViewer';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import WorkoutDetailModal from '@/components/WorkoutDetailModal';

interface ProfileStory {
  id: string;
  media_url: string;
  user_id: string;
  created_at?: string;
}

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  is_early_adopter: boolean;
  is_verified: boolean;
  _count: {
    followers: number;
    following: number;
    products?: number;
  };
  has_story: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
}

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes: any[];
}

interface WorkoutSummary {
  id: string;
  progress_image_url: string | null;
  created_at: string;
  exercises: {
    name: string;
  }[] | null;
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<ProfileStory[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showProgressImage, setShowProgressImage] = useState(false);
  const [selectedProgressImageUrl, setSelectedProgressImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [showingStories, setShowingStories] = useState(false);
  const [hasProducts, setHasProducts] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'progress'>('posts');
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  const [workoutDetails, setWorkoutDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const loadProfile = async () => {
    // Check if user is authenticated first
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Get profile with follower counts and check for stories
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          bio,
          avatar_url,
          is_early_adopter,
          is_verified,
          followers!followers_following_id_fkey(count),
          following:followers!followers_follower_id_fkey(count)
        `)
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        router.replace('/register');
        return;
      }

      // Load user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!postsError) {
        setPosts(postsData || []);
      }

      // Check if user has any products
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id);

      if (!productsError) {
        setProducts(userProducts || []);
        setHasProducts((userProducts ?? []).length > 0);
      }

      // Load user's stories
      const { data: storiesData } = await supabase
        .from('stories')
        .select('id, media_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setStories((storiesData as ProfileStory[]) || []);

      // Load user's workout progress
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, created_at, progress_image_url, exercises')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!workoutsError) {
        setWorkouts(workoutsData || []);
      }

      // Transform the data to include counts and story status
      setProfile({
        ...profileData,
        _count: {
          followers: profileData.followers?.[0]?.count || 0,
          following: profileData.following?.[0]?.count || 0,
        },
        has_story: !!(storiesData && storiesData.length > 0)
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Separate loader for workouts to ensure we refresh when switching tabs
  const loadWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, created_at, progress_image_url, exercises')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (workoutsError) {
        console.error('Error loading workouts for progress tab:', workoutsError);
        return;
      }

      console.log('Loaded workouts for progress tab:', workoutsData?.length);
      setWorkouts(workoutsData || []);
    } catch (err) {
      console.error('Unexpected error loading workouts:', err);
    }
  };

  const handleAddStory = async () => {
    if (uploadingStory) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your media library to add stories.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingStory(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        try {
          // Get file extension and MIME type
          const uri = result.assets[0].uri;
          const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          
          // Generate unique filename
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          if (Platform.OS === 'web') {
            // Web upload
            const response = await fetch(uri);
            if (!response.ok) throw new Error('Failed to fetch image data');
            
            const blob = await response.blob();
            
            // Upload to Supabase Storage with correct content type
            const { error: uploadError } = await supabase.storage
              .from('stories')
              .upload(fileName, blob, {
                contentType: mimeType,
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;
          } else {
            // Native upload
            const formData = new FormData();
            formData.append('file', {
              uri,
              name: fileName,
              type: mimeType,
            } as any);

            const { error: uploadError } = await supabase.storage
              .from('stories')
              .upload(fileName, formData, {
                contentType: 'multipart/form-data',
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(fileName);

          // Create story record
          const { error: storyError } = await supabase
            .from('stories')
            .insert({
              user_id: user.id,
              media_url: publicUrl,
              media_type: 'image'
            });

          if (storyError) throw storyError;

          // Reload profile to update story status
          await loadProfile();
          Alert.alert('Success', 'Your story has been uploaded!');
        } catch (err) {
          console.error('Story upload error:', err);
          throw new Error('Failed to upload story: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      }
    } catch (err) {
      console.error('Story upload error:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to upload story. Please try again.');
    } finally {
      setUploadingStory(false);
    }
  };

  const handleViewStories = () => {
    if (stories.length > 0) {
      setShowingStories(true);
    } else {
      handleAddStory();
    }
  };

  const navigateToSettings = () => {
    router.push('/profile/settings');
  };

  // Load profile on initial mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Reload profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  // Reload workouts whenever the user switches to the Progress tab
  useEffect(() => {
    if (activeTab === 'progress') {
      loadWorkouts();
    }
  }, [activeTab]);

  // Set up real-time subscription for follower changes
  useEffect(() => {
    if (!profile?.id) return;

    const subscription = supabase
      .channel(`followers_changes_${profile.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${profile.id}`,
        },
        () => {
          // Reload profile data when followers change
          loadProfile();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  // Load workout details when user swipes to details view
  useEffect(() => {
    const loadDetails = async () => {
      if (!showProgressImage || !selectedWorkoutId) return;
      if (workoutDetails && workoutDetails.id === selectedWorkoutId) return;

      try {
        setDetailsLoading(true);
        setDetailsError(null);
        const { data, error } = await supabase
          .from('workouts')
          .select(`
            id,
            date,
            exercises,
            caption,
            profiles (
              username,
              avatar_url
            )
          `)
          .eq('id', selectedWorkoutId)
          .single();

        if (error) throw error;
        setWorkoutDetails(data as any);
      } catch (err) {
        console.error('Error loading workout details:', err);
        setDetailsError('Failed to load workout');
      } finally {
        setDetailsLoading(false);
      }
    };

    loadDetails();
  }, [showProgressImage, selectedWorkoutId]);

  // PanResponder to detect horizontal swipe on progress photo viewer
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        // Swipe left to show details, swipe right back to image
        if (gestureState.dx < -50) {
          setShowProgressDetails(true);
        } else if (gestureState.dx > 50) {
          setShowProgressDetails(false);
        }
      },
    })
  ).current;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // Show sign-in interface for non-authenticated users
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Text style={[styles.logo, { color: colors.tint }]}>Gymsta</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.signInContainer}>
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error || 'Failed to load profile'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={[styles.logo, { color: colors.tint }]}>Gymsta</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={navigateToSettings}>
          <Settings size={24} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ backgroundColor: colors.background }}>
        <TouchableOpacity 
          onPress={handleViewStories}
          style={[
            styles.profileImageContainer,
            profile.has_story && styles.hasStoryRing,
            { backgroundColor: colors.background }
          ]}>
          <Image
            source={{ 
              uri: profile.avatar_url || 'https://source.unsplash.com/random/200x200/?portrait'
            }}
            style={styles.profileImage}
          />
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <View style={styles.usernameContainer}>
            <Text style={[styles.username, { color: colors.text }]}>{profile.username}</Text>
            {profile.is_verified && (
              <CheckCircle2 size={20} color="#fff" fill="#3B82F6" />
            )}
          </View>
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio || 'No bio yet'}</Text>
          
          <View style={[
            styles.buttonContainer,
            !hasProducts && styles.singleButtonContainer
          ]}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.button }]}
              onPress={() => router.push('/profile/edit')}>
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
            
            {hasProducts && (
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton, { backgroundColor: colors.background, borderColor: colors.tint }]}
                onPress={() => setShowProductsModal(true)}>
                <Text style={[styles.buttonText, styles.secondaryButtonText, { color: colors.tint }]}>See Products</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[
          styles.statsContainer, 
          { 
            borderTopColor: colors.border, 
            borderBottomColor: colors.border,
            backgroundColor: colors.background
          }
        ]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{posts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{profile._count.followers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{profile._count.following}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
          </View>
        </View>

        {/* Toggle Tabs */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'posts' && styles.activeToggle]}
            onPress={() => setActiveTab('posts')}
          >
            <Text
              style={[styles.toggleText, { color: colors.text }, activeTab === 'posts' && styles.activeToggleText]}
            >
              My Posts
            </Text>
            {activeTab === 'posts' && (
              <View style={[styles.underline, { backgroundColor: colors.tint }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'progress' && styles.activeToggle]}
            onPress={() => setActiveTab('progress')}
          >
            <Text
              style={[styles.toggleText, { color: colors.text }, activeTab === 'progress' && styles.activeToggleText]}
            >
              My Progress
            </Text>
            {activeTab === 'progress' && (
              <View style={[styles.underline, { backgroundColor: colors.tint }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'posts' ? (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postContainer}
                onPress={() => router.push(`/profile/${post.id}`)}>
                <Image source={{ uri: post.image_url }} style={styles.postImage} />
                {post.caption && (
                  <Text style={[styles.postCaption, { color: colors.text }]} numberOfLines={2}>
                    {post.caption}
                  </Text>
                )}
                <View style={styles.postInfo}>
                  <Text style={[styles.postTime, { color: colors.textSecondary }]}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </Text>
                  <View style={styles.likeContainer}>
                    <Heart size={16} color={colors.text} fill={colors.text} />
                    <Text style={[styles.likesCount, { color: colors.text }]}> {post.likes?.length || 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          workouts.length === 0 ? (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>No progress to show yet.</Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {workouts.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.postContainer}
                  onPress={() => {
                    setSelectedWorkoutId(workout.id);
                    if (workout.progress_image_url) {
                      setSelectedProgressImageUrl(workout.progress_image_url);
                      setShowProgressImage(true);
                      setWorkoutDetails(null);
                      setShowProgressDetails(false);
                    } else {
                      setShowWorkoutModal(true);
                    }
                  }}>
                  {workout.progress_image_url ? (
                    <Image source={{ uri: workout.progress_image_url }} style={styles.postImage} />
                  ) : (
                    <View style={[styles.noImageContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}>
                      <Text style={[styles.noImageText, { color: colors.textSecondary }]}
                        numberOfLines={2}>
                        {workout.exercises?.[0]?.name || 'Workout'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
      </ScrollView>

      <Modal
        visible={showingStories}
        animationType="fade"
        onRequestClose={() => setShowingStories(false)}>
        <StoryViewer
          stories={stories}
          onComplete={() => setShowingStories(false)}
        />
      </Modal>

      <Modal
        visible={showProductsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductsModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>My Products</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowProductsModal(false)}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.productsGrid}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productCard, { 
                    backgroundColor: colors.card,
                    shadowColor: colors.shadow
                  }]}
                  onPress={() => {
                    setShowProductsModal(false);
                    router.push(`/marketplace/${product.id}`);
                  }}>
                  <Image source={{ uri: product.image_url }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                    <Text style={[styles.productPrice, { color: colors.tint }]}>${product.price}</Text>
                    {product.description && (
                      <Text style={[styles.productDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {product.description}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Workout detail modal */}
      <WorkoutDetailModal
        workoutId={selectedWorkoutId}
        visible={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        hideProgressImage={true}
      />

      {/* Progress photo / details viewer modal */}
      <Modal
        visible={showProgressImage}
        animationType="fade"
        onRequestClose={() => {
          setShowProgressImage(false);
          setShowProgressDetails(false);
          setWorkoutDetails(null);
        }}>
        <View style={{ flex: 1, backgroundColor: 'black' }} {...panResponder.panHandlers}>
          {/* Back button for image view */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 50,
              left: 20,
              zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              padding: 10,
            }}
            onPress={() => {
              setShowProgressImage(false);
              setShowProgressDetails(false);
            }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>

          {!showProgressDetails ? (
            selectedProgressImageUrl && (
              <Image
                source={{ uri: selectedProgressImageUrl }}
                style={{ flex: 1, resizeMode: 'contain' }}
              />
            )
          ) : (
            <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
              <View style={{ padding: 15 }}>
                {detailsLoading ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <ActivityIndicator size="large" color={colors.tint} />
                  </View>
                ) : detailsError ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: colors.error, textAlign: 'center', fontSize: 16 }}>{detailsError}</Text>
                  </View>
                ) : workoutDetails ? (
                  <>
                    {/* Date */}
                    <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 15, marginTop: 40 }}>
                      {new Date(workoutDetails.created_at || workoutDetails.date).toLocaleDateString()}
                    </Text>

                    {/* Caption */}
                    {workoutDetails.caption && (
                      <Text style={{ color: colors.text, fontSize: 16, marginBottom: 20, lineHeight: 24 }}>
                        {workoutDetails.caption}
                      </Text>
                    )}

                    {/* Exercises */}
                    <View style={{ gap: 15, marginBottom: 20 }}>
                      {(workoutDetails.exercises || []).map((exercise: any, index: number) => (
                        <View 
                          key={index} 
                          style={{ 
                            backgroundColor: colors.card, 
                            borderRadius: 12, 
                            padding: 15 
                          }}>
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            marginBottom: 15 
                          }}>
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
                              {exercise.name}
                            </Text>
                            {exercise.isPR && (
                              <View style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                paddingHorizontal: 8, 
                                paddingVertical: 4, 
                                borderRadius: 12, 
                                backgroundColor: colors.tint + '20',
                                gap: 4 
                              }}>
                                <CheckCircle2 size={16} color={colors.tint} fill={colors.tint} />
                                <Text style={{ color: colors.tint, fontSize: 14, fontWeight: '600' }}>PR</Text>
                              </View>
                            )}
                          </View>

                          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>Set</Text>
                            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>Reps</Text>
                            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>Weight</Text>
                          </View>

                          {(exercise.sets || []).map((set: any, setIndex: number) => (
                            <View key={setIndex} style={{ flexDirection: 'row', marginBottom: 8 }}>
                              <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>{setIndex + 1}</Text>
                              <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>{set.reps}</Text>
                              <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>{set.weight} kg</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  header: {
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    padding: 8,
    zIndex: 10,
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginVertical: 20,
    padding: 3,
    borderRadius: 45,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 5,
    position: 'relative',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  bio: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
    width: '100%',
  },
  singleButtonContainer: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  primaryButton: {
    // Background color set through component
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButtonText: {
    // Color set through component
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 5,
  },
  postContainer: {
    width: '33.33%',
    padding: 5,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  postCaption: {
    fontSize: 12,
    marginTop: 5,
  },
  postInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  likesCount: {
    fontSize: 12,
  },
  hasStoryRing: {
    padding: 4,
    backgroundColor: '#3B82F6',
  },
  postTime: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
  },
  productsGrid: {
    padding: 15,
  },
  productCard: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButton: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 16,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginTop: 10,
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
  activeToggle: {},
  noImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  noImageText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
});