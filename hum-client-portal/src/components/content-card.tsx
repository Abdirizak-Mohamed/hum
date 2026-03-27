'use client';

import { FileText } from 'lucide-react';

type ContentCardItem = {
  id: string;
  contentType: string;
  status: string;
  caption: string | null;
  mediaUrls: string[];
  platforms: string[];
  scheduledAt: string | null;
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-600',
  tiktok: 'bg-gray-900',
  google: 'bg-green-500',
};

const TYPE_LABELS: Record<string, string> = {
  food_hero: 'Food Hero',
  short_video: 'Short Video',
  deal_offer: 'Deal / Offer',
  behind_scenes: 'Behind the Scenes',
  google_post: 'Google Post',
  review_highlight: 'Review Highlight',
  trending: 'Trending',
};

function formatScheduledDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

export function ContentCard({ item }: { item: ContentCardItem }) {
  const hasImage = item.mediaUrls.length > 0;

  return (
    <div className="min-w-[200px] max-w-[240px] flex-shrink-0 rounded-xl bg-white shadow-md border border-gray-100 overflow-hidden">
      {/* Thumbnail */}
      <div className="relative w-full h-32 bg-gray-100 flex items-center justify-center">
        {hasImage ? (
          <img
            src={item.mediaUrls[0]}
            alt="Content preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="w-10 h-10 text-gray-300" />
        )}
        {/* Content type badge */}
        <span className="absolute top-2 left-2 bg-white/90 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
          {TYPE_LABELS[item.contentType] ?? item.contentType}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Caption */}
        <p className="text-sm text-gray-700 leading-snug">
          {item.caption ? truncate(item.caption, 80) : 'No caption yet'}
        </p>

        {/* Platforms */}
        {item.platforms.length > 0 && (
          <div className="flex items-center gap-1.5">
            {item.platforms.map((p) => (
              <span
                key={p}
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  PLATFORM_COLORS[p.toLowerCase()] ?? 'bg-gray-400'
                }`}
                title={p}
              />
            ))}
            <span className="text-[10px] text-gray-400 ml-1">
              {item.platforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
            </span>
          </div>
        )}

        {/* Scheduled date */}
        {item.scheduledAt && (
          <p className="text-xs text-gray-500">
            {formatScheduledDate(item.scheduledAt)}
          </p>
        )}
      </div>
    </div>
  );
}
