import axios from "axios";
import supabase from "../utils/supabaseClient";
import pineconeClient from "../utils/pineconeClient";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import {
  YouTubeVideoDetails,
  YouTubeApiResponse,
  PineconeVector,
  PineconeQueryResponse,
} from "../models/youtubeTypes";

// Replace with your YouTube Data API key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

class YouTubeIngestionService {
  /**
   * Upsert a single video by video ID
   */
  async upsertVideoById(videoId: string): Promise<void> {
    // Fetch video details from YouTube API
    const videoDetails = await this.fetchVideoDetails(videoId);
    if (!videoDetails) {
      console.error(`No video details found for video ID: ${videoId}`);
      return;
    }

    // Save video details to Supabase
    await this.saveVideoToSupabase(videoDetails);

    // Process and upsert video to Pinecone
    await this.processAndUpsertVideo(videoDetails);
  }

  /**
   * Search YouTube for videos by keyword and upsert the top 50
   */
  async searchAndUpsertByKeyword(keyword: string): Promise<void> {
    // Fetch videos by keyword
    const videos = await this.fetchVideosByKeyword(keyword);
    if (!videos || videos.length === 0) {
      console.error(`No videos found for keyword: ${keyword}`);
      return;
    }

    // Process and upsert each video
    for (const video of videos) {
      await this.saveVideoToSupabase(video);
      await this.processAndUpsertVideo(video);
    }
  }

  /**
   * Update videos by channel ID
   */
  async updateVideosByChannelId(channelId: string): Promise<void> {
    // Fetch videos from the channel
    const videos = await this.fetchVideosByChannelId(channelId);
    if (!videos || videos.length === 0) {
      console.error(`No videos found for channel ID: ${channelId}`);
      return;
    }

    // Process and upsert each video
    for (const video of videos) {
      await this.saveVideoToSupabase(video);
      await this.processAndUpsertVideo(video);
    }
  }

  /**
   * Fetch video details from YouTube by video ID
   */
  async fetchVideoDetails(
    videoId: string
  ): Promise<YouTubeVideoDetails | null> {
    try {
      const url = "https://www.googleapis.com/youtube/v3/videos";
      const params = {
        key: YOUTUBE_API_KEY,
        id: videoId,
        part: "snippet,contentDetails",
      };

      const response = await axios.get<YouTubeApiResponse>(url, { params });
      const items = response.data.items;

      if (items.length === 0) {
        console.error(`No video found with ID: ${videoId}`);
        return null;
      }

      const video = items[0];
      //   const subtitles = await this.fetchSubtitles(videoId);

      return {
        content_id: video.id,
        platform: "YouTube",
        author: video.snippet.channelTitle,
        title: video.snippet.title,
        description: video.snippet.description,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnail_url: video.snippet.thumbnails.high.url,
        engagement_metrics: {
          views: 0, // YouTube API doesn't provide this in the basic request
          likes: 0,
          comments: 0,
        },
        destination: "", // This would need to be extracted from the video content
        hashtags: [], // This would need to be extracted from the description
        captured_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        channelId: video.snippet.channelId,
        channelName: video.snippet.channelTitle,
        channelUrl: `https://www.youtube.com/channel/${video.snippet.channelId}`,
        thumbnailUrl: video.snippet.thumbnails.high.url,
        duration: video.contentDetails.duration,
        // text: subtitles || "",
      };
    } catch (error) {
      console.error(`Error fetching video details: ${error}`);
      return null;
    }
  }

  /**
   * Fetch videos by keyword
   */
  async fetchVideosByKeyword(keyword: string, maxResults: number = 50) {
    try {
      const url = "https://www.googleapis.com/youtube/v3/search";
      const params = {
        key: YOUTUBE_API_KEY,
        q: keyword,
        part: "snippet",
        maxResults,
        type: "video",
      };

      const response = await axios.get(url, { params });
      const items = response.data.items;

      const videos: any[] = [];
      for (const item of items) {
        const videoId = item.id.videoId;
        const videoDetails = await this.fetchVideoDetails(videoId);
        if (videoDetails) {
          videos.push(videoDetails);
        }
      }
      return videos;
    } catch (error) {
      console.error(`Error fetching videos by keyword: ${error}`);
      return [];
    }
  }

  /**
   * Fetch videos by channel ID
   */
  async fetchVideosByChannelId(channelId: string, maxResults: number = 50) {
    try {
      const url = "https://www.googleapis.com/youtube/v3/search";
      const params = {
        key: YOUTUBE_API_KEY,
        channelId,
        part: "snippet",
        maxResults,
        type: "video",
        order: "date",
      };

      const response = await axios.get(url, { params });
      const items = response.data.items;

      const videos: any[] = [];
      for (const item of items) {
        const videoId = item.id.videoId;
        const videoDetails = await this.fetchVideoDetails(videoId);
        if (videoDetails) {
          videos.push(videoDetails);
        }
      }
      return videos;
    } catch (error) {
      console.error(`Error fetching videos by channel ID: ${error}`);
      return [];
    }
  }

  /**
   * Save video details to Supabase
   */
  async saveVideoToSupabase(video: any) {
    // Upsert video into Supabase
    const { data, error } = await supabase
      .from("videos")
      .upsert(video, { onConflict: "id" }); // Assuming 'id' is the primary key

    if (error) {
      console.error(`Error saving video to Supabase: ${error}`);
    } else {
      console.log(`Video ${video.id} upserted to Supabase.`);
    }
  }

  /**
   * Fetch subtitles for a video
   */
  async fetchSubtitles(videoId: string) {
    // Implement fetching subtitles if available.
    // This might require additional API calls or third-party services.
    // For example, you can use youtube-captions-scraper or another library.
    return null; // Placeholder
  }

  /**
   * Process and upsert video to Pinecone (Existing method)
   */
  async processAndUpsertVideo(video: any) {
    // Step 1: Parse subtitles from SRT format
    const subtitles = this.parseSRTSubtitles(video.text);

    // Step 2: Chunk subtitles into manageable pieces
    const chunks = this.chunkSubtitles(subtitles);

    // Step 3: Generate embeddings for each chunk
    const embeddings = await this.generateEmbeddings(chunks);

    // Step 4: Prepare data for Pinecone
    const pineconeVectors = this.preparePineconeVectors(
      video,
      chunks,
      embeddings
    );

    // Step 5: Upsert into Pinecone
    await this.upsertBatchToPinecone(pineconeVectors);
  }

  /**
   * Parse SRT Subtitles
   */
  parseSRTSubtitles(srtContent: string): string[] {
    const subtitles: string[] = [];
    const regex =
      /\d+\s+\d{2}:\d{2}:\d{2},\d{3} --> .*\n([\s\S]*?)(?=\n{2,}|$)/g;
    let match;
    while ((match = regex.exec(srtContent)) !== null) {
      const text = match[1].replace(/\n/g, " ").trim();
      if (text) subtitles.push(text);
    }
    return subtitles;
  }

  /**
   * Chunk subtitles into manageable pieces for embedding
   */
  chunkSubtitles(subtitles: string[], chunkSize: number = 500) {
    const chunks: string[] = [];
    let currentChunk = "";
    for (const subtitle of subtitles) {
      if (currentChunk.length + subtitle.length > chunkSize) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      currentChunk += " " + subtitle;
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    return chunks;
  }

  /**
   * Generate embeddings for each chunk using OpenAI API
   */
  async generateEmbeddings(chunks: string[]) {
    const embeddings: number[][] = [];
    for (const chunk of chunks) {
      try {
        const response = await openai.embeddings.create({
          input: chunk,
          model: "text-embedding-ada-002",
        });
        const embedding = response.data[0].embedding;
        embeddings.push(embedding);
      } catch (error) {
        console.error("Error generating embedding:", error);
      }
    }
    return embeddings;
  }

  /**
   * Prepare vectors for Pinecone
   */
  preparePineconeVectors(
    video: YouTubeVideoDetails,
    chunks: string[],
    embeddings: number[][]
  ): PineconeVector[] {
    return embeddings.map((embedding, index) => ({
      id: `${video.content_id}_chunk_${index}`,
      values: embedding,
      metadata: {
        videoId: video.content_id,
        title: video.title,
        url: video.url,
        chunkIndex: index,
        text: chunks[index],
        channelName: video.channelName,
        channelUrl: video.channelUrl,
        thumbnailUrl: video.thumbnailUrl,
      },
    }));
  }

  /**
   * Upsert batch to Pinecone
   */
  async upsertBatchToPinecone(vectors: PineconeVector[]): Promise<void> {
    try {
      const index = pineconeClient.Index("youtube-subtitles");
      await index.upsert(vectors);
      console.log(`Successfully upserted batch to Pinecone`);
    } catch (error) {
      console.error("Error upserting batch to Pinecone:", error);
    }
  }

  /**
   * Search Pinecone index via REST API
   */
  async searchPinecone(
    query: string,
    topK: number = 10
  ): Promise<PineconeQueryResponse["matches"]> {
    const embeddingResponse = await openai.embeddings.create({
      input: query,
      model: "text-embedding-ada-002",
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    const index = pineconeClient.Index("youtube-subtitles");

    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeValues: false,
      includeMetadata: true,
    });

    return searchResponse.matches.map((match: any) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata,
    }));
  }

  /**
   * Handle LLM queries using GPT-3.5 Turbo
   */
  async handleLLMQuery(prompt: string) {
    // Search Pinecone for relevant chunks
    const matches = await this.searchPinecone(prompt);

    // Aggregate matched texts
    const contextTexts = matches.map((match) => match.metadata.text).join("\n");

    // Use the context to generate a response with OpenAI's GPT-3.5 Turbo
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an informative assistant. Use the provided context to answer the question.",
        },
        { role: "user", content: `${prompt}\n\nContext:\n${contextTexts}` },
      ],
    });

    return chatResponse.choices[0].message.content?.trim();
  }
}

export default new YouTubeIngestionService();
