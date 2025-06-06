import { Tabs } from 'expo-router';
import { Chrome as Home, MessageSquare, SquarePlus as PlusSquare, ShoppingBag, User, Dumbbell } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { pickImageFromLibrary } from '@/lib/imagePickerUtils';

export default function TabLayout() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();

  const handleUploadPress = async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    try {
      const imageUri = await pickImageFromLibrary({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (imageUri) {
        // Navigate to the create post screen with the selected image
        router.push({
          pathname: "/upload",
          params: { imageUri }
        });
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Post',
          tabBarIcon: ({ color, size }) => <PlusSquare size={size} color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleUploadPress();
          },
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
          href: '/marketplace',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          href: '/profile',
        }}
      />
      <Tabs.Screen
        name="[username]"
        options={{
          href: null, // This hides the tab but keeps the route accessible
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          href: null, // This hides the workout tab but keeps the route accessible
        }}
      />
    </Tabs>
  );
}