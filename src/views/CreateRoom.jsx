import { useState } from 'react';
import { Button, Icon } from '../ds/index.jsx';
import { SCORECARD_LABEL } from '../../shared/scorecard.js';
import { saveHostKey } from '../useRoom.js';
import { Header, Page, Stack, card, display, eyebrow, inputStyle } from '../ui.jsx';

const HOW = [
  { n: '01', t: 'Create the room and share the link' },
  { n: '02', t: 'Start a round with one trainee' },
  { n: '03', t: 'The room scores; you reveal results' },
];

function Segmented({ value, options, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'var(--soft-grey-p1)', flexWrap: 'wrap' }}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <button key={String(v)} type="button" onClick={() => onChange(v)} aria-pressed={on}
            style={{ flex: '1 1 auto', border: 'none', cursor: 'pointer', height: 34, padding: '0 14px', borderRadius: 999, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, background: on ? '#fff' : 'transparent', color: on ? 'var(--zingy-purple)' : 'var(--text-muted)', boxShadow: on ? 'var(--shadow-sm)' : 'none' }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
    {children}
  </label>
);

export default function CreateRoom({ navigate }) {
  const [name, setName] = useState('ERT cohort 14 — Experience recovery');
  const [trainerName, setTrainerName] = useState(() => { try { return localStorage.getItem('rr:trainerName') || ''; } catch { return ''; } });
  const [partialCredit, setPartial] = useState(false);
  const [zeroOnAutoFail, setZero] = useState(true);
  const [showRunningScore, setRunning] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      try { localStorage.setItem('rr:trainerName', trainerName.trim()); } catch { /* private mode */ }
      const res = await fetch('/api/rooms', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, trainerName, settings: { partialCredit, zeroOnAutoFail, showRunningScore } }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const { code, hostKey } = await res.json();
      saveHostKey(code, hostKey);
      navigate(`/room/${code}/host`);
    } catch {
      setError("Couldn't create the room. Check the server is running and try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="New room" />
      <Page>
        <Stack>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div style={{ flex: '1 1 380px', background: 'var(--tamara-lavender)', color: '#fff', borderRadius: 28, padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 32, minHeight: 360 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ ...eyebrow, color: 'var(--light-lilac)' }}>Trainer console</span>
                <h1 className="rr-hero" style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 52, lineHeight: 0.98, letterSpacing: '-.03em', textWrap: 'balance' }}>Everyone plays. Everyone scores.</h1>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, maxWidth: 420, color: '#fff' }}>One trainee takes the call with you. The rest of the room scores them live on the Experience Recovery scorecard.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
                {HOW.map(h => (
                  <div key={h.n} style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.28)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={display(22)}>{h.n}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.4 }}>{h.t}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={e => { e.preventDefault(); create(); }} style={{ ...card, flex: '1 1 380px', borderRadius: 28, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ margin: 0, ...display(26, 600), letterSpacing: '-.01em' }}>Create a room</h2>
              <Field label="Room name">
                <input value={name} onChange={e => setName(e.target.value)} maxLength={90} style={inputStyle} />
              </Field>
              <Field label="Your name (shown to trainees)">
                <input value={trainerName} onChange={e => setTrainerName(e.target.value)} maxLength={60} placeholder="e.g. Hana" style={inputStyle} />
              </Field>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>Scoring rules</span>
                <Segmented value={partialCredit} onChange={setPartial} options={[[false, 'Met / Not met'], [true, 'Met / Partial / Not met']]} />
                <Segmented value={zeroOnAutoFail} onChange={setZero} options={[[true, 'Auto-fail zeroes the score'], [false, 'Auto-fail is flagged only']]} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-body)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showRunningScore} onChange={e => setRunning(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--tamara-lavender)' }} />
                  Show scorers their running score while they score
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'var(--soft-grey-p2)' }}>
                <Icon name="clipboard-check" size={18} color="var(--tamara-lavender)" />
                <span style={{ fontSize: 13, color: 'var(--text-body)', flex: 1 }}>Scorecard: {SCORECARD_LABEL}</span>
              </div>
              {error ? <span role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</span> : null}
              <Button type="submit" size="lg" fullWidth iconRight="arrow-right" loading={busy}>Create room</Button>
            </form>
          </div>
        </Stack>
      </Page>
    </>
  );
}
