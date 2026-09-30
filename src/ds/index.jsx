// Ported from the Tamara Design System bundle (components/core/{Icon,Badge,Button}.jsx).
// Icons are Lucide (the DS's flagged substitution), bundled locally instead of loaded from a CDN.
import { useState } from 'react';

const ICONS = Object.fromEntries(
  Object.entries(import.meta.glob('./icons/*.svg', { query: '?url', import: 'default', eager: true }))
    .map(([path, url]) => [path.slice('./icons/'.length, -'.svg'.length), url]),
);

export function Icon({ name, size = 24, color = 'currentColor', label, style, ...rest }) {
  const url = ICONS[name];
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      style={{
        display: 'inline-block', flex: '0 0 auto', width: size, height: size, backgroundColor: color,
        WebkitMaskImage: `url("${url}")`, maskImage: `url("${url}")`,
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        ...style,
      }}
      {...rest}
    />
  );
}

const TONES = {
  neutral: ['var(--soft-grey-p1)', 'var(--text-primary)'],
  brand: ['var(--surface-brand)', 'var(--white)'],
  soft: ['var(--light-lilac)', 'var(--zingy-purple)'],
  success: ['var(--success-surface)', 'var(--success)'],
  warning: ['var(--warning-surface)', 'var(--warning)'],
  danger: ['var(--danger-surface)', 'var(--danger)'],
  info: ['var(--info-surface)', 'var(--info)'],
  promo: ['var(--promo-surface)', 'var(--promo)'],
  glass: ['rgba(255,255,255,.18)', 'var(--white)'],
};

export function Badge({ tone = 'neutral', icon, dot = false, size = 'md', children, style, ...rest }) {
  const [bg, fg] = TONES[tone] || TONES.neutral;
  const sm = size === 'sm';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: sm ? 4 : 6, height: sm ? 22 : 28,
        padding: sm ? '0 8px' : '0 12px', borderRadius: 'var(--radius-pill)', background: bg, color: fg,
        border: tone === 'glass' ? '1px solid rgba(255,255,255,.3)' : 'none',
        fontFamily: 'var(--font-body)', fontSize: sm ? 'var(--fs-micro)' : 'var(--fs-caption)',
        fontWeight: 'var(--fw-semibold)', lineHeight: 1, whiteSpace: 'nowrap', ...style,
      }}
      {...rest}
    >
      {dot ? <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }} /> : null}
      {icon ? <Icon name={icon} size={sm ? 12 : 14} /> : null}
      {children}
    </span>
  );
}

const SIZES = {
  sm: { h: 'var(--control-h-sm)', px: 16, fs: 'var(--fs-body-sm)', gap: 6, icon: 16 },
  md: { h: 'var(--control-h)', px: 24, fs: 'var(--fs-body)', gap: 8, icon: 18 },
  lg: { h: 'var(--control-h-lg)', px: 32, fs: 'var(--fs-body-lg)', gap: 10, icon: 20 },
};

function look(variant, hover, active) {
  switch (variant) {
    case 'secondary':
      return {
        background: 'transparent',
        color: active || hover ? 'var(--brand-hover)' : 'var(--text-brand)',
        boxShadow: `inset 0 0 0 var(--border-w-strong) ${active || hover ? 'var(--brand-hover)' : 'var(--border-brand)'}`,
      };
    case 'ghost':
      return { background: active ? 'var(--ghost-active)' : hover ? 'var(--ghost-hover)' : 'transparent', color: 'var(--text-brand)', boxShadow: 'none' };
    case 'inverse':
      return { background: active ? 'var(--light-lilac)' : hover ? 'var(--surface-brand-softer)' : 'var(--white)', color: 'var(--zingy-purple)', boxShadow: 'none' };
    case 'danger':
      return { background: active ? '#8E0000' : hover ? '#A50000' : 'var(--danger)', color: 'var(--white)', boxShadow: 'none' };
    default:
      return {
        background: active ? 'var(--brand-active)' : hover ? 'var(--brand-hover)' : 'var(--surface-brand)',
        color: 'var(--text-on-brand)',
        boxShadow: active ? 'var(--shadow-xs)' : 'var(--shadow-brand)',
      };
  }
}

export function Button({ variant = 'primary', size = 'md', icon, iconRight, fullWidth = false, disabled = false, loading = false, children, style, ...rest }) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const s = SIZES[size] || SIZES.md;
  const off = disabled || loading;
  const v = off ? { background: 'var(--state-disabled-surface)', color: 'var(--state-disabled-text)', boxShadow: 'none' } : look(variant, hover, active);
  return (
    <button
      type="button"
      disabled={off}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex', width: fullWidth ? '100%' : undefined,
        alignItems: 'center', justifyContent: 'center', gap: s.gap, height: s.h, padding: `0 ${s.px}px`,
        border: 'none', borderRadius: 'var(--radius-control)', fontFamily: 'var(--font-body)', fontSize: s.fs,
        fontWeight: 'var(--fw-semibold)', letterSpacing: '0', lineHeight: 1, textDecoration: 'none', whiteSpace: 'nowrap',
        cursor: off ? 'not-allowed' : 'pointer',
        transform: active && !off ? 'scale(var(--press-scale))' : 'scale(1)',
        transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard), transform var(--dur-instant) var(--ease-standard)',
        ...v, ...style,
      }}
      {...rest}
    >
      {loading ? <Icon name="loader-circle" size={s.icon} style={{ animation: 'tamara-spin 900ms linear infinite' }} />
        : icon ? <Icon name={icon} size={s.icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={s.icon} /> : null}
    </button>
  );
}
