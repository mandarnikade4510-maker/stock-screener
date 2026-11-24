'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useStockStore } from '@/stores/stockStore';
import { CATEGORIES, CRITERIA, ALL_INDUSTRIES, type Criterion } from '@/lib/criteria';
import { INDUSTRIES } from '@/lib/mockData';
import { PRESETS } from '@/lib/presets';
import type { FilterConfig, Sector } from '@/types/stock';

interface Ctx { get: (id: string) => FilterConfig | undefined; set: (f: FilterConfig) => void; remove: (id: string) => void }
const FilterCtx = createContext<Ctx | null>(null);
function useFilterCtx(): Ctx { const c = useContext(FilterCtx); if (!c) throw new Error('FilterPanel.* must be rendered inside <FilterPanel>'); return c; }
const make = (c: Criterion, operator: FilterConfig['operator'], value: FilterConfig['value']): FilterConfig => ({ id: c.id, field: c.field, operator, value, enabled: true });

function describe(f: FilterConfig): string {
  const c = CRITERIA.find(x => x.id === f.id); const label = c?.label ?? f.id;
  if (f.operator === 'between' && Array.isArray(f.value)) { const [lo, hi] = f.value as number[]; return `${label}: ${Number.isFinite(lo) ? lo : 'any'} to ${Number.isFinite(hi) ? hi : 'any'}`; }
  if (Array.isArray(f.value)) return `${label}: ${(f.value as Array<string | number>).join(', ')}`;
  return c?.kind === 'boolean' ? label : `${label}: ${String(f.value)}`;
}

function Root({ children, shown, total, collapsed, onToggle }: { children: ReactNode; shown: number; total: number; collapsed: boolean; onToggle: () => void }) {
  const filters = useStockStore(s => s.activeFilters); const upsert = useStockStore(s => s.upsertFilter); const remove = useStockStore(s => s.removeFilter);
  const clear = useStockStore(s => s.clearAllFilters); const setFilters = useStockStore(s => s.setFilters);
  const ctx = useMemo<Ctx>(() => ({ get: id => filters.find(f => f.id === id), set: upsert, remove }), [filters, upsert, remove]);
  if (collapsed) return <aside className="filters collapsed"><button onClick={onToggle} aria-label={`Expand filters, ${filters.length} active`}>☰ <span className="badge">{filters.length}</span></button></aside>;
  return (<FilterCtx.Provider value={ctx}><aside className="filters" aria-label="Filters">
    <div className="fhead"><h2>Filters <span className="badge" aria-label={`${filters.length} active filters`}>{filters.length}</span></h2><button onClick={onToggle} aria-label="Collapse filters">«</button></div>
    <p role="status" aria-live="polite" className="count">Showing {shown.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')} stocks</p>
    <div className="chips" aria-label="Presets">{PRESETS.map(p => <button key={p.name} onClick={() => setFilters(p.filters)}>{p.name}</button>)}</div>
    <div className="chips">{filters.map(f => <button key={f.id} className="chip" onClick={() => remove(f.id)} aria-label={`Remove filter ${describe(f)}`}>{describe(f)} ✕</button>)}</div>
    <button onClick={clear} disabled={filters.length === 0}>Clear all filters</button>
    {children}</aside></FilterCtx.Provider>);
}

function Range({ criterion: c }: { criterion: Criterion }) {
  const { get, set, remove } = useFilterCtx(); const cur = get(c.id); const [lo, hi] = Array.isArray(cur?.value) ? (cur.value as number[]) : [-Infinity, Infinity];
  const upd = (a: number, b: number) => (!Number.isFinite(a) && !Number.isFinite(b) ? remove(c.id) : set(make(c, 'between', [a, b])));
  const parse = (v: string, empty: number) => (v === '' ? empty : Number(v));
  return (<div className="field"><span>{c.label}</span><div className="pair">
    <input type="number" aria-label={`${c.label} minimum`} placeholder={String(c.min)} min={c.min} max={c.max} step={c.step} value={Number.isFinite(lo) ? lo : ''} onChange={e => upd(parse(e.target.value, -Infinity), hi!)} />
    <input type="number" aria-label={`${c.label} maximum`} placeholder={String(c.max)} min={c.min} max={c.max} step={c.step} value={Number.isFinite(hi) ? hi : ''} onChange={e => upd(lo!, parse(e.target.value, Infinity))} /></div></div>);
}
function MultiSelect({ criterion: c, options }: { criterion: Criterion; options?: string[] }) {
  const { get, set, remove } = useFilterCtx(); const [q, setQ] = useState(''); const chosen = (get(c.id)?.value as string[] | undefined) ?? [];
  const toggle = (o: string) => { const next = chosen.includes(o) ? chosen.filter(x => x !== o) : [...chosen, o]; if (next.length) set(make(c, 'in', next)); else remove(c.id); };
  const list = (options ?? c.options ?? []).filter(o => o.toLowerCase().includes(q.toLowerCase()));
  return (<fieldset className="field"><legend>{c.label}</legend><input type="search" aria-label={`Search ${c.label}`} placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
    <div className="checks">{list.map(o => <label key={o}><input type="checkbox" checked={chosen.includes(o)} onChange={() => toggle(o)} /> {o}</label>)}</div></fieldset>);
}
function Select({ criterion: c }: { criterion: Criterion }) {
  const { get, set, remove } = useFilterCtx(); const cur = get(c.id)?.value as string | undefined;
  return (<fieldset className="field"><legend>{c.label}</legend><div className="radios">
    <label><input type="radio" name={c.id} checked={cur === undefined} onChange={() => remove(c.id)} /> Any</label>
    {(c.options ?? []).map(o => <label key={o}><input type="radio" name={c.id} checked={cur === o} onChange={() => set(make(c, 'eq', o))} /> {o}</label>)}</div></fieldset>);
}
function Boolean({ criterion: c }: { criterion: Criterion }) {
  const { get, set, remove } = useFilterCtx(); const on = get(c.id) !== undefined;
  return <label className="field toggle"><input type="checkbox" role="switch" checked={on} onChange={() => (on ? remove(c.id) : set(make(c, 'eq', true)))} /> {c.label}</label>;
}

/** Renders every criterion from the catalog, grouped in accordion sections. */
function Sections() {
  const { get } = useFilterCtx(); const sectors = (get('sector')?.value as Sector[] | undefined) ?? [];
  const industries = sectors.length ? sectors.flatMap(s => INDUSTRIES[s]) : ALL_INDUSTRIES;
  return (<>{CATEGORIES.map(cat => (<details key={cat} open={cat === 'Fundamentals'}><summary>{cat}</summary>
    {CRITERIA.filter(c => c.category === cat).map(c => c.kind === 'range' ? <Range key={c.id} criterion={c} /> : c.kind === 'multi' ? <MultiSelect key={c.id} criterion={c} options={c.id === 'industry' ? industries : undefined} />
      : c.kind === 'select' ? <Select key={c.id} criterion={c} /> : <Boolean key={c.id} criterion={c} />)}</details>))}</>);
}
export const FilterPanel = Object.assign(Root, { Range, MultiSelect, Select, Boolean, Sections });
