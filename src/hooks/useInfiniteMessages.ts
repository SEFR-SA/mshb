import { useCallback, useRef, useLayoutEffect, useState, useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 50;

interface UseInfiniteMessagesConfig {
  threadId?: string;
  groupThreadId?: string;
  channelId?: string;
  enabled?: boolean;
}

export const useInfiniteMessages = ({
  threadId,
  groupThreadId,
  channelId,
  enabled = true,
}: UseInfiniteMessagesConfig) => {
  const queryClient = useQueryClient();

  // Determine the filter
  const filterKey = threadId
    ? "thread_id"
    : groupThreadId
      ? "group_thread_id"
      : "channel_id";
  const filterValue = threadId || groupThreadId || channelId || "";

  const queryKey = ["messages", filterKey, filterValue];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq(filterKey, filterValue)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return (data || []) as any[];
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page returned a full PAGE_SIZE, there might be more
      if (lastPage.length === PAGE_SIZE) return allPages.length;
      return undefined;
    },
    initialPageParam: 0,
    enabled: enabled && !!filterValue,
  });

  // Flatten: pages are fetched DESC (newest first in page 0).
  // We reverse each page and concatenate in reverse page order so oldest is first.
  const messages = data
    ? data.pages
        .slice()
        .reverse()
        .flatMap((page) => [...page].reverse())
    : [];

  // --- Scroll preservation ---
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevPageCountRef = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);

  // Call this before fetchNextPage to capture scroll position
  const captureScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      prevScrollHeightRef.current = el.scrollHeight;
      prevScrollTopRef.current = el.scrollTop;
    }
    prevPageCountRef.current = data?.pages.length || 0;
  }, [data?.pages.length]);

  // Wrap fetchNextPage to capture scroll first
  const fetchNextPageWithScroll = useCallback(() => {
    captureScroll();
    return fetchNextPage();
  }, [captureScroll, fetchNextPage]);

  // Restore scroll position after DOM update when page count increases
  const pageCount = data?.pages.length || 0;

  useLayoutEffect(() => {
    if (pageCount > prevPageCountRef.current && prevPageCountRef.current > 0) {
      const el = scrollRef.current;
      if (el) {
        const newScrollHeight = el.scrollHeight;
        const delta = newScrollHeight - prevScrollHeightRef.current;
        el.scrollTop = prevScrollTopRef.current + delta;
      }
    }
    prevPageCountRef.current = pageCount;
  }, [pageCount, messages.length]);

  // Scroll to bottom on initial load
  const initialLoadDoneRef = useRef(false);
  useLayoutEffect(() => {
    if (!isLoading && messages.length > 0 && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      const el = scrollRef.current;
      if (el) {
        // Use requestAnimationFrame to ensure DOM is painted
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    }
  }, [isLoading, messages.length]);

  // Reset on filter change
  useLayoutEffect(() => {
    initialLoadDoneRef.current = false;
    prevPageCountRef.current = 0;
  }, [filterValue]);

  // --- Scroll-to-bottom tracking ---
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollToBottom(distanceFromBottom > 200);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [filterValue]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  // --- Realtime cache helpers ---
  const appendRealtimeMessage = useCallback(
    (msg: any) => {
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        // Page 0 contains the newest messages
        const pages = [...old.pages];
        const page0 = pages[0] || [];
        // Don't add duplicates
        if (page0.find((m: any) => m.id === msg.id)) return old;
        // Prepend to page 0 (it's DESC ordered, newest first)
        pages[0] = [msg, ...page0];
        return { ...old, pages };
      });

      // Scroll to bottom for new messages
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) {
          // Only auto-scroll if user is near the bottom
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          if (distanceFromBottom < 200) {
            el.scrollTop = el.scrollHeight;
          }
        }
      });
    },
    [queryClient, queryKey.join(",")]
  );

  const updateRealtimeMessage = useCallback(
    (updated: any) => {
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.map((m: any) => (m.id === updated.id ? updated : m))
          ),
        };
      });
    },
    [queryClient, queryKey.join(",")]
  );

  return {
    messages,
    fetchNextPage: fetchNextPageWithScroll,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    isLoading,
    queryKey,
    scrollRef,
    appendRealtimeMessage,
    updateRealtimeMessage,
  };
};
