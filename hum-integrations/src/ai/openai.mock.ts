import type { CopyPrompt, CopyResult, BrandInput, BrandProfileResult } from './types.js';

export class MockOpenAiProvider {
  async generateCopy(_prompt: CopyPrompt): Promise<CopyResult> {
    return {
      text: 'Craving something special tonight? Our butter chicken is made fresh daily with aromatic spices and creamy tomato sauce. Order now and taste the difference!',
      usage: { promptTokens: 150, completionTokens: 80 },
    };
  }

  async generateBrandProfile(_input: BrandInput): Promise<BrandProfileResult> {
    return {
      brandVoiceGuide: 'Warm, welcoming, and proud of our heritage. Speak like a passionate food lover sharing their favourite dishes with friends. Keep it casual but confident.',
      keySellingPoints: [
        'Authentic family recipes passed down through generations',
        'Fresh ingredients prepared daily — never frozen',
        'Fast delivery within 30 minutes',
      ],
      targetAudienceProfile: 'Local residents aged 18-45, food-delivery users, families looking for convenient dinner options, late-night diners.',
      contentThemes: ['behind-the-scenes prep', 'dish spotlights', 'customer favourites', 'seasonal specials'],
      hashtagStrategy: ['#LocalEats', '#FreshFood', '#FoodDelivery', '#TakeawayNight', '#SupportLocal'],
      peakPostingTimes: {
        instagram: ['12:00', '18:00', '21:00'],
        facebook: ['12:00', '17:00', '20:00'],
        tiktok: ['19:00', '21:00'],
        google_business: ['11:00', '17:00'],
      },
    };
  }
}
