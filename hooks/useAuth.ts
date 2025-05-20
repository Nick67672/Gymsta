// This file is now deprecated as we're using the AuthContext directly
// Keeping it for backward compatibility
import { useAuth as useAuthContext } from '@/context/AuthContext';

export function useAuth() {
  return useAuthContext();
}