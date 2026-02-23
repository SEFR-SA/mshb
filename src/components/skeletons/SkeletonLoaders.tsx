import { Skeleton } from "@/components/ui/skeleton";

export const SidebarItemSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="space-y-1 px-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-2.5 p-2">
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-[70%]" />
          <Skeleton className="h-3 w-[90%]" />
        </div>
      </div>
    ))}
  </div>
);

export const ServerRailSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="flex flex-col items-center gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-12 rounded-2xl" />
    ))}
  </div>
);

export const MessageSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="space-y-4 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex gap-3">
        <Skeleton className="h-9 w-9 rounded-full shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-12" />
          </div>
          <Skeleton className="h-3 w-[85%]" />
          {i % 2 === 0 && <Skeleton className="h-3 w-[60%]" />}
        </div>
      </div>
    ))}
  </div>
);

export const MemberListSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="space-y-1 p-2">
    <Skeleton className="h-3 w-20 mb-2 mx-1" />
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-2 px-2 py-1.5">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
    ))}
  </div>
);

export const ChannelListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-4 p-2">
    {[0, 1].map((g) => (
      <div key={g}>
        <Skeleton className="h-3 w-28 mb-2 mx-1" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-4 w-4 rounded shrink-0" />
            <Skeleton className="h-3 w-[65%]" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

export const FriendListSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-[50%]" />
          <Skeleton className="h-3 w-[30%]" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    ))}
  </div>
);

export const SettingsSkeleton = () => (
  <div className="p-4 max-w-lg mx-auto space-y-6">
    {/* Banner */}
    <Skeleton className="h-36 w-full rounded-lg" />
    {/* Avatar + name */}
    <div className="flex items-center gap-4 -mt-12 ps-4">
      <Skeleton className="h-20 w-20 rounded-full border-4 border-background shrink-0" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    {/* Profile card */}
    <div className="rounded-lg border border-border p-6 space-y-4">
      <Skeleton className="h-4 w-24 mb-2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
    {/* Theme card */}
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-full" />
        ))}
      </div>
    </div>
    {/* Buttons */}
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  </div>
);
