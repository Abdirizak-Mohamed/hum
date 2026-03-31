'use client';

import { PhotoUploader } from '@/components/photo-uploader';

interface UploadItem {
  id: string;
  filename: string;
  mimeType: string;
}

interface MenuData {
  menuData: string;
  menuUploadIds: string[];
  menuUploads: UploadItem[];
}

interface StepMenuProps {
  data: MenuData;
  onUpdate: (data: Partial<MenuData>) => void;
}

export function StepMenu({ data, onUpdate }: StepMenuProps) {
  function handleUpload(upload: UploadItem) {
    onUpdate({
      menuUploadIds: [...data.menuUploadIds, upload.id],
      menuUploads: [...data.menuUploads, upload],
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Menu</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share your menu so we can create great content about your dishes.
        </p>
      </div>

      <div>
        <label htmlFor="menuData" className="block text-sm font-medium text-gray-700 mb-1">
          Menu Description <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">
          List your main dishes, prices, and any specialties. You can also paste a link to your online menu.
        </p>
        <textarea
          id="menuData"
          value={data.menuData}
          onChange={(e) => onUpdate({ menuData: e.target.value })}
          placeholder="Margherita Pizza - $14&#10;Caesar Salad - $12&#10;Grilled Salmon - $24&#10;..."
          rows={8}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Menu Photos / PDFs
        </label>
        <p className="text-xs text-gray-400 mb-3">
          Upload photos of your physical menu or a PDF version.
        </p>
        <PhotoUploader
          category="menu"
          existingUploads={data.menuUploads}
          onUpload={handleUpload}
        />
      </div>
    </div>
  );
}
