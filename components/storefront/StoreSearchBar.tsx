"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

type StoreResult = {
  id: string
  name: string
  slug: string
  tagline: string | null
  logoUrl: string | null
  region: string | null
  categoryId: string | null
  tags: string[]
}

export default function StoreSearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<StoreResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/stores/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
        setShowDropdown(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:flex-row">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder='Try "handmade", "electronics", or a shop name...'
            className="w-full rounded-xl border border-white/15 bg-white px-4 py-3 text-base text-zinc-900 shadow-inner placeholder:text-zinc-400 focus:border-orange-300 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
          />
          {loading && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (query.trim()) {
              window.location.href = `/stores?q=${encodeURIComponent(query)}`
            }
          }}
          className="min-h-12 shrink-0 rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#B83A08] sm:min-w-40"
        >
          Search stores
        </button>
      </div>

      {showDropdown && results.length > 0 && (
        <div
          style={{ position: "absolute" }}
          className="absolute top-full right-0 left-0 z-[200] mt-2 overflow-hidden
            rounded-xl border border-zinc-200 bg-white shadow-2xl"
        >
          {results.map((store) => (
            <Link
              key={store.id}
              href={`/store/${store.slug}`}
              onClick={() => setShowDropdown(false)}
              className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 transition-colors last:border-0 hover:bg-zinc-50"
            >
              <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100">
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-base font-bold text-zinc-400">{store.name[0]}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900">{store.name}</p>
                {store.tagline && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{store.tagline}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {store.region && (
                    <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {store.region}
                    </span>
                  )}
                  {store.categoryId && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] capitalize text-blue-600">
                      {store.categoryId.replace(/_/g, " ")}
                    </span>
                  )}
                  {store.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-1 shrink-0 text-zinc-300"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
          <div className="bg-zinc-50 px-4 py-2 text-center">
            <button
              type="button"
              onClick={() => {
                window.location.href = `/stores?q=${encodeURIComponent(query)}`
                setShowDropdown(false)
              }}
              className="text-xs font-medium text-[#D4450A] hover:underline"
            >
              {`See all results for "` + query + `" →`}
            </button>
          </div>
        </div>
      )}

      {showDropdown && results.length === 0 && !loading && query.trim() && (
        <div
          style={{ position: "absolute" }}
          className="absolute top-full right-0 left-0 z-[200] mt-2 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center shadow-xl"
        >
          <p className="text-sm text-zinc-500">{`No stores found for "${query}"`}</p>
        </div>
      )}
    </div>
  )
}
