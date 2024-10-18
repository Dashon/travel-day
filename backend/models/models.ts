import { UUID } from "crypto";

// User Preferences Schema
interface User {
  user_id: UUID;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

interface UserProfile {
  profile_id: UUID;
  user_id: UUID;
  travel_preferences: Record<string, any>; // Allows for flexible travel preference data
  preferred_activities: string[];
  budget_range: "low" | "medium" | "high";
  favorite_cuisines: string[];
  created_at: Date;
  updated_at: Date;
}

// User Favorites Schemas
interface UserFavoritePlace {
  favorite_place_id: UUID;
  user_id: UUID;
  place_id: string; // Matches Place interface
  rating?: number;
  notes?: string;
  tags?: string[];
  date_added: Date;
  last_visited?: Date;
  created_at: Date;
  updated_at: Date;
}

interface UserFavoriteTour {
  favorite_tour_id: UUID;
  user_id: UUID;
  tour_id: string; // Matches Tour interface
  rating?: number;
  notes?: string;
  tags?: string[];
  date_added: Date;
  last_booked?: Date;
  created_at: Date;
  updated_at: Date;
}

// Reviews Schema
interface Review {
  review_id: UUID;
  user_id: UUID;
  target_type: "place" | "tour";
  target_id: string; // place_id or tour_id
  rating: number;
  comment: string;
  created_at: Date;
  updated_at: Date;
}

// Tours Schema
interface AgeBand {
  ageBand: string; // e.g., "ADULT", "CHILD", etc.
  startAge: number;
  endAge: number;
  minTravelersPerBooking: number;
  maxTravelersPerBooking: number;
  price: number; // Price specific to this age band
}

interface Tour {
  tour_id: string;
  title: string;
  description: string;
  url: string;
  images: string[];
  duration: string;
  ageBands: AgeBand[]; // Updated to handle multiple age bands
  currency: string;
  tags: string[];
  destination_ids: number[];
  supplier_name: string;
  supplier_id: string;
  created_at: Date;
  updated_at: Date;
}

// Social Media Content Schema (Retained)
interface SocialMediaContent {
  content_id: string; // Use string for UUIDs in TypeScript
  platform: string; // e.g., 'YouTube', 'TikTok', 'Instagram'
  author: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string;
  engagement_metrics: {
    views: number;
    likes: number;
    comments: number;
  };
  destination: string;
  hashtags: string[];
  captured_at: Date;
  created_at: Date;
  updated_at: Date;
}

// Itineraries Schema (Retained)
interface Itinerary {
  itinerary_id: UUID;
  user_id: UUID;
  destination: string;
  start_date: Date;
  end_date: Date;
  preferences: Record<string, any>; // Allows for flexible preference data
  created_at: Date;
  updated_at: Date;
}

interface ItineraryDay {
  day_id: UUID;
  itinerary_id: UUID;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

interface Activity {
  activity_id: UUID;
  day_id: UUID;
  time: Date;
  description: string;
  place_id?: string; // Matches Place interface
  created_at: Date;
  updated_at: Date;
}

// Places Schema (Retained with minor adjustments)
interface Place {
  place_id: string;
  name: string;
  type: string; // e.g., 'Hotel', 'Restaurant', 'Attraction'
  address: string;
  latitude: number;
  longitude: number;
  google_place_id: string;
  description?: string;
  average_rating: number;
  created_at: Date;
  updated_at: Date;
}

export type {
  User,
  UserProfile,
  UserFavoritePlace,
  UserFavoriteTour,
  Review,
  SocialMediaContent,
  Itinerary,
  ItineraryDay,
  Activity,
  Place,
  Tour,
};
