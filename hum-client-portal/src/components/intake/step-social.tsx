'use client';

interface SocialData {
  socialLinks: Record<string, string>;
}

interface StepSocialProps {
  data: SocialData;
  onUpdate: (data: Partial<SocialData>) => void;
}

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourrestaurant' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourrestaurant' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourrestaurant' },
  { key: 'google_business', label: 'Google Business', placeholder: 'https://g.page/yourrestaurant' },
];

export function StepSocial({ data, onUpdate }: StepSocialProps) {
  function updateLink(key: string, value: string) {
    onUpdate({
      socialLinks: { ...data.socialLinks, [key]: value },
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Social Media</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share your existing social media links so we can connect everything together.
        </p>
      </div>

      <div className="space-y-4">
        {SOCIAL_FIELDS.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={field.key}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {field.label}
            </label>
            <input
              id={field.key}
              type="url"
              value={data.socialLinks[field.key] ?? ''}
              onChange={(e) => updateLink(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
