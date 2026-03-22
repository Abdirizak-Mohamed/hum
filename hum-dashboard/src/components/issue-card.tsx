'use client';

import Link from 'next/link';
import { useRetryIssue, useDismissIssue } from '@/lib/queries';
import { StatusBadge } from '@/components/status-badge';
import type { IssueItem } from '@/types';

const SEVERITY_BORDER: Record<string, string> = {
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
  purple: 'border-l-purple-500',
};

const CATEGORY_BADGE: Record<string, string> = {
  token_expired: 'red',
  failed_post: 'amber',
  gen_error: 'paused',
};

const CATEGORY_LABEL: Record<string, string> = {
  token_expired: 'Expired Token',
  failed_post: 'Failed Post',
  gen_error: 'Gen Error',
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type IssueCardProps = {
  issue: IssueItem;
};

export function IssueCard({ issue }: IssueCardProps) {
  const retryIssue = useRetryIssue();
  const dismissIssue = useDismissIssue();

  const borderClass = SEVERITY_BORDER[issue.severity] ?? 'border-l-gray-600';
  const categoryStatus = CATEGORY_BADGE[issue.type] ?? 'paused';
  const categoryLabel = CATEGORY_LABEL[issue.type] ?? issue.type;

  const isContentItem = issue.entityType === 'content_item';
  const isSocialAccount = issue.entityType === 'social_account';

  function handleRetry() {
    retryIssue.mutate(issue.id);
  }

  function handleDismiss() {
    dismissIssue.mutate(issue.id);
  }

  return (
    <div
      className={`border-l-4 bg-gray-900 border border-gray-800 rounded-r-lg px-4 py-3 space-y-2 ${borderClass}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={categoryStatus} className="text-[11px]" />
          <span className="text-xs text-gray-400 font-medium">{categoryLabel}</span>
        </div>
        <span className="text-xs text-gray-500">{formatRelative(issue.timestamp)}</span>
      </div>

      <div>
        <Link
          href={`/clients/${issue.clientId}`}
          className="text-sm font-medium text-blue-400 hover:text-blue-300"
        >
          {issue.clientName}
        </Link>
        <p className="text-sm text-gray-300 mt-0.5">{issue.description}</p>
      </div>

      {/* Contextual actions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {isContentItem && (
          <button
            onClick={handleRetry}
            disabled={retryIssue.isPending}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
          >
            Retry
          </button>
        )}
        {isSocialAccount && (
          <button
            disabled
            className="text-xs text-amber-400 opacity-60 cursor-not-allowed"
            title="Reconnect flow coming soon"
          >
            Reconnect
          </button>
        )}
        {issue.type === 'gen_error' && (
          <button
            onClick={handleRetry}
            disabled={retryIssue.isPending}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
          >
            Skip Post
          </button>
        )}
        <Link
          href={`/clients/${issue.clientId}`}
          className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          View Client
        </Link>
        <button
          onClick={handleDismiss}
          disabled={dismissIssue.isPending}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
