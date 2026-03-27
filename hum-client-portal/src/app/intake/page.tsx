'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@/components/intake/progress-bar';
import { StepBusiness } from '@/components/intake/step-business';
import { StepMenu } from '@/components/intake/step-menu';
import { StepPhotos } from '@/components/intake/step-photos';
import { StepSocial } from '@/components/intake/step-social';
import { StepBrand } from '@/components/intake/step-brand';

interface UploadItem {
  id: string;
  filename: string;
  mimeType: string;
}

interface FormData {
  businessName: string;
  address: string;
  phone: string;
  openingHours: Record<string, string>;
  menuData: string;
  menuUploadIds: string[];
  menuUploads: UploadItem[];
  foodPhotoUploadIds: string[];
  foodPhotoUploads: UploadItem[];
  socialLinks: Record<string, string>;
  brandPreferences: string;
}

const TOTAL_STEPS = 5;

const EMPTY_FORM: FormData = {
  businessName: '',
  address: '',
  phone: '',
  openingHours: {},
  menuData: '',
  menuUploadIds: [],
  menuUploads: [],
  foodPhotoUploadIds: [],
  foodPhotoUploads: [],
  socialLinks: {},
  brandPreferences: '',
};

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load existing draft
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/intake');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setForm({
              businessName: data.businessName ?? '',
              address: data.address ?? '',
              phone: data.phone ?? '',
              openingHours: data.openingHours ?? {},
              menuData: data.menuData ?? '',
              menuUploadIds: data.menuUploadIds ?? [],
              menuUploads: data.menuUploads ?? [],
              foodPhotoUploadIds: data.foodPhotoUploadIds ?? [],
              foodPhotoUploads: data.foodPhotoUploads ?? [],
              socialLinks: data.socialLinks ?? {},
              brandPreferences: data.brandPreferences ?? '',
            });
          }
        }
      } catch {
        // First visit — use empty form
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Save draft to server
  const saveDraft = useCallback(async (data: FormData) => {
    setSaving(true);
    try {
      await fetch('/api/intake', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: data.businessName,
          address: data.address || undefined,
          phone: data.phone || undefined,
          openingHours: Object.keys(data.openingHours).length > 0 ? data.openingHours : undefined,
          menuData: data.menuData || undefined,
          menuUploadIds: data.menuUploadIds.length > 0 ? data.menuUploadIds : undefined,
          foodPhotoUploadIds: data.foodPhotoUploadIds.length > 0 ? data.foodPhotoUploadIds : undefined,
          socialLinks: Object.keys(data.socialLinks).length > 0 ? data.socialLinks : undefined,
          brandPreferences: data.brandPreferences || undefined,
        }),
      });
    } catch {
      // Silent save failure — draft save is best-effort
    } finally {
      setSaving(false);
    }
  }, []);

  function updateForm(partial: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function goNext() {
    setError('');
    await saveDraft(form);
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      window.scrollTo(0, 0);
    }
  }

  async function goBack() {
    setError('');
    await saveDraft(form);
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo(0, 0);
    }
  }

  async function handleSubmit() {
    setError('');
    await saveDraft(form);
    setSubmitting(true);

    try {
      const res = await fetch('/api/intake/submit', { method: 'POST' });
      if (res.ok) {
        router.push('/waiting');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Submission failed. Please check all required fields.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">hum</h1>
          <p className="mt-1 text-sm text-gray-500">Tell us about your business</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>

        {/* Step content */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
          {step === 1 && (
            <StepBusiness
              data={{
                businessName: form.businessName,
                address: form.address,
                phone: form.phone,
                openingHours: form.openingHours,
              }}
              onUpdate={updateForm}
            />
          )}
          {step === 2 && (
            <StepMenu
              data={{
                menuData: form.menuData,
                menuUploadIds: form.menuUploadIds,
                menuUploads: form.menuUploads,
              }}
              onUpdate={updateForm}
            />
          )}
          {step === 3 && (
            <StepPhotos
              data={{
                foodPhotoUploadIds: form.foodPhotoUploadIds,
                foodPhotoUploads: form.foodPhotoUploads,
              }}
              onUpdate={updateForm}
            />
          )}
          {step === 4 && (
            <StepSocial
              data={{ socialLinks: form.socialLinks }}
              onUpdate={updateForm}
            />
          )}
          {step === 5 && (
            <StepBrand
              data={{ brandPreferences: form.brandPreferences }}
              onUpdate={updateForm}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              onClick={goBack}
              disabled={saving}
              className="rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              onClick={goNext}
              disabled={saving}
              className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || saving}
              className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>

        {/* Saving indicator */}
        {saving && (
          <p className="mt-3 text-center text-xs text-gray-400">Saving draft...</p>
        )}
      </div>
    </div>
  );
}
