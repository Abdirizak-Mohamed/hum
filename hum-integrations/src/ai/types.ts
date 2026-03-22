export type CopyPrompt = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
};

export type CopyResult = {
  text: string;
  usage: { promptTokens: number; completionTokens: number };
};

export type BrandInput = {
  businessName: string;
  menuDescription: string;
  cuisineType?: string;
  location?: string;
};

export type BrandProfileResult = {
  brandVoiceGuide: string;
  keySellingPoints: string[];
  targetAudienceProfile: string;
  contentThemes: string[];
  hashtagStrategy: string[];
};

export type ImagePrompt = {
  prompt: string;
  imageSize?: 'square_hd' | 'landscape_4_3' | 'portrait_hd';
  numImages?: number;
};

export type ImageResult = {
  imageUrls: string[];
};

export interface AiClient {
  generateCopy(prompt: CopyPrompt): Promise<CopyResult>;
  generateBrandProfile(input: BrandInput): Promise<BrandProfileResult>;
  generateImage(prompt: ImagePrompt): Promise<ImageResult>;
}
