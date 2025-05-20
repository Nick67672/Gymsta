import { Tabs } from 'expo-router';
import { Chrome as Home, MessageSquare, SquarePlus as PlusSquare, ShoppingBag, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const handleUploadPress = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Permission to access gallery was denied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        // Navigate to the create post screen with the selected image
        router.push({
          pathname: "/upload",
          params: { imageUri: result.assets[0].uri }
        });
      }
    } catch (err) {
      console.error('Error picking image:', err);
      alert('Failed to pick image');
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
    </Tabs>
  );
}