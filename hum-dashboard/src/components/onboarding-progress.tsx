import type { OnboardingStatus } from '@/types';

type StepStatus = 'complete' | 'processing' | 'pending' | 'failed';

const STEP_DOT: Record<StepStatus, { symbol: string; color: string }> = {
  complete: { symbol: '✓', color: 'text-green-400 bg-green-900/30 border-green-700' },
  processing: { symbol: '⟳', color: 'text-blue-400 bg-blue-900/30 border-blue-700' },
  pending: { symbol: '·', color: 'text-gray-500 bg-gray-800 border-gray-700' },
  failed: { symbol: '✗', color: 'text-red-400 bg-red-900/30 border-red-700' },
};

type OnboardingProgressProps = {
  onboarding: OnboardingStatus | null;
};

export function OnboardingProgress({ onboarding }: OnboardingProgressProps) {
  if (!onboarding) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          Onboarding
        </h2>
        <p className="text-sm text-gray-500">Onboarding data unavailable.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Onboarding
        </h2>
        <span className="text-xs text-gray-400 capitalize">{onboarding.status}</span>
      </div>

      <ol className="relative space-y-0">
        {onboarding.steps.map((step, i) => {
          const dot = STEP_DOT[step.status] ?? STEP_DOT.pending;
          const isLast = i === onboarding.steps.length - 1;
          return (
            <li key={step.name} className="flex items-start gap-3">
              {/* Left: dot + connector line */}
              <div className="flex flex-col items-center">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold flex-shrink-0 ${dot.color}`}
                >
                  {dot.symbol}
                </span>
                {!isLast && (
                  <span className="w-px h-5 bg-gray-700 mt-0.5" />
                )}
              </div>

              {/* Step name */}
              <p
                className={`text-sm pt-0.5 ${
                  step.status === 'complete'
                    ? 'text-gray-300'
                    : step.status === 'processing'
                    ? 'text-white font-medium'
                    : step.status === 'failed'
                    ? 'text-red-400'
                    : 'text-gray-500'
                }`}
              >
                {step.name}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
