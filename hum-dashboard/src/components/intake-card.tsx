'use client';

import { useState } from 'react';

export type IntakeSubmissionItem = {
  id: string;
  portalUserId: string;
  businessName: string;
  address: string | null;
  phone: string | null;
  menuData: string | null;
  socialLinks: Record<string, string> | null;
  brandPreferences: string | null;
  menuUploadIds: string[];
  foodPhotoUploadIds: string[];
  status: string;
  submittedAt: string | null;
  email: string;
  name: string;
};

type IntakeCardProps = {
  submission: IntakeSubmissionItem;
  onApprove: (id: string) => void;
  onReject: (id: string, reviewNotes: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return '--';
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

export function IntakeCard({
  submission,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: IntakeCardProps) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const socialLinks = submission.socialLinks ?? {};
  const socialEntries = Object.entries(socialLinks);
  const photoCount = submission.foodPhotoUploadIds?.length ?? 0;
  const menuUploadCount = submission.menuUploadIds?.length ?? 0;

  function handleRejectClick() {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    onReject(submission.id, reviewNotes);
  }

  function handleApproveClick() {
    onApprove(submission.id);
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">
            {submission.businessName}
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {submission.name} &middot; {submission.email}
          </p>
        </div>
        <span className="text-xs text-gray-500">
          Submitted {formatDate(submission.submittedAt)}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {/* Phone */}
        {submission.phone && (
          <div>
            <span className="text-gray-500 text-xs uppercase tracking-wide">Phone</span>
            <p className="text-gray-300">{submission.phone}</p>
          </div>
        )}

        {/* Address */}
        {submission.address && (
          <div>
            <span className="text-gray-500 text-xs uppercase tracking-wide">Address</span>
            <p className="text-gray-300">{submission.address}</p>
          </div>
        )}

        {/* Menu preview */}
        {submission.menuData && (
          <div className="sm:col-span-2">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Menu</span>
            <p className="text-gray-300 whitespace-pre-wrap">
              {truncate(submission.menuData, 300)}
            </p>
          </div>
        )}

        {/* Social links */}
        {socialEntries.length > 0 && (
          <div className="sm:col-span-2">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Social Links</span>
            <ul className="mt-1 space-y-0.5">
              {socialEntries.map(([platform, url]) => (
                <li key={platform} className="text-gray-300">
                  <span className="capitalize text-gray-400">{platform}:</span>{' '}
                  <span className="text-blue-400 break-all">{url}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Brand preferences */}
        {submission.brandPreferences && (
          <div className="sm:col-span-2">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Brand Preferences</span>
            <p className="text-gray-300">{submission.brandPreferences}</p>
          </div>
        )}

        {/* Upload counts */}
        {(photoCount > 0 || menuUploadCount > 0) && (
          <div>
            <span className="text-gray-500 text-xs uppercase tracking-wide">Uploads</span>
            <p className="text-gray-300">
              {photoCount > 0 && <span>{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>}
              {photoCount > 0 && menuUploadCount > 0 && <span> &middot; </span>}
              {menuUploadCount > 0 && <span>{menuUploadCount} menu file{menuUploadCount !== 1 ? 's' : ''}</span>}
            </p>
          </div>
        )}
      </div>

      {/* Reject notes input */}
      {showRejectInput && (
        <div className="space-y-2">
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            rows={2}
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleApproveClick}
          disabled={isApproving || isRejecting}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApproving ? 'Approving...' : 'Approve'}
        </button>
        <button
          onClick={handleRejectClick}
          disabled={isApproving || isRejecting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRejecting ? 'Rejecting...' : showRejectInput ? 'Confirm Reject' : 'Reject'}
        </button>
        {showRejectInput && (
          <button
            onClick={() => {
              setShowRejectInput(false);
              setReviewNotes('');
            }}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
