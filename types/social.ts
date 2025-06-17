export interface Story {
  id: string;
  media_url: string;
  user_id: string;
}

export interface UserProfileBasic {
  id?: string;
  username: string;
  avatar_url: string | null;
  is_verified?: boolean;
  gym?: string | null;
  has_story?: boolean; // for Story rail convenience
}

export interface Post {
  id: string;
  caption: string | null;
  image_url: string;
  media_type: string;
  created_at: string;
  product_id: string | null;
  profiles: any;
  likes: {
    id: string;
    user_id: string;
  }[];
}

export interface Workout {
  id: string;
  user_id: string;
  exercises: any[];
  created_at: string;
  progress_image_url: string | null;
  profiles: any;
}

export type Profile = UserProfileBasic; 