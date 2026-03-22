'use client';

import { useEffect } from 'react';
import type { ContentItem } from '@/lib/api';

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type ContentPreviewModalProps = {
  item: ContentItem;
  onClose: () => void;
};

export function ContentPreviewModal({ item, onClose }: ContentPreviewModalProps) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const firstMedia = item.mediaUrls[0] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-gray-400 hover:text-white transition-colors text-xl leading-none"
        >
          ✕
        </button>

        {/* Image */}
        {firstMedia ? (
          <img
            src={firstMedia.startsWith('http') ? firstMedia : `/api/media/${firstMedia}`}
            alt={item.contentType}
            className="w-full max-h-72 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
            <span className="text-4xl text-gray-600">📄</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{item.clientName}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{formatDateTime(item.scheduledAt)}</span>
          </div>

          {item.caption && (
            <p className="text-sm text-gray-200 leading-relaxed">{item.caption}</p>
          )}

          {item.hashtags.length > 0 && (
            <p className="text-xs text-blue-400">
              {item.hashtags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}
            </p>
          )}

          {item.cta && (
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">CTA: </span>
              {item.cta}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.platforms.map((p) => (
              <span
                key={p}
                className="inline-flex items-center rounded-full bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-300 capitalize"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
