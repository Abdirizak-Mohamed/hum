import type { BrandProfile } from '@/types';

type BrandProfilePanelProps = {
  brandProfile: BrandProfile | null;
};

export function BrandProfilePanel({ brandProfile }: BrandProfilePanelProps) {
  if (!brandProfile) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          Brand Profile
        </h2>
        <p className="text-sm text-gray-500">No brand profile available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Brand Profile
      </h2>

      {brandProfile.brandVoiceGuide && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Brand Voice</p>
          <p className="text-sm text-gray-200">{brandProfile.brandVoiceGuide}</p>
        </div>
      )}

      {brandProfile.keySellingPoints.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Key Selling Points</p>
          <ul className="list-disc list-inside space-y-0.5">
            {brandProfile.keySellingPoints.map((point, i) => (
              <li key={i} className="text-sm text-gray-200">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brandProfile.contentThemes.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Content Themes</p>
          <div className="flex flex-wrap gap-1.5">
            {brandProfile.contentThemes.map((theme) => (
              <span
                key={theme}
                className="inline-flex items-center rounded-full bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-300"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {brandProfile.hashtagStrategy.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Hashtags</p>
          <div className="flex flex-wrap gap-1.5">
            {brandProfile.hashtagStrategy.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300"
              >
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
