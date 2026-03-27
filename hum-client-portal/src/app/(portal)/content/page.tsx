'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { ContentCard } from '@/components/content-card';
import { useContent } from '@/lib/queries';

export default function ContentPage() {
  const [status, setStatus] = useState<'scheduled' | 'posted'>('scheduled');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useContent({ status, page, limit: 20 });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = items.length < total && (page - 1) * 20 + items.length < total;

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  const statusLabel = status === 'scheduled' ? 'Upcoming' : 'Posted';
  const emptyMessage = `No ${status === 'scheduled' ? 'upcoming' : 'posted'} content yet`;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Content</h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => {
            setStatus('scheduled');
            setPage(1);
          }}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            status === 'scheduled'
              ? 'text-gray-900 border-gray-900'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => {
            setStatus('posted');
            setPage(1);
          }}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            status === 'posted'
              ? 'text-gray-900 border-gray-900'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Posted
        </button>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item: Record<string, unknown>) => (
              <ContentCard
                key={item.id as string}
                item={{
                  id: item.id as string,
                  contentType: item.contentType as string,
                  status: item.status as string,
                  caption: item.caption as string | null,
                  mediaUrls: item.mediaUrls as string[],
                  platforms: item.platforms as string[],
                  scheduledAt: item.scheduledAt as string | null,
                }}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                className="px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium text-lg">{emptyMessage}</p>
          <p className="text-gray-400 text-sm mt-2">
            {status === 'scheduled'
              ? "Check back soon for your upcoming posts!"
              : "You haven't posted any content yet."}
          </p>
        </div>
      )}
    </div>
  );
}
