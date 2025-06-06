import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Plus, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import StoryViewer from '@/components/StoryViewer';

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

interface ChatPreview {
  id: string;
  last_message: string;
  created_at: string;
  participants: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  }[];
  recent_message?: {
    message: string;
    created_at: string;
  };
}

export default function ChatScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { blockedUserIds } = useBlocking();
  
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);
  const [showingStories, setShowingStories] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    // Get current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, [isAuthenticated]);

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
    if (!isAuthenticated) {
      router.push('/auth');
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

  const loadChats = async () => {
    if (!currentUserId || !isAuthenticated) return;
    
    try {
      // Get all chats where the current user is a participant
      const { data: userChats, error: chatsError } = await supabase
        .from('a_chat_users')
        .select(`
          chat:a_chat!inner (
            id,
            last_message,
            created_at,
            a_chat_users!inner (
              user_id,
              profiles:user_id (
                id,
                username,
                avatar_url,
                is_verified
              )
            )
          )
        `)
        .eq('user_id', currentUserId)
        .order('chat(created_at)', { ascending: false });

      if (chatsError) throw chatsError;

      if (userChats) {
        // Transform the data to get the other participant's info
        const transformedChats = userChats.map(({ chat }) => ({
          id: chat.id,
          last_message: chat.last_message,
          created_at: chat.created_at,
          participants: chat.a_chat_users
            .map(user => user.profiles)
            .filter(profile => profile.id !== currentUserId)
        }));

        // Filter out chats with blocked users
        const nonBlockedChats = transformedChats.filter(chat => 
          !chat.participants.some(participant => 
            blockedUserIds.includes(participant.id)
          )
        );

        // Now fetch the most recent message for each chat
        const chatsWithRecentMessages = await Promise.all(
          nonBlockedChats.map(async (chat) => {
            const { data: messages, error: messagesError } = await supabase
              .from('a_chat_messages')
              .select('message, created_at')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (messagesError) {
              console.error('Error fetching recent message:', messagesError);
              return chat;
            }
            
            return {
              ...chat,
              recent_message: messages && messages.length > 0 ? messages[0] : undefined
            };
          })
        );

        setChats(chatsWithRecentMessages);
      }
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUserId || !isAuthenticated) return;

    loadChats();
    loadFollowing();

    // Set up real-time subscription for new messages
    const messagesSubscription = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'a_chat_messages'
        },
        (payload) => {
          // When a new message is received, update the corresponding chat
          const chatId = payload.new.chat_id;
          const message = payload.new.message;
          const created_at = payload.new.created_at;

          setChats(prevChats => 
            prevChats.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  last_message: message,
                  recent_message: {
                    message,
                    created_at
                  }
                };
              }
              return chat;
            }).sort((a, b) => {
              // Sort chats by most recent message
              const aDate = a.recent_message?.created_at || a.created_at;
              const bDate = b.recent_message?.created_at || b.created_at;
              return new Date(bDate).getTime() - new Date(aDate).getTime();
            })
          );
        }
      )
      .subscribe();

    // Set up real-time subscription for chat updates
    const chatSubscription = supabase
      .channel('chat_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'a_chat'
        },
        () => {
          loadChats();
        }
      )
      .subscribe();

    // Set up real-time subscription for stories
    const storiesSubscription = supabase
      .channel('stories_changes')
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
      messagesSubscription.unsubscribe();
      chatSubscription.unsubscribe();
      storiesSubscription.unsubscribe();
    };
  }, [currentUserId, isAuthenticated]);

  const formatTime = (dateString: string) => {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      // Today - show time
      return messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      // Within a week - show day name
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      // More than a week ago - show date
      return messageDate.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleNewChat = () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    router.push('/chat/search');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
      </View>

      {!isAuthenticated ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>Sign in to view your messages</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Connect with other users and start conversations
          </Text>
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView style={styles.chatList}>
          {/* Stories Section */}
          {following.filter(profile => profile.has_story).length > 0 && (
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
          )}

          {chats.length > 0 ? (
            chats.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={[styles.chatPreview, { borderBottomColor: colors.border }]}
                onPress={() => {
                  const participant = chat.participants[0];
                  router.push({
                    pathname: `/chat/${participant.username}`,
                    params: { avatarUrl: participant.avatar_url || undefined }
                  });
                }}>
                <Image
                  source={{
                    uri: chat.participants[0]?.avatar_url ||
                      `https://source.unsplash.com/random/100x100/?portrait&${chat.participants[0]?.username}`
                  }}
                  style={styles.avatar}
                />
                <View style={styles.chatInfo}>
                  <View style={styles.topLine}>
                    <View style={styles.usernameContainer}>
                      <Text style={[styles.username, { color: colors.text }]}>
                        {chat.participants[0]?.username}
                      </Text>
                      {chat.participants[0]?.is_verified && (
                        <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
                      )}
                    </View>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>
                      {formatTime(chat.recent_message?.created_at || chat.created_at)}
                    </Text>
                  </View>
                  <Text 
                    style={[styles.lastMessage, { color: colors.textSecondary }]}
                    numberOfLines={2}>
                    {chat.recent_message?.message || chat.last_message || 'No messages yet'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.text }]}>No messages yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Start a conversation by tapping the plus button
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity 
        style={[styles.floatingButton, { backgroundColor: colors.tint }]}
        onPress={handleNewChat}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

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
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
  chatList: {
    flex: 1,
  },
  storiesContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
  chatPreview: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
});