import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { Search, UsersRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { IParent, IStudent } from "@/interfaces/user";

const ParentChildFilter: React.FC = () => {
  const user = useAuthUser() as IParent;
  const children = user?.children ?? [];
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("childId") ?? "";
  const [search, setSearch] = useState("");

  const matchingChildren = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return children;
    return children.filter((child: IStudent) =>
      [child.fullName, child.username, child.email]
        .some((value) => value?.toLocaleLowerCase().includes(term))
    );
  }, [children, search]);

  const updateSelection = useCallback((childId: string) => {
    const next = new URLSearchParams(searchParams);
    if (childId) next.set("childId", childId);
    else next.delete("childId");
    next.set("page", "1");
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!search.trim() || matchingChildren.length !== 1 || selectedId === matchingChildren[0]._id) return;
    const timer = window.setTimeout(() => updateSelection(matchingChildren[0]._id), 250);
    return () => window.clearTimeout(timer);
  }, [matchingChildren, search, selectedId, updateSelection]);

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <label htmlFor="parent-child-search" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Find a child</label>
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input id="parent-child-search" value={search} onChange={(event) => { setSearch(event.target.value); if (selectedId) updateSelection(""); }} placeholder="Search name, username, or email" className="h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <div className="w-full sm:max-w-xs">
        <label htmlFor="parent-child-select" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Show data for</label>
        <div className="relative">
          <UsersRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select id="parent-child-select" value={selectedId} onChange={(event) => updateSelection(event.target.value)} className="h-11 w-full appearance-none rounded-xl border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
            <option value="">All my children</option>
            {matchingChildren.map((child: IStudent) => <option key={child._id} value={child._id}>{child.fullName} · {child.username}{child.email ? ` · ${child.email}` : ""}</option>)}
          </select>
        </div>
      </div>
      {search && matchingChildren.length === 0 && <p className="text-xs text-muted-foreground sm:pb-3">No linked child matches that name, username, or email.</p>}
    </div>
  );
};

type ParentPagedData<T> = { data?: T[]; meta?: { total?: number; limit?: number; page?: number } };

export const useParentInfiniteScroll = <T extends { _id?: string; id?: string }>(
  data: ParentPagedData<T> | undefined,
  isFetching: boolean
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<T[]>([]);
  const signatureRef = useRef("");
  const loadedPageRef = useRef(0);
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const filters = new URLSearchParams(searchParams);
  filters.delete("page");
  const signature = filters.toString();
  const total = data?.meta?.total ?? 0;
  const hasMore = items.length < total;

  useEffect(() => {
    if (signatureRef.current !== signature) {
      signatureRef.current = signature;
      loadedPageRef.current = 0;
      setItems([]);
    }
    if (isFetching || !data?.data || (data.meta?.page ?? requestedPage) !== requestedPage) return;

    const incomingPage = data.meta?.page ?? requestedPage;
    if (incomingPage <= loadedPageRef.current) return;
    setItems((current) => {
      if (incomingPage === 1) return data.data ?? [];
      const seen = new Set(current.map((item) => item._id ?? item.id).filter(Boolean));
      return [...current, ...(data.data ?? []).filter((item) => {
        const id = item._id ?? item.id;
        return !id || !seen.has(id);
      })];
    });
    loadedPageRef.current = incomingPage;
  }, [data, isFetching, requestedPage, signature]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || isFetching || (data?.meta?.page ?? requestedPage) !== requestedPage || requestedPage >= Math.ceil(total / Math.max(data?.meta?.limit ?? 10, 1))) return;
      const next = new URLSearchParams(searchParams);
      next.set("page", String(requestedPage + 1));
      setSearchParams(next);
    }, { rootMargin: "240px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [data?.meta?.limit, data?.meta?.page, hasMore, isFetching, requestedPage, searchParams, setSearchParams, total]);

  return { items, sentinelRef, hasMore, loadingMore: isFetching && requestedPage > 1 };
};

export const ParentInfiniteSentinel: React.FC<{ sentinelRef: React.Ref<HTMLDivElement>; hasMore: boolean; loading: boolean }> = ({ sentinelRef, hasMore, loading }) => (
  <div ref={sentinelRef} aria-live="polite" className="py-5 text-center text-sm text-muted-foreground">
    {loading ? "Loading more…" : hasMore ? "Scroll to load more" : null}
  </div>
);

export default ParentChildFilter;
