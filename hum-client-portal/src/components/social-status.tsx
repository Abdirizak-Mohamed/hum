'use client';

import Link from 'next/link';
import { Instagram, Facebook, Music, MapPin } from 'lucide-react';
import { type Platform } from 'hum-core';

interface SocialStatusProps {
  platform: Platform;
  status: 'connected' | 'disconnected' | 'expired';
}

const platformInfo: Record<Platform, { name: string; icon: React.ReactNode }> = {
  instagram: {
    name: 'Instagram',
    icon: <Instagram className="w-4 h-4" />,
  },
  facebook: {
    name: 'Facebook',
    icon: <Facebook className="w-4 h-4" />,
  },
  tiktok: {
    name: 'TikTok',
    icon: <Music className="w-4 h-4" />,
  },
  google_business: {
    name: 'Google Business',
    icon: <MapPin className="w-4 h-4" />,
  },
};

const statusConfig = {
  connected: {
    color: 'bg-green-100',
    dotColor: 'bg-green-500',
    text: 'Connected',
    textColor: 'text-green-700',
  },
  disconnected: {
    color: 'bg-amber-100',
    dotColor: 'bg-amber-500',
    text: 'Disconnected',
    textColor: 'text-amber-700',
  },
  expired: {
    color: 'bg-red-100',
    dotColor: 'bg-red-500',
    text: 'Expired',
    textColor: 'text-red-700',
  },
};

export function SocialStatus({ platform, status }: SocialStatusProps) {
  const info = platformInfo[platform];
  const config = statusConfig[status];
  const needsReconnect = status === 'disconnected' || status === 'expired';

  return (
    <div className={`rounded-lg p-4 ${config.color} flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className="text-gray-700">{info.icon}</div>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${config.textColor}`}>{info.name}</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
            <span className={`text-sm ${config.textColor}`}>{config.text}</span>
          </div>
        </div>
      </div>
      {needsReconnect && (
        <Link
          href="/connect"
          className={`text-sm font-medium ${config.textColor} hover:underline`}
        >
          Reconnect
        </Link>
      )}
    </div>
  );
}
