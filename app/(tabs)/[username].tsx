import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquare, MoreVertical } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  _count: {
    followers: number;
    following: number;
  };
  is_following: boolean;
}

interface Post {
  id: string;
  caption: string | null;
  image_url: string;
  created_at: string;
  likes: {
    id: string;
  }[];
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { blockUser, isUserBlocked } = useBlocking();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    // Get current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get profile with follower counts
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          bio,
          avatar_url,
          followers!followers_following_id_fkey(count),
          following:followers!followers_follower_id_fkey(count)
        `)
        .eq('username', username)
        .single();

      if (profileError) throw profileError;

      if (!profileData) {
        setError('Profile not found');
        return;
      }

      // If this is the current user's profile, redirect to the profile tab
      if (user && profileData.id === user.id) {
        router.replace('/(tabs)/profile');
        return;
      }

      // Check if the current user is following this profile
      let isFollowing = false;
      if (user) {
        const { data: followData } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle();
        
        isFollowing = !!followData;
      }

      setProfile({
        ...profileData,
        _count: {
          followers: profileData.followers?.[0]?.count || 0,
          following: profileData.following?.[0]?.count || 0,
        },
        is_following: isFollowing,
      });

      // Load user's posts with likes
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, caption, image_url, created_at, likes(id)')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || followLoading) return;

    setFollowLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to follow users');
        return;
      }

      if (profile.is_following) {
        // Unfollow
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);

        setProfile(prev => prev ? {
          ...prev,
          is_following: false,
          _count: {
            ...prev._count,
            followers: prev._count.followers - 1
          }
        } : null);
      } else {
        // Follow
        await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: profile.id,
          });

        setProfile(prev => prev ? {
          ...prev,
          is_following: true,
          _count: {
            ...prev._count,
            followers: prev._count.followers + 1
          }
        } : null);
      }
    } catch (err) {
      console.error('Error following/unfollowing:', err);
      setError('Failed to update follow status');
      // Reload profile to ensure correct state
      loadProfile();
    } finally {
      setFollowLoading(false);
    }
  };

  const startChat = async () => {
    if (!profile || !currentUserId || chatLoading) return;

    setChatLoading(true);
    try {
      // Check if a conversation already exists
      const { data: existingConversations, error: searchError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)
        .in('conversation_id', (
          supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', profile.id)
        ));

      if (searchError) throw searchError;

      // If conversation exists, use the first one
      if (existingConversations && existingConversations.length > 0) {
        router.push(`/chat/${existingConversations[0].conversation_id}`);
        return;
      }

      // If no conversation exists, create a new one
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (createError) throw createError;
      if (!newConversation) throw new Error('Failed to create conversation');

      // Add both users as participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: currentUserId },
          { conversation_id: newConversation.id, user_id: profile.id }
        ]);

      if (participantsError) throw participantsError;

      // Navigate to the new conversation
      router.push(`/chat/${newConversation.id}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Failed to start chat');
    } finally {
      setChatLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!profile) return;
    
    try {
      setBlocking(true);
      setShowMenu(false);
      
      await blockUser(profile.id);
      
      Alert.alert(
        'User Blocked', 
        `You have blocked ${profile.username}. They will no longer be able to message you, and you won't see their posts.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to avoid showing blocked user's profile
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

  const handleReportUser = async () => {
    if (!profile) return;
    
    try {
      setReporting(true);
      setShowMenu(false);
      
      // Update the is_reported column to true in the profiles table
      const { error: reportError } = await supabase
        .from('profiles')
        .update({ is_reported: true })
        .eq('id', profile.id);

      if (reportError) throw reportError;
      
      Alert.alert(
        'User Reported', 
        `You have reported ${profile.username}. Our team will review this report and take appropriate action.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back after reporting
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error reporting user:', error);
      Alert.alert('Error', 'Failed to report user. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  // Load profile when username changes
  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  // Set up real-time subscription for follower changes
  useEffect(() => {
    if (!profile?.id) return;

    const subscription = supabase
      .channel('followers_changes')
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
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
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
          
          <Image
            source={{ uri: 'https://source.unsplash.com/random/400x200/?gym' }}
            style={styles.coverImage}
          />
          <View style={[styles.profileImageContainer, { backgroundColor: colors.background }]}>
            <Image
              source={{ 
                uri: profile.avatar_url || 'https://source.unsplash.com/random/200x200/?portrait'
              }}
              style={styles.profileImage}
            />
          </View>
          <Text style={[styles.username, { color: colors.text }]}>{profile.username}</Text>
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio || 'No bio yet'}</Text>
          
          {currentUserId && currentUserId !== profile.id && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  profile.is_following && [styles.followingButton, { backgroundColor: colors.background, borderColor: colors.tint }],
                  followLoading && styles.buttonDisabled
                ]}
                onPress={handleFollow}
                disabled={followLoading}>
                {followLoading ? (
                  <ActivityIndicator size="small" color={profile.is_following ? colors.tint : '#fff'} />
                ) : (
                  <Text style={[
                    styles.followButtonText,
                    profile.is_following && { color: colors.tint }
                  ]}>
                    {profile.is_following ? 'Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.messageButton, chatLoading && styles.buttonDisabled]}
                onPress={startChat}
                disabled={chatLoading}>
                {chatLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MessageSquare size={20} color="#fff" style={styles.messageIcon} />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => setShowMenu(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MoreVertical size={22} color="#333" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.statsContainer, { 
          borderTopColor: colors.border,
          borderBottomColor: colors.border,
          backgroundColor: colors.background
        }]}>
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
                <Text style={[styles.likesCount, { color: colors.text }]}>
                  {post.likes?.length || 0} ❤️
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPopup}>
            <TouchableOpacity 
              style={[styles.blockButton, blocking && styles.buttonDisabled]} 
              onPress={handleBlockUser}
              disabled={blocking}
            >
              {blocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.blockButtonText}>Block User</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.reportButton, reporting && styles.buttonDisabled]}
              onPress={handleReportUser}
              disabled={reporting}
            >
              {reporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.reportButtonText}>Report User</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
  },
  coverImage: {
    width: '100%',
    height: 150,
  },
  profileImageContainer: {
    marginTop: -50,
    padding: 5,
    borderRadius: 75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  bio: {
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  followButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  followingButton: {
    borderWidth: 1,
  },
  messageButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  messageIcon: {
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  messageButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 15,
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
  postTime: {
    fontSize: 10,
    marginTop: 2,
  },
  postInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  likesCount: {
    fontSize: 12,
  },
  moreButton: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPopup: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  blockButton: {
    backgroundColor: '#6C5CE7',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  blockButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#DC3545',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});