"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { UniversalSearchResponse } from "@/lib/search/types";

type CacheEntry = {
  data: UniversalSearchResponse;
  expiresAt: number;
};

const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 10;
const cache = new Map<string, CacheEntry>();

function cacheKey(q: string, preview: boolean) {
  return `${preview ? "p" : "f"}:${q.toLowerCase()}`;
}

function readCache(key: string): UniversalSearchResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function writeCache(key: string, data: UniversalSearchResponse) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function useSearch(query: string, options?: { preview?: boolean; enabled?: boolean }) {
  const preview = options?.preview ?? true;
  const enabled = options?.enabled ?? true;
  const [results, setResults] = useState<UniversalSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setResults(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const key = cacheKey(trimmed, preview);
      const cached = readCache(key);
      if (cached) {
        setResults(cached);
        setError(null);
        setIsLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: trimmed,
          preview: preview ? "true" : "false",
        });
        const res = await fetch(`/api/search?${params}`, { signal: controller.signal });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Search failed");
        }
        const data = (await res.json()) as UniversalSearchResponse;
        if (controller.signal.aborted) return;
        writeCache(key, data);
        setResults(data);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Search failed");
        setResults(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [preview],
  );

  useEffect(() => {
    if (!enabled) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setError(null);
      setIsLoading(false);
      abortRef.current?.abort();
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchSearch(trimmed);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, enabled, fetchSearch]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const detectedRegion =
    results?.detectedRegion ??
    (results && results.detectedRegion === null ? null : results?.detectedRegion ?? null);

  return {
    results,
    isLoading,
    error,
    detectedRegion: results?.detectedRegion ?? null,
  };
}
