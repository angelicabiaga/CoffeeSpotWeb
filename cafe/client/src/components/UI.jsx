import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Coffee,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react';
import { api, message, today } from '../api';
export function useLoad(url, version = 0) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError('');
    api
      .get(url, { signal: c.signal })
      .then((r) => setData(r.data))
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [url, version]);
  return { data, error, loading };
}
export function Alert({ children, success = false }) {
  return children ? (
    <div role={success ? 'status' : 'alert'} className={'notice ' + (success ? 'success' : '')}>
      <AlertCircle size={17} />
      <span>{children}</span>
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="empty">
      <LoaderCircle className="spin" size={24} />
      <p>Loading your workspace…</p>
    </div>
  );
}
export function Empty({
  title = 'Nothing here yet',
  text = 'Records will appear here as you use Coffee Spot.',
}) {
  return (
    <div className="empty">
      <Coffee size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function PageTitle({ eyebrow = 'COFFEE SPOT', title, subtitle, children }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Badge({ children, tone = '' }) {
  return (
    <span
      className={
        'status ' +
        (tone ||
          {
            Queued: 'yellow',
            Preparing: 'purple',
            Ready: 'green',
            Completed: 'gray',
            Voided: 'red',
            active: 'green',
            pending: 'yellow',
            disabled: 'red',
          }[children] ||
          '')
      }
    >
      {children}
    </span>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      el.close();
      document.body.style.overflow = '';
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={'spot-modal ' + (wide ? 'wide' : '')}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  );
}
export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Form({ onSubmit, children, submit = 'Save changes', className = '' }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          await onSubmit(new FormData(e.currentTarget), e.currentTarget);
        } catch (err) {
          setError(message(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Alert>{error}</Alert>
      {children}
      <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
        {busy ? 'Please wait…' : submit}
      </button>
    </form>
  );
}
export function SearchInput({ value, onChange, placeholder = 'Search records…' }) {
  return (
    <label className="search-box">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Pager({ data, page, setPage }) {
  return data ? (
    <div className="pager">
      <span>
        {data.total} record{data.total === 1 ? '' : 's'} · Page {data.page} of {data.pages}
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Next page"
          disabled={page >= data.pages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  ) : null;
}
export function useTable() {
  const [q, setQ] = useState(''),
    [page, setPage] = useState(1),
    [version, setVersion] = useState(0);
  return {
    q,
    setQ: (v) => {
      setQ(v);
      setPage(1);
    },
    page,
    setPage,
    version,
    refresh: () => setVersion((v) => v + 1),
    query: `q=${encodeURIComponent(q)}&page=${page}`,
  };
}
export function DateFilter({ range, setRange }) {
  const [preset, setPreset] = useState('month');
  const set = (value) => {
    setPreset(value);
    const now = today();
    if (value === 'all') setRange({ from: '', to: '' });
    if (value === 'today') setRange({ from: now, to: now });
    if (value === 'month') setRange({ from: now.slice(0, 7) + '-01', to: now });
    if (value === 'year') setRange({ from: now.slice(0, 4) + '-01-01', to: now });
  };
  return (
    <div className="date-filter">
      <select aria-label="Reporting period" value={preset} onChange={(e) => set(e.target.value)}>
        <option value="today">Today</option>
        <option value="month">This month</option>
        <option value="year">This year</option>
        <option value="all">All time</option>
        <option value="custom">Custom dates</option>
      </select>
      <input
        aria-label="Start date"
        type="date"
        value={range.from}
        onChange={(e) => {
          setPreset('custom');
          setRange({ ...range, from: e.target.value });
        }}
      />
      <span>to</span>
      <input
        aria-label="End date"
        type="date"
        value={range.to}
        onChange={(e) => {
          setPreset('custom');
          setRange({ ...range, to: e.target.value });
        }}
      />
    </div>
  );
}
export const initialRange = () => ({
  from: today().slice(0, 7) + '-01',
  to: today(),
});
export const rangeQuery = (r) => new URLSearchParams(r).toString();
export function CoffeeArt({ variant = 'latte' }) {
  const color = {
    matcha: '#83935f',
    espresso: '#5b302b',
    chocolate: '#855147',
    tea: '#c39a51',
    latte: '#bf8b65',
    pastry: '#dca254',
  }[variant];
  return (
    <div className={'coffee-art ' + variant}>
      <svg viewBox="0 0 200 155" aria-hidden="true">
        <ellipse cx="102" cy="135" rx="56" ry="9" fill="#552338" opacity=".08" />
        {variant === 'pastry' ? (
          <g fill={color} stroke="#ac7232" strokeWidth="2">
            <path d="M44 103Q25 45 85 65L110 103Z" />
            <path d="M155 103Q175 45 115 65L90 103Z" />
            <path d="M60 66Q100 36 140 66L126 109Q100 121 74 109Z" />
            <path d="M84 58L92 116M115 58L108 116" fill="none" />
          </g>
        ) : (
          <>
            <path d="M137 63h12c35 0 30 42 0 43h-15" fill="none" stroke="#fff" strokeWidth="12" />
            <path d="M54 58h91l-8 56q-5 18-36 18t-37-18z" fill="#fff" />
            <ellipse cx="100" cy="59" rx="46" ry="15" fill="#f4e9de" />
            <ellipse cx="100" cy="59" rx="39" ry="11" fill={color} />
            {variant !== 'espresso' && (
              <path d="M81 59q19-22 38 0-19 22-38 0m10-1q10-10 19 0-10 10-19 0" fill="#f7ead7" />
            )}
            <path
              d="M84 35q-9-10 0-21m20 20q9-10 0-22m18 23q-8-8 0-15"
              fill="none"
              stroke="#ab8c86"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".65"
            />
          </>
        )}
      </svg>
    </div>
  );
}
