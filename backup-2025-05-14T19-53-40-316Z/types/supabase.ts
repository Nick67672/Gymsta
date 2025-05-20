export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          caption: string | null
          image_url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          caption?: string | null
          image_url: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          caption?: string | null
          image_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          seller_id: string
          name: string
          description: string | null
          price: number
          image_url: string
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          name: string
          description?: string | null
          price: number
          image_url: string
          category: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string
          category?: string
          created_at?: string
          updated_at?: string
        }
        messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string | null
          encrypted_content: unknown
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string | null
          encrypted_content?: unknown
          created_at?: string
        }
      }
      }
    }
  }
}