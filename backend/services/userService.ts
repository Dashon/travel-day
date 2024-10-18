import supabase from "../utils/supabaseClient";
import {
  UserProfile,
  UserFavoritePlace,
  UserFavoriteTour,
  Review,
  Place,
  Tour,
} from "../models/models";
import { v4 as uuidv4 } from "uuid";
import pineconeClient from "../utils/pineconeClient";
import axios from "axios";
import { UUID } from "crypto";
import { PineconeRecord, RecordMetadata } from "@pinecone-database/pinecone";

class UserService {
  /**
   * Update User Profile
   */
  async updateUserProfile(userId: string, profileData: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(profileData)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }

    return data;
  }

  /**
   * Add a favorite place to user's favorites
   */
  async addFavoritePlace(
    userId: string,
    placeId: string,
    notes?: string,
    tags?: string[]
  ): Promise<UserFavoritePlace | null> {
    // Check if place exists
    let place = await this.getPlaceById(placeId);
    if (!place) {
      // Fetch from Google Places API and add to DB
      place = await this.addPlace(placeId);
      if (!place) {
        console.error(`Place with ID ${placeId} could not be added.`);
        return null;
      }
    }

    // Create favorite place entry
    const favoritePlace: UserFavoritePlace = {
      favorite_place_id: uuidv4() as UUID,
      user_id: userId as UUID,
      place_id: place.place_id,
      notes: notes || "",
      tags: tags || [],
      date_added: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const { data, error } = await supabase
      .from("user_favorite_places")
      .insert([favoritePlace]);

    if (error) {
      console.error("Error adding favorite place:", error);
      throw error;
    }

    if (!data) {
      console.error("No data returned from favorite place insertion");
      return null;
    }
    return data[0] as UserFavoritePlace;
  }

  /**
   * Add a favorite tour to user's favorites
   */
  async addFavoriteTour(
    userId: string,
    tourId: string,
    notes?: string,
    tags?: string[]
  ): Promise<UserFavoriteTour | null> {
    // Check if tour exists
    let tour = await this.getTourById(tourId);
    if (!tour) {
      console.error(`Tour with ID ${tourId} does not exist.`);
      return null;
    }

    // Create favorite tour entry
    const favoriteTour: UserFavoriteTour = {
      favorite_tour_id: uuidv4() as UUID,
      user_id: userId as UUID,
      tour_id: tour.tour_id,
      notes: notes || "",
      tags: tags || [],
      date_added: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const { data, error } = await supabase
      .from("user_favorite_tours")
      .insert([favoriteTour]);

    if (error) {
      console.error("Error adding favorite tour:", error);
      throw error;
    }

    if (!data) {
      console.error("No data returned from favorite tour insertion");
      return null;
    }
    return data[0] as UserFavoriteTour;
  }

  /**
   * Leave a review on a place or tour
   */
  async leaveReview(
    userId: string,
    targetType: "place" | "tour",
    targetId: string,
    rating: number,
    comment: string
  ): Promise<Review | null> {
    // Validate targetType
    if (!["place", "tour"].includes(targetType)) {
      throw new Error("Invalid target type. Must be 'place' or 'tour'.");
    }

    // Optionally, verify if target exists
    if (targetType === "place") {
      const place = await this.getPlaceById(targetId);
      if (!place) {
        throw new Error("Place not found.");
      }
    } else if (targetType === "tour") {
      const tour = await this.getTourById(targetId);
      if (!tour) {
        throw new Error("Tour not found.");
      }
    }

    const review: Review = {
      review_id: uuidv4() as UUID,
      user_id: userId as UUID,
      target_type: targetType,
      target_id: targetId,
      rating,
      comment,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const { data, error } = await supabase.from("reviews").insert([review]);

    if (error) {
      console.error("Error leaving review:", error);
      throw error;
    }

    if (!data) {
      console.error("No data returned from review insertion");
      return null;
    }
    return data[0] as Review;
  }

  /**
   * Get user's favorite places
   */
  async getFavoritePlaces(userId: string): Promise<UserFavoritePlace[]> {
    const { data, error } = await supabase
      .from("user_favorite_places")
      .select("*, place:places(*)") // Join with places table to get place details
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching favorite places:", error);
      return [];
    }

    return data as UserFavoritePlace[];
  }

  /**
   * Get user's favorite tours
   */
  async getFavoriteTours(userId: string): Promise<UserFavoriteTour[]> {
    const { data, error } = await supabase
      .from("user_favorite_tours")
      .select("*, tour:tours(*)") // Join with tours table to get tour details
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching favorite tours:", error);
      return [];
    }

    return data as UserFavoriteTour[];
  }

  /**
   * Get reviews for a specific target (place or tour)
   */
  async getReviews(
    targetType: "place" | "tour",
    targetId: string
  ): Promise<Review[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("target_type", targetType)
      .eq("target_id", targetId);

    if (error) {
      console.error(
        `Error fetching reviews for ${targetType} ${targetId}:`,
        error
      );
      return [];
    }

    return data as Review[];
  }

  /**
   * Fetch place details by place ID
   */
  async getPlaceById(placeId: string): Promise<Place | null> {
    const { data, error } = await supabase
      .from("places")
      .select("*")
      .eq("place_id", placeId)
      .single();

    if (error || !data) {
      console.error("Place not found:", error);
      return null;
    }

    return data as Place;
  }

  /**
   * Fetch tour details by tour ID
   */
  async getTourById(tourId: string): Promise<Tour | null> {
    const { data, error } = await supabase
      .from("tours")
      .select("*")
      .eq("tour_id", tourId)
      .single();

    if (error || !data) {
      console.error("Tour not found:", error);
      return null;
    }

    return data as Tour;
  }

  /**
   * Fetch place details from Google Places API
   */
  async fetchPlaceDetails(placeId: string): Promise<any> {
    // Implement Google Places API call
    // Replace with actual API call logic
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json`,
        {
          params: {
            place_id: placeId,
            key: process.env.GOOGLE_PLACES_API_KEY,
          },
        }
      );

      if (response.data.status !== "OK") {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return response.data.result;
    } catch (error) {
      console.error(
        "Error fetching place details from Google Places API:",
        error
      );
      throw error;
    }
  }

  /**
   * Add a new place to the database by fetching from Google Places API
   */
  async addPlace(googlePlaceId: string): Promise<Place | null> {
    try {
      const placeDetails = await this.fetchPlaceDetails(googlePlaceId);
      if (!placeDetails) {
        console.error(`No details found for Google Place ID: ${googlePlaceId}`);
        return null;
      }

      const place: Place = {
        place_id: uuidv4(),
        name: placeDetails.name,
        type: placeDetails.types ? placeDetails.types[0] : "Unknown",
        address: placeDetails.formatted_address,
        latitude: placeDetails.geometry.location.lat,
        longitude: placeDetails.geometry.location.lng,
        google_place_id: googlePlaceId,
        description: placeDetails.description || "",
        average_rating: placeDetails.rating || 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const { data, error } = await supabase.from("places").insert([place]);

      if (error) {
        console.error("Error adding place:", error);
        throw error;
      }

      // Generate and store embedding
      await this.storePlaceEmbedding(place);

      if (!data) {
        console.error("No data returned from place insertion");
        return null;
      }
      return data[0] as Place;
    } catch (error) {
      console.error("Failed to add place:", error);
      return null;
    }
  }

  /**
   * Store place embedding in Pinecone
   */
  async storePlaceEmbedding(place: Place): Promise<void> {
    try {
      // Generate embedding using OpenAI's Embedding API via Supabase Function
      const embedding = await this.generateEmbedding(
        `${place.name} ${place.description}`
      );

      if (!embedding || embedding.length === 0) {
        console.error(
          "Failed to generate embedding for place:",
          place.place_id
        );
        return;
      }

      // Prepare vector for Pinecone
      const vector: PineconeRecord<RecordMetadata> = {
        id: place.place_id,
        values: embedding,
        metadata: {
          type: place.type,
          location: [place.latitude.toString(), place.longitude.toString()],
          tags: place.description ? place.description.split(" ") : [], // Example tag extraction
        },
      };

      // Upsert to Pinecone
      const index = pineconeClient.Index("place_embeddings"); // Replace with your Pinecone index name
      await index.upsert([vector]);

      console.log(
        `Successfully stored embedding for place ID: ${place.place_id}`
      );
    } catch (error) {
      console.error("Error storing place embedding in Pinecone:", error);
    }
  }

  /**
   * Generate embedding using Supabase's RPC function linked to OpenAI's Embedding API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const { data, error } = await supabase.rpc("generate_embedding", {
        text,
      });
      if (error) {
        throw error;
      }
      return data as number[];
    } catch (error) {
      console.error("Error generating embedding:", error);
      return [];
    }
  }

  /**
   * Search Pinecone for places based on a query
   */
  async searchPlaces(query: string, topK: number = 10): Promise<any[]> {
    try {
      // Generate embedding for the query
      const embedding = await this.generateEmbedding(query);
      if (!embedding || embedding.length === 0) {
        console.error("Failed to generate embedding for query:", query);
        return [];
      }

      // Query Pinecone
      const index = pineconeClient.Index("place_embeddings");
      const response = await index.query({
        vector: embedding,
        topK,
        includeMetadata: true,
      });

      return response.matches;
    } catch (error) {
      console.error("Error searching for places in Pinecone:", error);
      return [];
    }
  }
}

export default new UserService();
