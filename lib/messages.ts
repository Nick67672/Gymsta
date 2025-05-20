import { supabase } from './supabase';
import { Database } from '@/types/supabase';

type Message = Database['public']['Tables']['messages']['Row'];

export async function sendMessage(conversationId: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // The content will be automatically encrypted by the database trigger
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMessages(conversationId: string) {
  // Set the conversation context for decryption
  await supabase.rpc('set_conversation_context', { 
    conversation_id: conversationId 
  });

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      sender_id,
      created_at,
      content: decrypt_message(encrypted_content)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Helper function to decrypt a single message
export async function decryptMessage(message: Message) {
  if (!message.encrypted_content) return message;

  await supabase.rpc('set_conversation_context', { 
    conversation_id: message.conversation_id 
  });

  const { data, error } = await supabase
    .rpc('decrypt_message', { 
      encrypted_msg: message.encrypted_content 
    });

  if (error) throw error;
  return {
    ...message,
    content: data
  };
} 