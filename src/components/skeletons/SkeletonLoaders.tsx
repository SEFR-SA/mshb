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
