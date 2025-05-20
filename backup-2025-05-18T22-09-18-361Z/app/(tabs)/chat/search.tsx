import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { X, Search as SearchIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .neq('id', user.id)
        .ilike('username', `%${query}%`)
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (user: User) => {
    router.push({
      pathname: `/chat/${user.username}`,
      params: { avatarUrl: user.avatar_url || undefined }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        borderBottomColor: colors.border,
        backgroundColor: colors.background
      }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
          <SearchIcon size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchUsers(text);
            }}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { 
              backgroundColor: colors.background,
              borderColor: colors.error 
            }]}
            onPress={() => searchUsers(searchQuery)}>
            <Text style={[styles.retryButtonText, { color: colors.error }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.userItem, { borderBottomColor: colors.border }]}
              onPress={() => handleUserPress(item)}>
              <Image
                source={{
                  uri: item.avatar_url ||
                    `https://source.unsplash.com/random/100x100/?portrait&${item.id}`
                }}
                style={styles.avatar}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
                {item.bio && (
                  <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.bio}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    outlineStyle: 'none',
  },
  closeButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 15,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    marginRight: 10,
  },
  retryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userItem: {
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
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});