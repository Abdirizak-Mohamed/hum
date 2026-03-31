'use client';

import { useState } from 'react';
import { PhotoUploader } from '@/components/photo-uploader';
import { useUploads } from '@/lib/queries';
import { ImageOff } from 'lucide-react';

interface UploadItem {
  id: string;
  filename: string;
  mimeType: string;
  status?: 'pending' | 'used' | 'archived';
}

export default function UploadPage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const { data, isLoading, refetch } = useUploads({ category: 'food_photo' });

  const handleUpload = (upload: UploadItem) => {
    setUploads([upload, ...uploads]);
    refetch();
  };

  const dataItems = (data?.items ?? []).map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    return {
      id: (obj.id as string) ?? '',
      filename: (obj.filename as string) ?? '',
      mimeType: (obj.mimeType as string) ?? '',
      status: (obj.status as string | undefined),
    };
  });

  const allPhotos = [...uploads, ...dataItems].filter(
    (item, index, self) => self.findIndex(i => i.id === item.id) === index
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'used':
        return (
          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
            Used
          </span>
        );
      case 'archived':
        return (
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
            Archived
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Photos</h1>
        <p className="text-gray-500 mt-2">
          Share photos of your food and we'll use them to create amazing content for your social media
        </p>
      </div>

      {/* Photo Uploader */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PhotoUploader
          category="food_photo"
          existingUploads={uploads}
          onUpload={handleUpload}
        />
      </div>

      {/* Previously Uploaded Photos */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Previously Uploaded</h2>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : allPhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {allPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {photo.mimeType.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/upload/${photo.id}/file`}
                      alt={photo.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-xs text-gray-500 text-center px-2 break-all">
                        {photo.filename}
                      </span>
                    </div>
                  )}
                </div>

                {/* Overlay with info */}
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-gray-600 truncate">{photo.filename}</p>
                  <div>{getStatusBadge(photo.status ?? 'pending')}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <ImageOff className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No photos uploaded yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              Upload your first photo to get started.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
