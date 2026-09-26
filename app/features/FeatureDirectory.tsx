"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { featureGroups } from "./catalog";
import s from "./features.module.css";
export default function FeatureDirectory() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const groups = featureGroups.filter(group => category === "all" || group.id === category).map(group => ({ ...group, features: group.features.filter(feature => `${feature.title} ${feature.text}`.toLowerCase().includes(query.trim().toLowerCase())) })).filter(group => group.features.length);
  const count = groups.reduce((sum,group) => sum + group.features.length, 0);
  return <div className={s.directory}>
    <div className={s.controls}><div className={s.tabs} aria-label="Feature categories" role="group">{[{ id: "all", label: "All features" }, ...featureGroups].map(group => <button key={group.id} aria-pressed={category === group.id} onClick={() => setCategory(group.id)}>{group.label}</button>)}</div><label className={s.search}><Search size={17}/><span className="sr-only">Search features</span><input type="search" aria-label="Search features" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a feature…"/>{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15}/></button>}</label></div>
    <p className={s.count} role="status">{count} {count === 1 ? "feature" : "features"}{query && ` matching “${query}”`}</p>
    {groups.map((group,index) => <section className={s.group} key={group.id} id={group.id}><div className={s.groupIntro}><span>0{index + 1}</span><div><h2>{group.label}</h2><p>{group.intro}</p></div></div><div className={s.grid}>{group.features.map(feature => <Link key={feature.title} className={s.card} href={feature.href}><div><h3>{feature.title}</h3><ArrowUpRight size={17}/></div><p>{feature.text}</p><span>Explore feature <span aria-hidden>→</span></span></Link>)}</div></section>)}
    {!count && <div className={s.empty}><Search size={28}/><h2>No features found</h2><p>Try “orders”, “Rex” or “tickets”, or explore all features.</p><button onClick={() => { setQuery(""); setCategory("all"); }}>Show all features</button></div>}
  </div>;
}
