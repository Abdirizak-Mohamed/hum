'use client';

import { StatusBadge } from '@/components/status-badge';
import { usePauseContent, useDeleteContent } from '@/lib/queries';
import type { ContentItem } from '@/lib/api';

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

type ContentCardProps = {
  item: ContentItem;
  onPreview: (item: ContentItem) => void;
};

export function ContentCard({ item, onPreview }: ContentCardProps) {
  const pauseContent = usePauseContent();
  const deleteContent = useDeleteContent();

  const firstMedia = item.mediaUrls[0] ?? null;

  function handlePause() {
    pauseContent.mutate(item.id);
  }

  function handleDelete() {
    if (!window.confirm(`Delete this ${item.contentType} post for ${item.clientName}?`)) return;
    deleteContent.mutate(item.id);
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="h-28 bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {firstMedia ? (
          <img
            src={`/api/media/${firstMedia}`}
            alt={item.contentType}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl text-gray-600">📄</span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-200 truncate">{item.clientName}</p>
          <StatusBadge status={item.status} />
        </div>

        {/* Platforms */}
        <div className="flex flex-wrap gap-1">
          {item.platforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center rounded-full bg-blue-900/30 px-2 py-0.5 text-xs text-blue-300 capitalize"
            >
              {p}
            </span>
          ))}
          <span className="inline-flex items-center rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400 capitalize">
            {item.contentType}
          </span>
        </div>

        {/* Time */}
        <p className="text-xs text-gray-500">{formatTime(item.scheduledAt)}</p>

        {/* Caption preview */}
        {item.caption && (
          <p className="text-xs text-gray-400 line-clamp-2">{item.caption}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-2">
          <button
            onClick={() => onPreview(item)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Preview
          </button>
          <button
            onClick={handlePause}
            disabled={pauseContent.isPending || item.status === 'draft'}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40"
          >
            Pause
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteContent.isPending}
            className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
