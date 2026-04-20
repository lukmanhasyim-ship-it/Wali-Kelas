import React from 'react';

const Skeleton = ({ className }) => (
  <div className={`skeleton-shimmer rounded-md ${className}`} />
);

export const SkeletonCard = () => (
  <div className="card space-y-4">
    <Skeleton className="h-6 w-1/3" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="card p-0 overflow-hidden">
    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
      <Skeleton className="h-4 w-1/4" />
    </div>
    <div className="p-6 space-y-4">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonStats = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {[...Array(2)].map((_, i) => (
      <div key={i} className="card p-6 h-32">
        <Skeleton className="h-4 w-1/4 mb-4 opacity-20" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    ))}
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <Skeleton className="h-8 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/2" />
    </div>
    
    <SkeletonStats />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card h-80">
            <Skeleton className="h-4 w-1/3 mb-6" />
            <div className="flex justify-center items-center h-48">
                <div className="w-32 h-32 rounded-full border-8 border-slate-50 border-t-slate-100 animate-spin" />
            </div>
        </div>
        <div className="lg:col-span-2 card h-80">
            <Skeleton className="h-4 w-1/4 mb-6" />
            <div className="h-48 flex items-end gap-2 px-4">
                {[...Array(12)].map((_, i) => (
                    <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 80 + 20}%` }} />
                ))}
            </div>
        </div>
    </div>
  </div>
);

export default Skeleton;
