import { useEffect, useState } from 'react';

// Styles are written as CSS text, exactly as in the HiFi design files, and
// turned into React style objects here (cached).
const cache = new Map();
export const s = (css) => {
  let o = cache.get(css);
  if (o) return o;
  o = {};
  for (const part of css.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const k = part.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (k) o[k] = part.slice(i + 1).trim();
  }
  cache.set(css, o);
  return o;
};

// ---- routing (hash based so it works from any folder) --------------------

const path = () => location.hash.replace(/^#/, '') || '/';
export const go = (to) => { location.hash = to; };
export const useRoute = () => {
  const [p, set] = useState(path());
  useEffect(() => {
    const f = () => { set(path()); window.scrollTo(0, 0); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return p;
};

export function A({ to, style, children, ...rest }) {
  return <a href={'#' + to} style={typeof style === 'string' ? s(style) : style} {...rest}>{children}</a>;
}

// ---- toast ----------------------------------------------------------------

let showToast = () => {};
export const toast = (msg) => showToast(msg);
export function Toasts() {
  const [msg, set] = useState('');
  useEffect(() => {
    let t;
    showToast = (m) => { set(m); clearTimeout(t); t = setTimeout(() => set(''), 2600); };
  }, []);
  if (!msg) return null;
  return <div role="status" className="md-toast" style={s('position: fixed; left: 50%; bottom: 100px; transform: translateX(-50%); max-width: 340px; width: calc(100% - 48px); box-sizing: border-box; background: #14202B; color: #FFFFFF; padding: 12px 16px; border-radius: 14px; font-size: 14px; font-weight: 500; text-align: center; z-index: 50; box-shadow: 0 10px 30px rgba(20,32,43,0.3)')}>{msg}</div>;
}

// ---- small building blocks -----------------------------------------------

export function Logo({ size = 'sm', center }) {
  const big = { sm: [15, 28], md: [22, 48], lg: [30, 64] }[size];
  return (
    <div style={s('display: flex; align-items: baseline; gap: 2px; font-family: Kaushan Script, cursive; color: #D62839; line-height: 1' + (center ? '; justify-content: center' : '') + (size !== 'sm' ? '; text-shadow: 0 3px 6px rgba(214,40,57,0.18)' : ''))}>
      <span style={{ fontSize: big[0] }}>my</span><span style={{ fontSize: big[1] }}>DOC</span>
    </div>
  );
}

export function Back({ to, label = 'Back' }) {
  return <button type="button" aria-label={label} onClick={() => go(to)} style={s('display: flex; width: 44px; height: 44px; align-items: center; color: #0B7A75; border: 0; background: transparent; padding: 0; cursor: pointer')}><I.back /></button>;
}

export function Avatar({ p, size = 40, radius = 14, font = 14 }) {
  return <div style={{ width: size, height: size, flexShrink: 0, borderRadius: radius, background: p.bg, color: p.fg, fontSize: font, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.ini}</div>;
}

export function Toggle({ on }) {
  return <span style={s('flex-shrink: 0; width: 48px; height: 28px; border-radius: 14px; padding: 3px; box-sizing: border-box; display: flex; transition: background 0.2s; ' + (on ? 'background: #0B7A75; justify-content: flex-end' : 'background: #C5CDD4; justify-content: flex-start'))}><span style={s('width: 22px; height: 22px; border-radius: 11px; background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.25)')} /></span>;
}

export function Seg({ options, value, onChange, bg = '#FFFFFF', h = 40 }) {
  return (
    <div style={{ ...s('display: grid; gap: 4px; padding: 4px; border-radius: 14px'), background: bg, gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([k, label]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} style={{ ...s('border: 0; border-radius: 11px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.2s, color 0.2s; ' + (value === k ? 'background: #0B7A75; color: #FFFFFF' : 'background: transparent; color: #5B6672')), height: h }}>{label}</button>
      ))}
    </div>
  );
}

export const btn = {
  primary: 'display: flex; height: 56px; flex-shrink: 0; align-items: center; justify-content: center; gap: 8px; background: #0B7A75; color: #FFFFFF; border: 0; border-radius: 16px; font-size: 17px; font-weight: 600; font-family: inherit; text-decoration: none; cursor: pointer; box-shadow: 0 8px 20px rgba(11,122,117,0.28)',
  outline: 'display: flex; height: 52px; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid #0B7A75; color: #0B7A75; background: #FFFFFF; border-radius: 16px; font-size: 16px; font-weight: 600; font-family: inherit; text-decoration: none; cursor: pointer',
  dashed: 'display: flex; height: 48px; flex-shrink: 0; align-items: center; justify-content: center; gap: 8px; border: 1.5px dashed #0B7A75; border-radius: 14px; font-size: 15px; font-weight: 600; text-decoration: none; color: #0B7A75; background: #FFFFFF'
};

export const section = 'font-size: 13px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase';
export const card = 'background: #FFFFFF; border-radius: 24px; box-shadow: 0 6px 20px rgba(20,32,43,0.06)';

export function Nav({ tab, medsTo }) {
  const item = (on) => s('display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 11px; text-decoration: none; ' + (on ? 'font-weight: 700; color: #0B7A75' : 'font-weight: 500; color: #5B6672'));
  return (
    <nav style={s('position: sticky; bottom: 0; z-index: 5; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); background: #FFFFFF; min-height: 80px; padding-bottom: max(8px, env(safe-area-inset-bottom)); box-sizing: border-box; border-radius: 24px 24px 0 0; box-shadow: 0 -6px 24px rgba(20,32,43,0.06); margin-top: 16px')}>
      <a href="#/home" style={item(tab === 'people')} aria-current={tab === 'people' ? 'page' : undefined}>{tab === 'people' ? <I.peopleFill /> : <I.people />}People</a>
      <a href={'#' + medsTo} style={item(tab === 'meds')} aria-current={tab === 'meds' ? 'page' : undefined}><I.pill size={24} />Meds</a>
      <a href="#/profile" style={item(tab === 'profile')} aria-current={tab === 'profile' ? 'page' : undefined}>{tab === 'profile' ? <I.userFill /> : <I.user />}Profile</a>
    </nav>
  );
}

// A full-height screen column (390 px wide in the designs; stretches to the phone).
export function Screen({ bg = '#F5F7F8', pad = '12px 24px 24px', gap = 16, children, style }) {
  return <main style={{ minHeight: '100dvh', boxSizing: 'border-box', background: bg, display: 'flex', flexDirection: 'column', padding: pad, gap, position: 'relative', ...style }}>{children}</main>;
}

// ---- icons (from the design files) ----------------------------------------

const sv = (size, props, children) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>{children}</svg>;
const line = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' };
export const I = {
  back: () => sv(24, { ...line, strokeWidth: 2.2 }, <path d="M19 12H5M11 6l-6 6 6 6" />),
  chev: ({ size = 20, color = 'currentColor' }) => sv(size, { ...line, stroke: color, strokeWidth: 2.4 }, <path d="M9 5l7 7-7 7" />),
  chevL: () => sv(26, { ...line, strokeWidth: 2.4 }, <path d="M15 5l-7 7 7 7" />),
  chevR: () => sv(26, { ...line, strokeWidth: 2.4 }, <path d="M9 5l7 7-7 7" />),
  bell: () => sv(24, { ...line, strokeWidth: 2 }, <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  bellFill: () => sv(20, { fill: 'currentColor' }, <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  edit: () => sv(22, { ...line, strokeWidth: 2 }, <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>),
  pill: ({ size = 22 }) => sv(size, { ...line, strokeWidth: 2 }, <><rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" /><path d="M9.5 9.5l5 5" /></>),
  people: () => sv(24, { ...line, strokeWidth: 2 }, <><circle cx="9" cy="8" r="4" /><path d="M2 20a7 7 0 0 1 14 0" /><circle cx="17.5" cy="9" r="3" /><path d="M15 14.2A6 6 0 0 1 22 20" /></>),
  peopleFill: () => sv(24, { fill: 'currentColor' }, <><circle cx="9" cy="8" r="4" /><path d="M2 20a7 7 0 0 1 14 0z" /><circle cx="17.5" cy="9" r="3" /><path d="M15 14.2A6 6 0 0 1 22 20h-4.5" /></>),
  user: () => sv(24, { ...line, strokeWidth: 2 }, <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  userFill: () => sv(24, { fill: 'currentColor' }, <><circle cx="12" cy="8" r="4.5" /><path d="M3.5 21a8.5 8.5 0 0 1 17 0z" /></>),
  phone: ({ size = 20 }) => sv(size, { fill: 'currentColor' }, <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z" />),
  pin: ({ size = 20 }) => sv(size, { fill: 'currentColor' }, <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />),
  close: ({ size = 16 }) => sv(size, { ...line, strokeWidth: 3 }, <path d="M6 6l12 12M18 6L6 18" />),
  tick: ({ size = 16, color = 'currentColor', w = 3 }) => sv(size, { ...line, stroke: color, strokeWidth: w }, <path d="M5 12.5l4.5 4.5L19 7.5" />),
  cross: () => sv(24, { fill: 'currentColor' }, <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />),
  clock: ({ size = 14 }) => sv(size, { ...line, strokeWidth: 2.4 }, <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  watch: () => sv(16, { ...line, strokeWidth: 2 }, <><rect x="6" y="6" width="12" height="12" rx="3.5" /><path d="M9 6V3h6v3M9 18v3h6v-3" /></>),
  share: () => sv(22, { ...line, stroke: '#D62839', strokeWidth: 2.4 }, <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></>),
  eye: () => sv(22, { ...line, strokeWidth: 2 }, <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  lock: () => sv(20, { ...line, strokeWidth: 2 }, <><path d="M7 11V8a5 5 0 0 1 10 0v3" /><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M12 15v2" /></>),
  camera: () => sv(26, { ...line, strokeWidth: 2 }, <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  drop: () => sv(20, { fill: 'currentColor' }, <path d="M12 3c3 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.8 6-11z" />),
  gauge: () => sv(20, { ...line, strokeWidth: 2.2 }, <><path d="M4 16a8 8 0 1 1 16 0" /><path d="M12 16l4-5" /></>),
  heart: ({ size = 20 }) => sv(size, { fill: 'currentColor' }, <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" />),
  o2: () => <span style={{ fontSize: 12, fontWeight: 800 }}>O₂</span>
};
