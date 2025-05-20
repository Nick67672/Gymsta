import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

interface ShippingForm {
  fullName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export default function ShippingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [form, setForm] = useState<ShippingForm>({
    fullName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
  });

  // Load saved shipping address if available
  useEffect(() => {
    const loadSavedAddress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setForm({
            fullName: data.full_name,
            address: data.address,
            city: data.city,
            state: data.state || '',
            zipCode: data.zip_code,
            country: data.country,
            phone: data.phone,
          });
        }
      } catch (err) {
        console.error('Error loading saved address:', err);
      }
    };

    loadSavedAddress();
  }, []);

  const handleChange = (field: keyof ShippingForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleBuy = async () => {
    // Validate form
    const requiredFields = Object.entries(form).filter(([key]) => key !== 'state');
    const emptyFields = requiredFields.filter(([_, value]) => !value.trim());
    
    if (emptyFields.length > 0) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get product details, seller info, buyer info, and Gymsta account
      const [
        { data: product, error: productError },
        { data: buyer, error: buyerError },
        { data: gymsta, error: gymstaError }
      ] = await Promise.all([
        supabase
          .from('products')
          .select('seller_id, name, price')
          .eq('id', id)
          .single(),
        supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single(),
        supabase
          .from('profiles')
          .select('id')
          .eq('username', 'Gymsta')
          .single()
      ]);

      if (productError || !product) throw new Error('Product not found');
      if (buyerError || !buyer) throw new Error('Buyer profile not found');
      if (gymstaError || !gymsta) throw new Error('Gymsta account not found');

      // Construct the message
      let message = `Congrats your ${product.name} has been sold for $${product.price} to ${buyer.username} if your product is physical send the product to this address:\n`;
      message += `${form.address}\n`;
      message += `${form.zipCode}\n`;
      message += `${form.city}\n`;
      if (form.state) {
        message += `${form.state}\n`;
      }
      message += `${form.country}\n\n`;
      message += `If you need any clarification or your product is not physical and you need to provide a service please contact ${buyer.username}.`;

      // Check if a chat already exists between Gymsta and the seller
      const { data: existingChats } = await supabase
        .from('a_chat_users')
        .select('chat_id')
        .eq('user_id', gymsta.id);

      let chatId: string | null = null;

      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(chat => chat.chat_id);
        
        const { data: sharedChat } = await supabase
          .from('a_chat_users')
          .select('chat_id')
          .eq('user_id', product.seller_id)
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
            last_message: message
          })
          .select()
          .single();

        if (chatError) throw chatError;
        if (!newChat) throw new Error('Failed to create chat');

        chatId = newChat.id;

        // Get the last chat user ID
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

        // Add chat participants (only Gymsta and seller)
        const { error: usersError } = await supabase
          .from('a_chat_users')
          .insert([
            { id: startId, chat_id: chatId, user_id: gymsta.id },
            { id: startId + 1, chat_id: chatId, user_id: product.seller_id }
          ]);

        if (usersError) throw usersError;
      } else {
        // Update last message in existing chat
        const { error: updateError } = await supabase
          .from('a_chat')
          .update({ last_message: message })
          .eq('id', chatId);

        if (updateError) throw updateError;
      }

      // Ensure current user is also in the chat
      const { data: userInChat } = await supabase
        .from('a_chat_users')
        .select('id')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userInChat) {
        // Get the last chat user ID
        const { data: lastUser } = await supabase
          .from('a_chat_users')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        const nextId = (lastUser?.id || 0) + 1;

        // Add current user to chat
        await supabase
          .from('a_chat_users')
          .insert({ id: nextId, chat_id: chatId, user_id: user.id });
      }

      // Fix: Add message as the current user instead of as Gymsta to comply with RLS
      const { error: messageError } = await supabase
        .from('a_chat_messages')
        .insert({
          chat_id: chatId,
          user_id: user.id, // Changed from gymsta.id to user.id to comply with RLS
          message: message
        });

      if (messageError) throw messageError;

      // Save shipping address if checkbox is checked
      if (saveAddress) {
        const { error: saveError } = await supabase
          .from('shipping_addresses')
          .insert({
            user_id: user.id,
            full_name: form.fullName,
            address: form.address,
            city: form.city,
            state: form.state || null,
            zip_code: form.zipCode,
            country: form.country,
            phone: form.phone,
          });

        if (saveError) throw saveError;
      }

      // Here you would implement your payment processing logic
      // For now, we'll just show a success message
      alert('This is a demo. In a real app, this would process the payment and save shipping details.');
      router.push('/marketplace');
    } catch (err) {
      setError('Failed to process purchase');
      console.error('Purchase error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { 
        borderBottomColor: colors.border,
        backgroundColor: colors.background 
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Shipping Details</Text>
      </View>

      <ScrollView style={styles.form}>
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border 
            }]}
            value={form.fullName}
            onChangeText={(value) => handleChange('fullName', value)}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Address</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border 
            }]}
            value={form.address}
            onChangeText={(value) => handleChange('address', value)}
            placeholder="Enter your street address"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>City</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border 
            }]}
            value={form.city}
            onChangeText={(value) => handleChange('city', value)}
            placeholder="Enter your city"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={[styles.label, styles.optionalLabel, { color: colors.textSecondary }]}>State (Optional)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={form.state}
              onChangeText={(value) => handleChange('state', value)}
              placeholder="State"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>ZIP Code/Post Code</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={form.zipCode}
              onChangeText={(value) => handleChange('zipCode', value)}
              placeholder="ZIP/Post Code"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Country</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border 
            }]}
            value={form.country}
            onChangeText={(value) => handleChange('country', value)}
            placeholder="Enter your country"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border 
            }]}
            value={form.phone}
            onChangeText={(value) => handleChange('phone', value)}
            placeholder="Enter your phone number"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setSaveAddress(!saveAddress)}>
          <View style={[
            styles.checkbox, 
            { borderColor: colors.tint },
            saveAddress && { backgroundColor: colors.tint }
          ]}>
            {saveAddress && <Check size={16} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>
            Save shipping address for future purchases
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { 
        borderTopColor: colors.border,
        backgroundColor: colors.background 
      }]}>
        <TouchableOpacity
          style={[styles.buyButton, loading && styles.buttonDisabled, { backgroundColor: colors.tint }]}
          onPress={handleBuy}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buyButtonText}>Buy Now</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingTop: 60,
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionalLabel: {
  },
  input: {
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  buyButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});