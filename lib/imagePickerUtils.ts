import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export interface ImagePickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
}

export const requestPermissions = async (): Promise<boolean> => {
  try {
    // Request media library permissions
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (mediaLibraryStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library in Settings to select images.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            if (Platform.OS === 'ios') {
              ImagePicker.requestMediaLibraryPermissionsAsync();
            }
          }}
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Permission request error:', error);
    Alert.alert('Error', 'Failed to request permissions. Please try again.');
    return false;
  }
};

export const pickImageFromLibrary = async (options: ImagePickerOptions = {}): Promise<string | null> => {
  try {
    // First check permissions
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return null;
    }

    // Default options with production-friendly settings
    const defaultOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.8, // Slightly lower quality for better performance
      allowsMultipleSelection: false,
      ...options
    };

    const result = await ImagePicker.launchImageLibraryAsync(defaultOptions);

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    
    // Validate the picked image
    if (!asset.uri) {
      throw new Error('No image URI received');
    }

    return asset.uri;
  } catch (error) {
    console.error('Image picker error:', error);
    
    // Different error messages based on the error type
    let errorMessage = 'Failed to pick image. Please try again.';
    
    if (error instanceof Error) {
      if (error.message.includes('permissions')) {
        errorMessage = 'Please allow photo library access in your device settings.';
      } else if (error.message.includes('cancelled')) {
        return null; // User cancelled, don't show error
      }
    }
    
    Alert.alert('Error', errorMessage);
    return null;
  }
};

export const pickImageWithCamera = async (options: ImagePickerOptions = {}): Promise<string | null> => {
  try {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required', 
        'Please allow camera access to take photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            if (Platform.OS === 'ios') {
              ImagePicker.requestCameraPermissionsAsync();
            }
          }}
        ]
      );
      return null;
    }

    const defaultOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.8,
      ...options
    };

    const result = await ImagePicker.launchCameraAsync(defaultOptions);

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    
    if (!asset.uri) {
      throw new Error('No image URI received from camera');
    }

    return asset.uri;
  } catch (error) {
    console.error('Camera error:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
    return null;
  }
};

// Utility to show image picker options (camera vs library)
export const showImagePickerOptions = (): Promise<string | null> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select an image',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Camera', onPress: async () => {
          const uri = await pickImageWithCamera();
          resolve(uri);
        }},
        { text: 'Photo Library', onPress: async () => {
          const uri = await pickImageFromLibrary();
          resolve(uri);
        }}
      ]
    );
  });
}; 