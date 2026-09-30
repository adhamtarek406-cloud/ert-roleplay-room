import { Badge, Icon } from './ds/index.jsx';

export const PAL = [
  ['var(--light-lilac)', 'var(--zingy-purple)'], ['var(--sky-blue-p1)', 'var(--sky-blue-m1)'],
  ['var(--vibrant-pink-p1)', 'var(--vibrant-pink-m2)'], ['var(--cyan-p1)', 'var(--cyan-m2)'],
  ['var(--fresh-green-p1)', 'var(--fresh-green-m2)'], ['var(--sand-p1)', 'var(--sand-m2)'], ['var(--sunset-p1)', 'var(--sunset-m2)'],
];
export const ini = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
export const first = n => n.split(' ')[0];
export const scoreColor = v => (v >= 80 ? 'var(--success)' : v >= 60 ? 'var(--tamara-lavender)' : 'var(--danger)');
export const REMOVED = { name: 'Removed trainee', c: 0 };
export const byId = (room, id) => room.trainees.find(t => t.id === id) || REMOVED;

export function elapsedLabel(start, now) {
  const el = Math.max(0, Math.floor((now - start) / 1000));
  return String(Math.floor(el / 60)).padStart(2, '0') + ':' + String(el % 60).padStart(2, '0');
}

export function Avatar({ t, size = 36, font = 13, style }) {
  const [bg, fg] = PAL[t.c % 7];
  return (
    <div style={{ width: size, height: size, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: font, flex: 'none', background: bg, color: fg, ...style }}>
      {ini(t.name)}
    </div>
  );
}

export const card = { background: '#fff', borderRadius: 20, boxShadow: 'var(--shadow-sm)' };
export const eyebrow = { fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' };
export const display = (size, weight = 700) => ({
  fontFamily: 'var(--font-display)', fontWeight: weight, fontSize: size,
  lineHeight: size >= 40 ? 1 : 1.1, letterSpacing: size >= 40 ? '-.03em' : size >= 26 ? '-.02em' : undefined,
});
export const inputStyle = {
  height: 48, padding: '0 18px', borderRadius: 14, border: '1px solid var(--border-default)',
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)', outline: 'none', background: '#fff',
};

export function LiveDot() {
  return <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--vibrant-pink)', animation: 'rr-pulse 1.4s ease-in-out infinite', flex: 'none' }} />;
}

export function Progress({ pct, style }) {
  return (
    <div style={{ height: 8, borderRadius: 99, background: 'var(--soft-grey-p1)', overflow: 'hidden', ...style }}>
      <div style={{ height: '100%', borderRadius: 99, background: 'var(--tamara-lavender)', transition: 'width 400ms cubic-bezier(.16,1,.3,1)', width: pct + '%' }} />
    </div>
  );
}

export function Header({ title, code, right }) {
  return (
    <header className="rr-header">
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 320px' }}>
          <a href="/" style={{ display: 'block' }}><img src="/logo-wordmark-lavender.png" alt="Tamara" style={{ height: 24, display: 'block' }} /></a>
          <div style={{ width: 1, height: 24, background: 'var(--border-default)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Role-play room</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          </div>
          {code ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '5px 9px', borderRadius: 8, whiteSpace: 'nowrap', flex: 'none', background: 'var(--surface-brand-softer)', color: 'var(--zingy-purple)' }}>{code}</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{right}</div>
      </div>
    </header>
  );
}

export function ConnectionBadge({ status }) {
  if (status === 'open') return null;
  return <Badge tone="warning" dot>Reconnecting…</Badge>;
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div key={toast.id} role="status" style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 50, background: 'var(--soft-grey-m2)', color: '#fff', padding: '12px 20px', borderRadius: 999, fontSize: 14, fontWeight: 600, boxShadow: 'var(--shadow-lg)', animation: 'rr-in 240ms cubic-bezier(.16,1,.3,1) both', display: 'flex', alignItems: 'center', gap: 8, maxWidth: 'calc(100vw - 32px)' }}>
      <Icon name="check" size={16} color="var(--fresh-green)" />{toast.message}
    </div>
  );
}

// Full-page centred message (room missing, not host, removed…).
export function Notice({ icon = 'door-closed', title, body, action }) {
  return (
    <div style={{ ...card, borderRadius: 28, maxWidth: 520, width: '100%', margin: '60px auto 0', padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <Icon name={icon} size={40} color="var(--dreamy-lilac)" />
      <span style={display(24, 600)}>{title}</span>
      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{body}</span>
      {action}
    </div>
  );
}

export function Page({ children }) {
  return (
    <main style={{ maxWidth: 1320, margin: '0 auto', padding: 28, display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {children}
    </main>
  );
}

export function Stack({ children, gap = 20 }) {
  return <section style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap }}>{children}</section>;
}
