'use client';

interface BusinessData {
  businessName: string;
  address: string;
  phone: string;
  openingHours: Record<string, string>;
}

interface StepBusinessProps {
  data: BusinessData;
  onUpdate: (data: Partial<BusinessData>) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500';

export function StepBusiness({ data, onUpdate }: StepBusinessProps) {
  function updateHours(day: string, value: string) {
    onUpdate({
      openingHours: { ...data.openingHours, [day]: value },
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Business Details</h2>
        <p className="mt-1 text-sm text-gray-500">
          Tell us about your restaurant or food business.
        </p>
      </div>

      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
          Business Name <span className="text-red-500">*</span>
        </label>
        <input
          id="businessName"
          type="text"
          value={data.businessName}
          onChange={(e) => onUpdate({ businessName: e.target.value })}
          placeholder="e.g. The Golden Fork"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          id="address"
          type="text"
          value={data.address}
          onChange={(e) => onUpdate({ address: e.target.value })}
          placeholder="123 Main Street, City, State"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={data.phone}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          placeholder="(555) 123-4567"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opening Hours
        </label>
        <div className="space-y-2">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm text-gray-600 shrink-0">{day}</span>
              <input
                type="text"
                value={data.openingHours[day] ?? ''}
                onChange={(e) => updateHours(day, e.target.value)}
                placeholder="9am - 11pm"
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
