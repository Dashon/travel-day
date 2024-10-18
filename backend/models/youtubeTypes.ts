/* eslint-disable @typescript-eslint/no-explicit-any */
import { SocialMediaContent } from "../models/models";

export interface YouTubeVideoDetails extends SocialMediaContent {
  channelId: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl: string;
  duration: string;
  text?: string; // This will store the SRT subtitles
}

export interface YouTubeApiResponse {
  items: {
    id: string;
    snippet: {
      title: string;
      description: string;
      channelId: string;
      channelTitle: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
    };
    contentDetails: {
      duration: string;
    };
  }[];
}

export interface PineconeVector {
  id: string;
  values: number[];
  metadata: {
    videoId: string;
    title: string;
    url: string;
    chunkIndex: number;
    text: string;
    channelName: string;
    channelUrl: string;
    thumbnailUrl: string;
    [key: string]: any; // Allow for additional metadata
  };
}

export interface PineconeQueryResponse {
  matches: {
    id: string;
    score: number;
    metadata: PineconeVector["metadata"];
  }[];
}
