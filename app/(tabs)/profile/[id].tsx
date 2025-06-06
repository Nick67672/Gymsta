import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Dimensions, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, Pause, Play, MoreVertical } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';

interface Post {
  id: string;
  caption: string | null;
  image_url: string;
  media_type: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  likes: {
    id: string;
    user_id: string;
  }[];
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isAuthenticated, showAuthModal } = useAuth();
  const { blockUser } = useBlocking();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<Video>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [blocking, setBlocking] = useState(false);
  
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    // Get current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          image_url,
          media_type,
          created_at,
          profiles (
            id,
            username,
            avatar_url
          ),
          likes (
            id,
            user_id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Set default media_type to 'image' for backward compatibility
      setPost({
        ...data,
        media_type: data.media_type || 'image'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post || !currentUserId || likeLoading) return;

    setLikeLoading(true);
    try {
      const isLiked = post.likes.some(like => like.user_id === currentUserId);

      if (isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);

        setPost(prev => prev ? {
          ...prev,
          likes: prev.likes.filter(like => like.user_id !== currentUserId)
        } : null);
      } else {
        // Like
        const { data } = await supabase
          .from('likes')
          .insert({
            post_id: post.id,
            user_id: currentUserId,
          })
          .select()
          .single();

        if (data) {
          setPost(prev => prev ? {
            ...prev,
            likes: [...prev.likes, data]
          } : null);
        }
      }
    } catch (err) {
      console.error('Error updating like:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post?.id);

              if (error) throw error;

              // Navigate back to profile
              router.replace('/profile');
            } catch (err) {
              console.error('Error deleting post:', err);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (post && currentUserId) {
      // If viewing own post, go to profile tab
      if (post.profiles.id === currentUserId) {
        router.push('/profile');
      } else {
        // If viewing someone else's post, go back to their profile
        router.push(`/${post.profiles.username}`);
      }
    } else {
      router.back();
    }
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
    }
  };

  const handleMenu = () => {
    Alert.alert(
      'Post Options',
      undefined,
      [
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: handleDelete,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleBlockUser = async () => {
    if (!post) return;
    
    try {
      setBlocking(true);
      setShowMenu(false);
      
      await blockUser(post.profiles.id);
      
      Alert.alert(
        'User Blocked', 
        `You have blocked ${post.profiles.username}. They will no longer be able to message you, and you won't see their posts.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to avoid showing blocked user's content
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    } finally {
      setBlocking(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.error}>{error || 'Post not found'}</Text>
      </View>
    );
  }

  const isLiked = currentUserId ? post.likes.some(like => like.user_id === currentUserId) : false;
  const isOwnPost = currentUserId === post.profiles.id;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        {!isOwnPost && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setShowMenu(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreVertical size={22} color="#333" />
          </TouchableOpacity>
        )}
        {isOwnPost && (
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={handleMenu}
            disabled={deleting}>
            <Text style={styles.menuButtonText}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.postContainer}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: post.profiles.avatar_url ||
                'https://source.unsplash.com/random/100x100/?portrait'
            }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{post.profiles.username}</Text>
        </View>

        {post.media_type === 'video' ? (
          <View style={styles.videoWrapper}>
            <View style={styles.videoBackdrop} />
            <TouchableOpacity 
              style={styles.videoContainer}
              activeOpacity={0.9}
              onPress={togglePlayback}
            >
              <Video
                ref={videoRef}
                source={{ uri: post.image_url }}
                style={styles.videoContent}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls={false}
                isLooping
                shouldPlay={false}
                onPlaybackStatusUpdate={status => {
                  setIsPlaying(status?.isPlaying || false);
                }}
              />
              <View style={styles.videoPlayButton}>
                {isPlaying ? (
                  <Pause size={40} color="#fff" />
                ) : (
                  <Play size={40} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <Image
            source={{ uri: post.image_url }}
            style={styles.postImage}
            resizeMode="contain"
          />
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={handleLike}
            disabled={likeLoading}>
            <Heart
              size={28}
              color="#333"
              fill={isLiked ? '#333' : 'none'}
            />
          </TouchableOpacity>
          <Text style={styles.likesCount}>
            {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
          </Text>
        </View>

        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>
              <Text style={styles.username}>{post.profiles.username}</Text>{' '}
              {post.caption}
            </Text>
          </View>
        )}

        <Text style={styles.timestamp}>
          {new Date(post.created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Block User Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPopup}>
            <TouchableOpacity 
              style={[styles.blockButton, blocking && { opacity: 0.7 }]} 
              onPress={handleBlockUser}
              disabled={blocking}
            >
              {blocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.blockButtonText}>Block User</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    color: '#ff4444',
    textAlign: 'center',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 10,
    marginLeft: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  menuButton: {
    padding: 10,
    marginRight: 10,
  },
  menuButtonText: {
    fontSize: 24,
    color: '#333',
  },
  postContainer: {
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
    fontWeight: '600',
    fontSize: 16,
  },
  postImage: {
    width: '100%',
    height: 400,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16/9,
    maxHeight: 400,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
  },
  videoBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 0,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  videoContent: {
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  videoPlayButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 30,
    width: 60,
    height: 60,
    zIndex: 3,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  likeButton: {
    marginRight: 10,
  },
  likesCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  captionContainer: {
    marginTop: 15,
  },
  caption: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
  },
  moreButton: {
    padding: 10,
    marginRight: 10,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuPopup: {
    marginTop: 60,
    marginRight: 20,
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  blockButton: {
    paddingVertical: 8,
  },
  blockButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
});