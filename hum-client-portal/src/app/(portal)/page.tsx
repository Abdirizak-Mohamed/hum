'use client';

import Link from 'next/link';
import { Camera, ArrowRight, FileText, User } from 'lucide-react';
import { ContentCard } from '@/components/content-card';
import { useContent } from '@/lib/queries';

export default function HomePage() {
  const { data, isLoading } = useContent({ status: 'scheduled' });

  const items = data?.items ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s coming up for your business.</p>
      </div>

      {/* Upcoming Posts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Posts</h2>
          {items.length > 0 && (
            <Link
              href="/content"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-w-[200px] h-52 rounded-xl bg-gray-100 animate-pulse flex-shrink-0"
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {items.map((item: Record<string, unknown>) => (
              <ContentCard
                key={item.id as string}
                item={{
                  id: item.id as string,
                  contentType: item.contentType as string,
                  status: item.status as string,
                  caption: item.caption as string | null,
                  mediaUrls: item.mediaUrls as string[],
                  platforms: item.platforms as string[],
                  scheduledAt: item.scheduledAt as string | null,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 p-8 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No upcoming posts yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              We&apos;re working on your content!
            </p>
          </div>
        )}
      </section>

      {/* Upload CTA */}
      <Link
        href="/upload"
        className="flex items-center justify-center gap-3 w-full rounded-xl bg-gray-900 text-white py-4 px-6 font-semibold text-base hover:bg-gray-800 transition-colors shadow-lg"
      >
        <Camera className="w-5 h-5" />
        Upload Photos
      </Link>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/content"
          className="flex items-center gap-3 rounded-xl bg-white border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
        >
          <FileText className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">View all content</p>
            <p className="text-xs text-gray-400">Browse your posts</p>
          </div>
        </Link>
        <Link
          href="/account"
          className="flex items-center gap-3 rounded-xl bg-white border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
        >
          <User className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">Your account</p>
            <p className="text-xs text-gray-400">Manage details</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
