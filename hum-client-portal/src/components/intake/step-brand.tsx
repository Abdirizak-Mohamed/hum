'use client';

interface BrandData {
  brandPreferences: string;
}

interface StepBrandProps {
  data: BrandData;
  onUpdate: (data: Partial<BrandData>) => void;
}

export function StepBrand({ data, onUpdate }: StepBrandProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Brand Preferences</h2>
        <p className="mt-1 text-sm text-gray-500">
          Tell us about your brand style and any preferences for your marketing content. This is optional but helps us match your voice.
        </p>
      </div>

      <div>
        <label htmlFor="brandPreferences" className="block text-sm font-medium text-gray-700 mb-1">
          Brand Notes
        </label>
        <textarea
          id="brandPreferences"
          value={data.brandPreferences}
          onChange={(e) => onUpdate({ brandPreferences: e.target.value })}
          placeholder="Examples:&#10;- We prefer a casual, friendly tone&#10;- Our brand colors are green and white&#10;- We want to highlight our farm-to-table sourcing&#10;- Target audience: families and young professionals"
          rows={8}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
      </div>
    </div>
  );
}
