
export type Page = 'dashboard' | 'inbox' | 'content' | 'analytics' | 'library' | 'settings' | 'connections' | 'trends';

export enum InboxItemType {
  Message = 'Message',
  Comment = 'Comment',
  Review = 'Review',
}

export type Platform = 'Facebook' | 'Instagram' | 'WhatsApp';

export interface Connection {
  platform: Platform;
  id: string; // e.g., Facebook Page ID or Instagram Profile ID
  name: string; // e.g., "My Awesome Cafe"
  status: 'connected' | 'disconnected';
  accessToken: string; // This will be a mock token for simulation
}

export interface InboxItem {
  id: number;
  type: InboxItemType;
  sender: string;
  avatar: string;
  content: string;
  platform: Platform;
  connectionId: string; // Which connected account this is from
  timestamp: string;
  replied?: boolean;
  lastReply?: string;
}

export interface Post {
  id: number;
  platform: Platform;
  connectionId: string; // Which connected account this is for
  content: string;
  asset?: ContentAsset; // The selected visual asset from the library
  visualSuggestion?: string; // AI-generated suggestion if no asset is used
  hashtags: string[];
  engagement?: number;
  scheduledTime: Date;
  status: 'pending_approval' | 'scheduled' | 'posted';
}

export interface GeneratedPostIdea {
  postText: string;
  visualSuggestion: string;
  hashtags: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface UserSettings {
  businessName: string;
  businessDescription: string;
  targetAudience: string;
  brandVoice: string;
  // platforms: Platform[]; // Deprecated in favor of connections
  contentPillars: string[];
  autoPost: boolean;
  autoReply: boolean;
  // Order Automation Settings
  autoConfirmOrders: boolean;
  productCatalog: Product[];
  replyGuidelines?: string[];
}

export interface ContentAsset {
  id: string;
  name: string;
  type: 'image';
  url: string; // Base64 data URL
  context: string; // User-provided context about the image
}

export interface TrendTopic {
  topic: string;
  summary: string;
  source?: string;
}

export interface TrendContentIdea {
  title: string;
  concept: string;
  rationale: string;
  hashtags: string[];
}