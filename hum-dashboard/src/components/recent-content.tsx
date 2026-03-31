import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';

type ContentItemLike = {
  id: string;
  contentType: string;
  status: string;
  caption: string | null;
  mediaUrls: string[];
  platforms: string[];
};

type RecentContentProps = {
  items: ContentItemLike[];
  clientId: string;
};

export function RecentContent({ items, clientId }: RecentContentProps) {
  const recent = items.slice(0, 5);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Recent Content
        </h2>
        <Link
          href={`/content?clientId=${clientId}`}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          View all →
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-gray-500">No content yet.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((item) => {
            const firstMedia = item.mediaUrls?.[0] ?? null;
            return (
              <li key={item.id} className="flex items-center gap-3">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {firstMedia ? (
                    <img
                      src={`/api/media/${firstMedia}`}
                      alt={item.contentType}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg text-gray-600">📄</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">
                    {item.caption ?? item.contentType}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-blue-400 capitalize">
                      {(item.platforms ?? []).join(', ')}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <StatusBadge status={item.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
