import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  status: string;
  className?: string;
};

const STATUS_COLORS: Record<string, string> = {
  // green
  active: 'bg-green-900/50 text-green-300',
  connected: 'bg-green-900/50 text-green-300',
  scheduled: 'bg-green-900/50 text-green-300',
  // blue
  onboarding: 'bg-blue-900/50 text-blue-300',
  posted: 'bg-blue-900/50 text-blue-300',
  // gray
  paused: 'bg-gray-800 text-gray-400',
  disconnected: 'bg-gray-800 text-gray-400',
  draft: 'bg-gray-800 text-gray-400',
  // red
  churned: 'bg-red-900/50 text-red-300',
  expired: 'bg-red-900/50 text-red-300',
  failed: 'bg-red-900/50 text-red-300',
};

const DEFAULT_COLOR = 'bg-gray-800 text-gray-400';

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status.toLowerCase()] ?? DEFAULT_COLOR;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        colorClass,
        className
      )}
    >
      {status}
    </span>
  );
}
