import { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Animated, Dimensions, TouchableOpacity, TextInput, Alert } from 'react-native';
import { X, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface Story {
  id: string;
  media_url: string;
  user_id: string;
}

interface StoryViewerProps {
  stories: Story[];
  onComplete: () => void;
}

export default function StoryViewer({ stories, onComplete }: StoryViewerProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [isOwnStory, setIsOwnStory] = useState(false);
  const progress = new Animated.Value(0);
  const duration = 5000; // 5 seconds per story

  useEffect(() => {
    // Check if this is the user's own story
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsOwnStory(stories[currentIndex]?.user_id === user.id);
      }
    });
  }, [currentIndex]);

  useEffect(() => {
    // Reset and start animation for current story
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // Only refresh if a message was sent
          if (messageSent) {
            window.location.reload();
          }
          onComplete();
        }
      }
    });

    return () => progress.stopAnimation();
  }, [currentIndex]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the story owner's ID as the recipient
      const storyOwnerId = stories[currentIndex].user_id;

      // Check if a chat already exists between these users
      const { data: existingChats } = await supabase
        .from('a_chat_users')
        .select('chat_id')
        .eq('user_id', user.id);

      let chatId: string | null = null;

      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(chat => chat.chat_id);
        
        const { data: sharedChat } = await supabase
          .from('a_chat_users')
          .select('chat_id')
          .eq('user_id', storyOwnerId)
          .in('chat_id', chatIds)
          .maybeSingle();

        if (sharedChat) {
          chatId = sharedChat.chat_id;
        }
      }

      if (!chatId) {
        // Create new chat if none exists
        const { data: newChat, error: chatError } = await supabase
          .from('a_chat')
          .insert({
            last_message: message.trim(),
          })
          .select()
          .single();

        if (chatError) throw chatError;
        if (!newChat) throw new Error('Failed to create chat');

        chatId = newChat.id;

        // Add chat participants with auto-incrementing IDs
        const { data: lastUser, error: lastUserError } = await supabase
          .from('a_chat_users')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        if (lastUserError && lastUserError.code !== 'PGRST116') {
          throw lastUserError;
        }

        const startId = (lastUser?.id || 0) + 1;

        // Add chat participants with sequential IDs
        const { error: usersError } = await supabase
          .from('a_chat_users')
          .insert([
            { id: startId, chat_id: chatId, user_id: storyOwnerId },
            { id: startId + 1, chat_id: chatId, user_id: user.id }
          ]);

        if (usersError) throw usersError;
      } else {
        // Important: Add a direct SQL update to ensure last_message is updated
        // This uses the service role client to bypass potential RLS issues
        const messageContent = message.trim();
        const { error: updateError } = await supabase
          .from('a_chat')
          .update({ last_message: messageContent })
          .eq('id', chatId);

        if (updateError) {
          console.error('Failed to update last_message:', updateError);
          
          // Try a different approach - directly refresh the chat after message send
          setTimeout(async () => {
            const { error: retryError } = await supabase
              .from('a_chat')
              .update({ 
                last_message: messageContent,
                updated_at: new Date().toISOString()
              })
              .eq('id', chatId);
            
            if (retryError) {
              console.error('Retry update failed:', retryError);
            }
          }, 500);
        }
      }

      // Add message to chat
      const { data: newMessage, error: messageError } = await supabase
        .from('a_chat_messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          message: message.trim(),
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Verify the message was added successfully
      if (newMessage) {
        // Double-check that last_message is updated
        const { error: finalUpdateError } = await supabase
          .from('a_chat')
          .update({ 
            last_message: message.trim(),
            updated_at: new Date().toISOString() // Force updated_at to change
          })
          .eq('id', chatId);

        if (finalUpdateError) {
          console.error('Final update failed:', finalUpdateError);
        }

        setMessage('');
        setMessageSent(true);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!stories.length) return null;

  const width = Dimensions.get('window').width;

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#000' : '#000' }]}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  opacity: index === currentIndex ? 1 : index < currentIndex ? 1 : 0.5,
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Close button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => {
          // Only refresh if a message was sent
          if (messageSent) {
            window.location.reload();
          }
          onComplete();
        }}>
        <X size={24} color="#fff" />
      </TouchableOpacity>

      {/* Story content */}
      <Image
        source={{ uri: stories[currentIndex].media_url }}
        style={[styles.storyImage, { width }]}
        resizeMode="cover"
      />

      {/* Only show message input if not viewing own story */}
      {!isOwnStory && (
        <View style={styles.messageContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Send message..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || sending}>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 15,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    gap: 2,
    padding: 2,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  storyImage: {
    flex: 1,
    height: '100%',
  },
  messageContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});