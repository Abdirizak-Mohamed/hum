'use client';

import { PhotoUploader } from '@/components/photo-uploader';

interface UploadItem {
  id: string;
  filename: string;
  mimeType: string;
}

interface PhotosData {
  foodPhotoUploadIds: string[];
  foodPhotoUploads: UploadItem[];
}

interface StepPhotosProps {
  data: PhotosData;
  onUpdate: (data: Partial<PhotosData>) => void;
}

export function StepPhotos({ data, onUpdate }: StepPhotosProps) {
  function handleUpload(upload: UploadItem) {
    onUpdate({
      foodPhotoUploadIds: [...data.foodPhotoUploadIds, upload.id],
      foodPhotoUploads: [...data.foodPhotoUploads, upload],
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Food Photos</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload photos of your best dishes. We recommend 5-10 high-quality photos.
        </p>
      </div>

      <PhotoUploader
        category="food_photo"
        existingUploads={data.foodPhotoUploads}
        onUpload={handleUpload}
      />

      <p className="text-xs text-gray-400">
        {data.foodPhotoUploads.length} photo{data.foodPhotoUploads.length !== 1 ? 's' : ''} uploaded.
        {data.foodPhotoUploads.length < 5 && ' We recommend at least 5 photos.'}
      </p>
    </div>
  );
}
