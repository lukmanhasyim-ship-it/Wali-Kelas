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
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="card p-4">
        <Skeleton className="h-3 w-1/2 mb-3" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    ))}
  </div>
);

export default Skeleton;
