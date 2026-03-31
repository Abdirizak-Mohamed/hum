'use client';

import { useState } from 'react';
import { useIssues } from '@/lib/queries';
import { IssueCard } from '@/components/issue-card';
import type { IssueItem } from '@/types';

type TypeFilter = 'all' | 'failed_post' | 'token_expired' | 'gen_error';

const TABS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'failed_post', label: 'Failed Posts' },
  { key: 'token_expired', label: 'Expired Tokens' },
  { key: 'gen_error', label: 'Gen Errors' },
];

function countByType(issues: IssueItem[], type: TypeFilter): number {
  if (type === 'all') return issues.length;
  return issues.filter((i) => i.type === type).length;
}

export default function IssuesPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Always fetch all issues for tab counts
  const { data: allIssues } = useIssues();

  // Filtered query (or reuse allIssues for 'all')
  const { data: filteredIssues, isLoading, isError } = useIssues(
    typeFilter === 'all' ? undefined : typeFilter
  );

  const displayIssues = filteredIssues ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Issues</h1>
        <p className="text-xs text-gray-500">Auto-refreshes every 30s</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map((tab) => {
          const count = countByType(allIssues ?? [], tab.key);
          const isActive = typeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t transition-colors ${
                isActive
                  ? 'border-b-2 border-blue-500 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-40">
          <p className="text-gray-400">Loading issues…</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center min-h-40">
          <p className="text-red-400">Failed to load issues. Please refresh.</p>
        </div>
      ) : displayIssues.length === 0 ? (
        <div className="flex items-center justify-center min-h-40">
          <p className="text-green-400 text-sm">
            No issues — everything is running smoothly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
