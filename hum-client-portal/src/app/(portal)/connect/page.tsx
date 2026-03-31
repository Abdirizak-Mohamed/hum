'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Instagram, Facebook, Music, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAccount } from '@/lib/queries';

type PlatformKey = 'instagram' | 'facebook' | 'tiktok' | 'google_business';

const PLATFORMS: {
  key: PlatformKey;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}[] = [
  {
    key: 'instagram',
    name: 'Instagram',
    icon: <Instagram className="w-5 h-5" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    key: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: <Music className="w-5 h-5" />,
    color: 'text-gray-900',
    bgColor: 'bg-gray-100',
  },
  {
    key: 'google_business',
    name: 'Google Business',
    icon: <MapPin className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
];

export default function ConnectPage() {
  const searchParams = useSearchParams();
  const result = searchParams.get('result');
  const { data, isLoading, refetch } = useAccount();
  const [connecting, setConnecting] = useState<PlatformKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socialAccounts: Record<string, unknown>[] = data?.socialAccounts ?? [];

  // Refetch accounts when returning from OAuth callback
  useEffect(() => {
    if (result === 'success') {
      refetch();
    }
  }, [result, refetch]);

  function getAccountStatus(platform: PlatformKey): 'connected' | 'disconnected' | 'expired' | null {
    const account = socialAccounts.find((a) => a.platform === platform);
    if (!account) return null;
    return account.status as 'connected' | 'disconnected' | 'expired';
  }

  async function handleConnect(platform: PlatformKey) {
    setConnecting(platform);
    setError(null);

    try {
      const res = await fetch(`/api/connect/${platform}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to start connection (${res.status})`);
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setConnecting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connect Your Accounts</h1>
        <p className="text-gray-500 mt-1">
          Link your social media accounts so we can post content on your behalf.
        </p>
      </div>

      {/* Result banner */}
      {result === 'success' && (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Account connected successfully!
          </p>
        </div>
      )}
      {result && result !== 'success' && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-800">
            Connection failed. Please try again.
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Platform cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-gray-100 h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {PLATFORMS.map(({ key, name, icon, color, bgColor }) => {
            const status = getAccountStatus(key);
            const isConnected = status === 'connected';
            const isConnecting = connecting === key;

            return (
              <div
                key={key}
                className="rounded-xl bg-white border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center ${color}`}>
                    {icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{name}</p>
                    {isConnected && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Connected
                      </p>
                    )}
                    {status === 'expired' && (
                      <p className="text-sm text-red-600">Expired — reconnect below</p>
                    )}
                    {status === 'disconnected' && (
                      <p className="text-sm text-amber-600">Disconnected</p>
                    )}
                  </div>
                </div>

                {isConnected ? (
                  <button
                    onClick={() => handleConnect(key)}
                    disabled={isConnecting}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Reconnect'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(key)}
                    disabled={isConnecting}
                    className="bg-gray-900 text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
