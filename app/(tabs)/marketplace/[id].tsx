import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  category: string;
  seller: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          image_url,
          description,
          category,
          seller:profiles!seller_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    router.push(`/marketplace/${id}/shipping`);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error || 'Product not found'}</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}
          onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}
        onPress={() => router.back()}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        <Image
          source={{ uri: product.image_url }}
          style={styles.productImage}
          resizeMode="cover"
        />

        <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
          <Text style={[styles.productPrice, { color: colors.tint }]}>${product.price.toFixed(2)}</Text>
          
          <TouchableOpacity
            style={[styles.sellerInfo, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => router.push(`/${product.seller.username}`)}>
            <Image
              source={{
                uri: product.seller.avatar_url ||
                  'https://source.unsplash.com/random/100x100/?portrait'
              }}
              style={styles.sellerAvatar}
            />
            <Text style={[styles.sellerName, { color: colors.textSecondary }]}>Sold by {product.seller.username}</Text>
          </TouchableOpacity>

          {product.description && (
            <Text style={[styles.description, { color: colors.text }]}>{product.description}</Text>
          )}

          <TouchableOpacity
            style={[styles.checkoutButton, { backgroundColor: colors.tint }]}
            onPress={handleCheckout}>
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
    marginBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 5,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  productImage: {
    width: '100%',
    height: 400,
  },
  contentContainer: {
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    borderRadius: 10,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  sellerName: {
    fontSize: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  checkoutButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  menuPopup: {
    marginTop: 60,
    marginRight: 20,
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 120,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 5,
  },
});