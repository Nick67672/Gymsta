import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface BlockingContextType {
  blockedUserIds: string[];
  blockingLoading: boolean;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isUserBlocked: (userId: string) => boolean;
  refreshBlockedUsers: () => Promise<void>;
}

const BlockingContext = createContext<BlockingContextType | undefined>(undefined);

export const BlockingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockingLoading, setBlockingLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const refreshBlockedUsers = useCallback(async () => {
    if (!isAuthenticated) {
      setBlockedUserIds([]);
      setBlockingLoading(false);
      return;
    }

    try {
      setBlockingLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setBlockedUserIds([]);
        setBlockingLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) {
        // Handle case where table doesn't exist yet
        if (error.code === '42P01') {
          console.warn('blocked_users table does not exist yet');
          setBlockedUserIds([]);
          setBlockingLoading(false);
          return;
        }
        throw error;
      }

      const blockedIds = (data as any)?.map((item: any) => item.blocked_id) || [];
      setBlockedUserIds(blockedIds);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      setBlockedUserIds([]);
    } finally {
      setBlockingLoading(false);
    }
  }, [isAuthenticated]);

  const blockUser = useCallback(async (userId: string) => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to block users');
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      if (user.id === userId) {
        throw new Error('Cannot block yourself');
      }

      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: userId
        } as any);

      if (error) {
        // Handle duplicate entry (user already blocked)
        if (error.code === '23505') {
          console.warn('User is already blocked');
          return;
        }
        throw error;
      }

      // Update local state immediately
      setBlockedUserIds(prev => [...prev, userId]);
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }, [isAuthenticated]);

  const unblockUser = useCallback(async (userId: string) => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to unblock users');
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id as any)
        .eq('blocked_id', userId as any);

      if (error) {
        throw error;
      }

      // Update local state immediately
      setBlockedUserIds(prev => prev.filter(id => id !== userId));
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }, [isAuthenticated]);

  const isUserBlocked = useCallback((userId: string) => {
    return blockedUserIds.includes(userId);
  }, [blockedUserIds]);

  useEffect(() => {
    refreshBlockedUsers();
  }, [refreshBlockedUsers]);

  const value: BlockingContextType = {
    blockedUserIds,
    blockingLoading,
    blockUser,
    unblockUser,
    isUserBlocked,
    refreshBlockedUsers,
  };

  return (
    <BlockingContext.Provider value={value}>
      {children}
    </BlockingContext.Provider>
  );
};

export const useBlocking = () => {
  const context = useContext(BlockingContext);
  if (context === undefined) {
    throw new Error('useBlocking must be used within a BlockingProvider');
  }
  return context;
}; 