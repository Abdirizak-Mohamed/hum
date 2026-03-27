'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';
import { IntakeCard, type IntakeSubmissionItem } from '@/components/intake-card';

const QUERY_KEY = ['intake', 'submitted'];

function useIntakeSubmissions() {
  return useQuery<IntakeSubmissionItem[]>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchJson<IntakeSubmissionItem[]>('/api/intake'),
    refetchInterval: 30_000,
  });
}

function useApproveIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ ok: boolean; clientId: string }>(
        `/api/intake/${id}/approve`,
        { method: 'POST' },
      ),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

function useRejectIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes: string }) =>
      fetchJson<{ ok: boolean }>(`/api/intake/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNotes }),
      }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export default function IntakePage() {
  const { data: submissions, isLoading, isError } = useIntakeSubmissions();
  const approveIntake = useApproveIntake();
  const rejectIntake = useRejectIntake();

  function handleApprove(id: string) {
    approveIntake.mutate(id);
  }

  function handleReject(id: string, reviewNotes: string) {
    rejectIntake.mutate({ id, reviewNotes });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Intake Review</h1>
        <p className="text-xs text-gray-500">Auto-refreshes every 30s</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-40">
          <p className="text-gray-400">Loading submissions...</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center min-h-40">
          <p className="text-red-400">Failed to load submissions. Please refresh.</p>
        </div>
      ) : !submissions || submissions.length === 0 ? (
        <div className="flex items-center justify-center min-h-40">
          <p className="text-gray-400 text-sm">No pending intake submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <IntakeCard
              key={sub.id}
              submission={sub}
              onApprove={handleApprove}
              onReject={handleReject}
              isApproving={approveIntake.isPending && approveIntake.variables === sub.id}
              isRejecting={
                rejectIntake.isPending && rejectIntake.variables?.id === sub.id
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
