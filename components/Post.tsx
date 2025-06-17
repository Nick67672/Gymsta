import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Pause, Play, Heart, Flag, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import { VideoView } from 'expo-video';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

// Temporary alias to bypass missing TS prop typings for expo-video
const Video: any = VideoView;

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
    is_verified?: boolean;
    gym?: string | null;
  };
  likes: {
    id: string;
    user_id: string;
  }[];
}

interface PostProps {
  post: Post;
  colors: any;
  playingVideo: string | null;
  currentUserId: string | null;
  flaggedPosts: { [postId: string]: boolean };
  flagging: { [postId: string]: boolean };
  setFlagging: React.Dispatch<React.SetStateAction<{ [postId: string]: boolean }>>;
  setFlaggedPosts: React.Dispatch<React.SetStateAction<{ [postId: string]: boolean }>>;
  isAuthenticated: boolean;
  showAuthModal: () => void;
  toggleVideoPlayback: (postId: string) => void;
  navigateToProfile: (userId: string, username: string) => void;
  handleLike: (postId: string) => void;
  handleUnlike: (postId: string) => void;
  videoRefs: React.MutableRefObject<{ [key: string]: any }>;
}

const PostComponent: React.FC<PostProps> = ({
  post,
  colors,
  playingVideo,
  currentUserId,
  flaggedPosts,
  flagging,
  setFlagging,
  setFlaggedPosts,
  isAuthenticated,
  showAuthModal,
  toggleVideoPlayback,
  navigateToProfile,
  handleLike,
  handleUnlike,
  videoRefs,
}) => {
  const isLiked = currentUserId ? post.likes.some(like => like.user_id === currentUserId) : false;

  const onFlagPress = useCallback(async () => {
    if (flaggedPosts[post.id] || flagging[post.id]) return;
    setFlagging(prev => ({ ...prev, [post.id]: true }));
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_flagged: true })
        .eq('id', post.id);
      if (!error) {
        setFlaggedPosts(prev => ({ ...prev, [post.id]: true }));
      } else {
        Alert.alert('Error', 'Failed to flag post.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to flag post.');
    } finally {
      setFlagging(prev => ({ ...prev, [post.id]: false }));
    }
  }, [flaggedPosts, flagging, post.id]);

  return (
    <View style={[styles.post, { backgroundColor: colors.card }]}>      
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() => navigateToProfile(post.profiles.id, post.profiles.username)}
      >
        <Image
          source={{
            uri:
              post.profiles.avatar_url ||
              `https://source.unsplash.com/random/40x40/?portrait&${post.profiles.id}`,
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
              ref={(ref: any) => {
                videoRefs.current[post.id] = ref;
              }}
              source={{ uri: post.image_url }}
              style={styles.videoContent}
              useNativeControls={false}
              isLooping
              shouldPlay={false}
            />
            <View style={styles.videoPlayButton}>
              {playingVideo === post.id ? <Pause size={40} color="#fff" /> : <Play size={40} color="#fff" />}
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imageContainer}>
          <Image source={{ uri: post.image_url }} style={styles.postImage} />
        </View>
      )}

      <View style={styles.postContent}>
        <View style={styles.postContentRow}>
          <View style={styles.captionContainer}>
            <Text
              style={[styles.username, { color: colors.text }]}
              onPress={() => navigateToProfile(post.profiles.id, post.profiles.username)}
            >
              {post.profiles.username}
            </Text>
            {post.caption && (
              <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>
                {post.caption}
              </Text>
            )}
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{new Date(post.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={styles.likeContainer}>
            <TouchableOpacity
              onPress={onFlagPress}
              style={styles.flagButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={flaggedPosts[post.id] || flagging[post.id]}
            >
              <Flag size={20} color={flaggedPosts[post.id] ? '#FFA500' : '#888'} fill={flaggedPosts[post.id] ? '#FFA500' : 'none'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!isAuthenticated) {
                  showAuthModal();
                  return;
                }
                isLiked ? handleUnlike(post.id) : handleLike(post.id);
              }}
            >
              <Heart size={24} color={colors.text} fill={isLiked ? colors.text : 'none'} />
            </TouchableOpacity>
            <Text style={[styles.likes, { color: colors.text }]}>{`${post.likes.length} likes`}</Text>
          </View>
        </View>
      </View>

      {post.product_id && (
        <TouchableOpacity
          style={styles.seeProductButton}
          onPress={() => {
            if (!isAuthenticated) {
              showAuthModal();
              return;
            }
            router.push(`/marketplace/${post.product_id}`);
          }}
        >
          <Text style={styles.seeProductText}>See Product</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PostComponent;

const styles = StyleSheet.create({
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
    aspectRatio: 16 / 9,
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
}); 