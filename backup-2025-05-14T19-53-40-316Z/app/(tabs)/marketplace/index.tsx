import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { Search, ShoppingBag, LayoutGrid, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  category: string;
  seller: {
    username: string;
    avatar_url: string | null;
  };
}

export default function MarketplaceScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [mode, setMode] = useState<'buyer' | 'seller'>('buyer');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadProducts = async () => {
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
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setFeaturedProducts(data.slice(0, 2));
        setProducts(data.slice(2));
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permission to access gallery was denied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setProductImage(result.assets[0].uri);
        setError(null);
      }
    } catch (err) {
      setError('Failed to pick image');
    }
  };

  const handleUpload = async () => {
    if (!productName || !productPrice || !productImage) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to list products');
        return;
      }

      const fileName = `${user.id}/${Date.now()}.jpg`;
      const response = await fetch(productImage);
      const blob = await response.blob();
      
      const { error: uploadError, data } = await supabase.storage
        .from('products')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      const { error: productError } = await supabase
        .from('products')
        .insert({
          seller_id: user.id,
          name: productName.trim(),
          price: parseFloat(productPrice),
          image_url: publicUrl,
          category: 'fitness',
        });

      if (productError) throw productError;

      setProductName('');
      setProductPrice('');
      setProductImage(null);
      setMode('buyer');
      loadProducts();
    } catch (err) {
      console.error('Product upload error:', err);
      setError('Failed to upload product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.logo, { color: colors.tint }]}>Gymsta</Text>
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={() => setMode(mode === 'buyer' ? 'seller' : 'buyer')}>
          <View style={[
            styles.toggleOption,
            mode === 'buyer' && [styles.toggleOptionActive, { backgroundColor: colors.tint }]
          ]}>
            <ShoppingBag size={16} color={mode === 'buyer' ? '#fff' : colors.tint} />
            <Text style={[
              styles.toggleText,
              { color: mode === 'buyer' ? '#fff' : colors.tint }
            ]}>Buyer</Text>
          </View>
          <View style={[
            styles.toggleOption,
            mode === 'seller' && [styles.toggleOptionActive, { backgroundColor: colors.tint }]
          ]}>
            <LayoutGrid size={16} color={mode === 'seller' ? '#fff' : colors.tint} />
            <Text style={[
              styles.toggleText,
              { color: mode === 'seller' ? '#fff' : colors.tint }
            ]}>Seller</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.searchWrapper}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
            <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search products..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      {mode === 'buyer' ? (
        <ScrollView 
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          scrollEventThrottle={16}
        >
          {loadingProducts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Products</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredContainer}>
                {featuredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.featuredProduct, { 
                      backgroundColor: colors.card,
                      shadowColor: colors.shadow
                    }]}
                    onPress={() => router.push(`/marketplace/${product.id}`)}>
                    <Image source={{ uri: product.image_url }} style={styles.featuredImage} />
                    <View style={styles.featuredInfo}>
                      <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                      <Text style={[styles.productPrice, { color: colors.tint }]}>${product.price}</Text>
                      <Text style={[styles.sellerName, { color: colors.tint }]}>by {product.seller.username}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>All Products</Text>
              <View style={styles.productsGrid}>
                {filteredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productCard, { 
                      backgroundColor: colors.card,
                      shadowColor: colors.shadow
                    }]}
                    onPress={() => router.push(`/marketplace/${product.id}`)}>
                    <Image source={{ uri: product.image_url }} style={styles.productImage} />
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                      <Text style={[styles.productPrice, { color: colors.tint }]}>${product.price}</Text>
                      <Text style={[styles.sellerName, { color: colors.tint }]}>by {product.seller.username}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={[styles.sellerContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.sellerTitle, { color: colors.tint }]}>List a New Product</Text>
          
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
            {productImage ? (
              <Image source={{ uri: productImage }} style={styles.uploadedImage} />
            ) : (
              <View style={[styles.uploadPlaceholder, { 
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.tint
              }]}>
                <Camera size={40} color={colors.tint} />
                <Text style={[styles.uploadText, { color: colors.tint }]}>Upload Product Image</Text>
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground,
              color: colors.text
            }]}
            placeholder="Product Name"
            placeholderTextColor={colors.textSecondary}
            value={productName}
            onChangeText={setProductName}
            maxLength={100}
          />

          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground,
              color: colors.text
            }]}
            placeholder="Price"
            placeholderTextColor={colors.textSecondary}
            value={productPrice}
            onChangeText={setProductPrice}
            keyboardType="decimal-pad"
            maxLength={10}
          />

          <TouchableOpacity
            style={[
              styles.uploadButton, 
              loading && styles.buttonDisabled, 
              { backgroundColor: colors.tint }
            ]}
            onPress={handleUpload}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>List Product</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
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
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  toggleContainer: {
    position: 'absolute',
    top: 50,
    right: 15,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 4,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  toggleOptionActive: {
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchWrapper: {
    position: 'relative',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    outlineStyle: 'none',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    margin: 15,
  },
  featuredContainer: {
    paddingHorizontal: 15,
  },
  featuredProduct: {
    width: 200,
    marginRight: 15,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  featuredInfo: {
    padding: 10,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  productCard: {
    width: '47%',
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 12,
  },
  sellerContainer: {
    padding: 15,
  },
  sellerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorContainer: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  errorText: {
    textAlign: 'center',
  },
  imageUpload: {
    width: '100%',
    height: 200,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  uploadButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});