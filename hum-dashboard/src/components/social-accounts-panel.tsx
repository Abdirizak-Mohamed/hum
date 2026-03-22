import type { SocialAccount } from '@/types';

const STATUS_DOT: Record<string, string> = {
  connected: 'bg-green-400',
  expired: 'bg-red-400',
  disconnected: 'bg-gray-500',
};

const STATUS_TEXT: Record<string, string> = {
  connected: 'Connected',
  expired: 'Expired',
  disconnected: 'Disconnected',
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-400',
  google_business: 'text-yellow-400',
  twitter: 'text-sky-400',
  linkedin: 'text-blue-300',
};

type SocialAccountsPanelProps = {
  accounts: SocialAccount[];
};

export function SocialAccountsPanel({ accounts }: SocialAccountsPanelProps) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        Social Accounts
      </h2>

      {accounts.length === 0 ? (
        <p className="text-sm text-gray-500">No social accounts connected.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((acct) => {
            const dot = STATUS_DOT[acct.status] ?? 'bg-gray-500';
            const platformColor = PLATFORM_COLORS[acct.platform] ?? 'text-gray-300';
            return (
              <li key={acct.id} className="flex items-center gap-3">
                <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium capitalize ${platformColor}`}>
                    {acct.platform.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">{acct.platformAccountId}</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {STATUS_TEXT[acct.status] ?? acct.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
