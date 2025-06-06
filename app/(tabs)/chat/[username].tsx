import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ArrowLeft, Send, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  chat_id: string;
}

interface Profile {
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
}

export default function UserProfileScreen() {
  const { username, avatarUrl } = useLocalSearchParams();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { isUserBlocked } = useBlocking();
  const insets = useSafeAreaInsets();
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByRecipient, setBlockedByRecipient] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setLoading(false);
      router.replace('/auth');
      return;
    }
    
    // Get current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, [isAuthenticated]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Load chat when currentUserId is available
  useEffect(() => {
    if (!currentUserId || !isAuthenticated) return;

    const loadChat = async () => {
      try {
        setLoading(true);
        
        // Get recipient's profile
        const { data: recipient, error: recipientError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_verified')
          .eq('username', username)
          .single();

        if (recipientError) throw recipientError;
        if (!recipient) throw new Error('Recipient not found');

        setRecipientId(recipient.id);
        setRecipientProfile({
          username: recipient.username,
          avatar_url: recipient.avatar_url,
          is_verified: recipient.is_verified
        });

        // Check if user is blocked or has blocked the recipient
        const userBlocked = isUserBlocked(recipient.id);
        setIsBlocked(userBlocked);

        // Check if recipient has blocked the current user
        const { data: blockedByData, error: blockedByError } = await supabase
          .from('blocked_users')
          .select('id')
          .eq('blocker_id', recipient.id)
          .eq('blocked_id', currentUserId)
          .maybeSingle();

        if (blockedByError && blockedByError.code !== '42P01') {
          console.error('Error checking blocked status:', blockedByError);
        }

        const blockedByRecipientStatus = !!blockedByData;
        setBlockedByRecipient(blockedByRecipientStatus);

        // If blocked in either direction, show alert and return to chat list
        if (userBlocked || blockedByRecipientStatus) {
          Alert.alert(
            'Unable to Message',
            userBlocked 
              ? 'You have blocked this user. Unblock them to send messages.'
              : 'This user has blocked you and you cannot send them messages.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/chat')
              }
            ]
          );
          setLoading(false);
          return;
        }

        // Continue with loading chat if not blocked
        // First, check if there's an existing chat where both users are participants
        const { data: existingChats, error: chatsError } = await supabase
          .from('a_chat_users')
          .select('chat_id')
          .eq('user_id', currentUserId);

        if (chatsError) throw chatsError;

        if (existingChats && existingChats.length > 0) {
          const chatIds = existingChats.map(chat => chat.chat_id);
          
          const { data: sharedChat, error: sharedError } = await supabase
            .from('a_chat_users')
            .select('chat_id')
            .eq('user_id', recipient.id)
            .in('chat_id', chatIds)
            .maybeSingle();

          if (sharedError) throw sharedError;

          if (sharedChat) {
            setChatId(sharedChat.chat_id);
            await loadMessages(sharedChat.chat_id);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading chat:', err);
        setLoading(false);
      }
    };

    loadChat();
  }, [currentUserId, username, isAuthenticated, isUserBlocked]);

  const loadMessages = async (chat_id: string) => {
    try {
      const { data: messages, error: messagesError } = await supabase
        .from('a_chat_messages')
        .select('*')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messages || []);
      
      // Scroll to bottom after messages load
      if (Platform.OS === 'ios') {
        requestAnimationFrame(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: false });
          }
        });
      } else {
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: false });
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending || !currentUserId || !recipientId || !isAuthenticated) return;
    
    // Double-check blocking status before sending
    if (isBlocked || blockedByRecipient) {
      Alert.alert(
        'Unable to Send Message',
        isBlocked 
          ? 'You have blocked this user. Unblock them to send messages.'
          : 'This user has blocked you and you cannot send them messages.'
      );
      return;
    }

    setSending(true);
    setError(null);

    try {
      let currentChatId = chatId;

      if (!currentChatId) {
        // Create a new chat
        const { data: newChat, error: chatError } = await supabase
          .from('a_chat')
          .insert({
            last_message: message.trim(),
          })
          .select()
          .single();

        if (chatError) throw chatError;
        if (!newChat) throw new Error('Failed to create chat');

        currentChatId = newChat.id;
        setChatId(currentChatId);

        // Get the next available ID for chat users
        const { data: maxId } = await supabase
          .from('a_chat_users')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        const nextId = (maxId?.id || 0) + 1;

        // Add chat participants with sequential IDs
        const { error: participantsError } = await supabase
          .from('a_chat_users')
          .insert([
            { id: nextId, chat_id: currentChatId, user_id: currentUserId },
            { id: nextId + 1, chat_id: currentChatId, user_id: recipientId }
          ]);

        if (participantsError) throw participantsError;
      } else {
        // Update existing chat's last message
        const { error: updateError } = await supabase
          .from('a_chat')
          .update({ last_message: message.trim() })
          .eq('id', currentChatId);

        if (updateError) throw updateError;
      }

      // Add the message
      const { data: newMessage, error: messageError } = await supabase
        .from('a_chat_messages')
        .insert({
          chat_id: currentChatId,
          user_id: currentUserId,
          message: message.trim(),
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update messages list
      if (newMessage) {
        setMessages(prev => [...prev, newMessage]);
        // Scroll to bottom after new message
        if (Platform.OS === 'ios') {
          requestAnimationFrame(() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          });
        } else {
          setTimeout(() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        }
      }

      // Clear the input
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Will be redirected in useEffect
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isBlocked || blockedByRecipient) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isBlocked ? 'User Blocked' : 'Cannot Message'}
          </Text>
        </View>
        <View style={styles.blockedContainer}>
          <Text style={[styles.blockedText, { color: colors.text }]}>
            {isBlocked 
              ? 'You have blocked this user. Unblock them to send messages.'
              : 'This user has blocked you and you cannot send them messages.'
            }
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={[styles.header, { 
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
        paddingTop: insets.top + 10
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.profileSection}>
          <Image
            source={{
              uri: avatarUrl as string ||
                `https://source.unsplash.com/random/200x200/?portrait&${username}`
            }}
            style={styles.avatar}
          />
          <View style={styles.usernameContainer}>
            <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
            {recipientProfile?.is_verified && (
              <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
            )}
          </View>
        </View>
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBox,
                msg.user_id === currentUserId ? 
                  [styles.sentMessage, { backgroundColor: colors.tint }] : 
                  [styles.receivedMessage, { backgroundColor: colors.card }]
              ]}>
              <Text style={[
                styles.messageText,
                msg.user_id === currentUserId ? 
                  [styles.sentMessageText, { color: '#fff' }] : 
                  [styles.receivedMessageText, { color: colors.text }]
              ]}>{msg.message}</Text>
              <Text style={[
                styles.messageTime,
                msg.user_id === currentUserId ? 
                  [styles.sentMessageTime, { color: 'rgba(255, 255, 255, 0.7)' }] : 
                  [styles.receivedMessageTime, { color: colors.textSecondary }]
              ]}>
                {formatTime(msg.created_at)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No messages yet</Text>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { 
        borderTopColor: colors.border,
        backgroundColor: colors.card,
        paddingBottom: Math.max(insets.bottom, 15)
      }]}>
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.inputBackground,
            color: colors.text
          }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton, 
            (!message.trim() || sending) && styles.sendButtonDisabled,
            { backgroundColor: colors.tint }
          ]}
          onPress={handleSend}
          disabled={!message.trim() || sending}>
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 15,
    margin: 15,
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messagesContent: {
    flexGrow: 1,
  },
  loader: {
    marginTop: 20,
  },
  messageBox: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  sentMessageText: {
  },
  receivedMessageText: {
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  sentMessageTime: {
  },
  receivedMessageTime: {
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedText: {
    textAlign: 'center',
  },
});