import axios from "axios";
import { SocialMediaContent } from "../models/models";
import supabase from "../utils/supabaseClient";
import pineconeClient from "../utils/pineconeClient";
import { v4 as uuidv4 } from "uuid";

// Replace with your Instagram Graph API credentials
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

class InstagramIngestionService {
  async fetchMediaByHashtag(hashtag: string) {
    // Implement API calls to Instagram Graph API
    // Fetch media using hashtag search
    // Note: Requires Business Account and approved permissions
  }

  async processAndStoreMedia(mediaItems: any[]) {
    for (const media of mediaItems) {
      const contentId = uuidv4();

      const socialMediaContent: SocialMediaContent = {
        content_id: contentId,
        platform: "Instagram",
        author: media.username,
        title: "",
        description: media.caption || "",
        url: media.permalink,
        thumbnail_url: media.media_url,
        engagement_metrics: {
          views: 0,
          likes: media.like_count || 0,
          comments: media.comments_count || 0,
        },
        destination: this.extractDestination(media.caption),
        hashtags: this.extractHashtags(media.caption),
        captured_at: new Date(media.timestamp),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store metadata in Supabase
      await this.storeMetadata(socialMediaContent);

      // Generate embedding and store in Pinecone
      await this.storeEmbedding(socialMediaContent);
    }
  }

  extractHashtags(text: string): string[] {
    const regex = /#(\w+)/g;
    const matches = text.match(regex);
    return matches ? matches.map((tag) => tag.substring(1)) : [];
  }

  extractDestination(text: string): string {
    // Implement NLP extraction logic or keyword matching
    return "";
  }

  async storeMetadata(content: SocialMediaContent) {
    const { data, error } = await supabase
      .from("social_media_content")
      .insert([content]);

    if (error) {
      console.error("Error inserting data into Supabase:", error);
      throw error;
    }
  }

  async storeEmbedding(content: SocialMediaContent) {
    // Generate embedding using OpenAI API
    const embedding = await this.generateEmbedding(content.description);

    // Store embedding in Pinecone
    const index = pineconeClient.Index("content_embeddings");
    await index.upsert({
      includeMetadata: true, // Ensure metadata is included
      namespace: "instagram", // Specify the namespace
      vectors: [
        {
          id: content.content_id,
          values: embedding,
          metadata: {
            platform: content.platform,
            destination: content.destination,
            hashtags: content.hashtags,
          },
        },
      ],
    } as any); // Use type assertion if necessary
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Implement the call to OpenAI's Embedding API
    // Replace this with actual API call
    return [];
  }
}

export default new InstagramIngestionService();
