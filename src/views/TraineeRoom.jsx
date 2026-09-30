import { useEffect, useState } from 'react';
import { Badge, Button, Icon } from '../ds/index.jsx';
import { ATTRS, CATS, scoreOf } from '../../shared/scorecard.js';
import { useNow, useRoom } from '../useRoom.js';
import { Avatar, ConnectionBadge, Header, LiveDot, Notice, Page, Progress, Stack, Toast, byId, card, display, elapsedLabel, eyebrow, first, inputStyle } from '../ui.jsx';
import { Leaderboard, RoundReport } from './Results.jsx';

function Join({ room, send }) {
  const [name, setName] = useState('');
  const joined = room.trainees.filter(t => t.status === 'joined').length;
  const invited = room.trainees.filter(t => t.status === 'invited');
  return (
    <div style={{ maxWidth: 520, width: '100%', margin: '40px auto 0', background: '#fff', borderRadius: 28, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
      <div style={{ background: 'var(--tamara-lavender)', color: '#fff', padding: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ ...eyebrow, color: 'var(--light-lilac)' }}>You're invited</span>
        <span style={{ ...display(34), lineHeight: 1.02, letterSpacing: '-.02em' }}>{room.name}</span>
        <span style={{ fontSize: 14 }}>Hosted by {room.trainerName} · {joined} trainee{joined === 1 ? '' : 's'} inside</span>
      </div>
      <form onSubmit={e => { e.preventDefault(); send('join', { name }); }} style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {invited.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>On the list? Tap your name</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {invited.map(t => (
                <button key={t.id} type="button" className="rr-chip" onClick={() => send('join', { name: t.name })}>
                  <Avatar t={t} size={26} font={10} />{t.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>{invited.length ? 'Or enter your name' : 'Your name'}</span>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="e.g. Reem Al-Qahtani" autoComplete="name" style={inputStyle} />
        </label>
        <Button type="submit" size="lg" fullWidth disabled={!name.trim()}>Join room</Button>
      </form>
    </div>
  );
}

function Performer({ room, now }) {
  const r = room.round;
  return (
    <>
      <div style={{ background: 'var(--tamara-lavender)', color: '#fff', borderRadius: 28, padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LiveDot /><span style={eyebrow}>Round {r.n} · You're on the call</span></div>
            <span className="rr-hero" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 52, lineHeight: 0.98, letterSpacing: '-.03em' }}>You've got this.</span>
          </div>
          <span style={{ ...display(48, 600), fontVariantNumeric: 'tabular-nums' }}>{elapsedLabel(r.start, now)}</span>
        </div>
        <span style={{ fontSize: 14, color: 'var(--light-lilac)' }}>{room.trainerName} is playing the customer. {r.scorerIds.length} peer{r.scorerIds.length === 1 ? ' is' : 's are'} scoring you on the Experience Recovery scorecard.</span>
      </div>
      <div style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={display(20, 600)}>What you're scored on</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
          {CATS.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'var(--soft-grey-p2)' }}>
              <span style={{ ...display(18), color: 'var(--tamara-lavender)', width: 44 }}>{c.w}%</span>
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Draft answers survive a refresh (per tab) until the scorecard is submitted.
function useDraft(key) {
  const [answers, setAnswers] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key)) || {}; } catch { return {}; } });
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(answers)); } catch { /* private mode */ } }, [key, answers]);
  return [answers, setAnswers];
}

function Scoring({ room, me, send, now }) {
  const r = room.round;
  const perf = byId(room, r.performerId);
  const [answers, setAnswers] = useDraft(`rr:draft:${room.code}:${r.n}:${me.id}`);
  const [cat, setCat] = useState(0);
  const [open, setOpen] = useState({});
  const three = room.settings.partialCredit;
  const answered = ATTRS.filter(a => answers[a.id]).length;
  const OPTS = [['met', 'Met', 'check', 'var(--success-surface)', 'var(--success)'], ...(three ? [['part', 'Partial', 'minus', 'var(--warning-surface)', 'var(--warning)']] : []), ['miss', 'Not met', 'x', 'var(--danger-surface)', 'var(--danger)']];
  // Every category is on the page at once; the side list is a progress index that jumps to a section.
  const go = i => document.getElementById('rr-cat-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  useEffect(() => {
    const els = CATS.map((c, i) => document.getElementById('rr-cat-' + i));
    const io = new IntersectionObserver(entries => {
      const hit = entries.filter(e => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
      if (hit) setCat(Number(hit.target.dataset.cat));
    }, { rootMargin: '-96px 0px -60% 0px' });
    els.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div style={{ ...card, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Avatar t={perf} size={48} font={16} />
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LiveDot /><span style={{ ...eyebrow, color: 'var(--text-muted)' }}>Round {r.n} · Live · {elapsedLabel(r.start, now)}</span></div>
          <span style={display(22, 600)}>Scoring {perf.name}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <nav className="rr-catnav" style={{ ...card, flex: '1 1 220px', maxWidth: 280, padding: 10, display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 96 }}>
          {CATS.map((c, i) => {
            const at = ATTRS.filter(a => a.c === i);
            const done = at.filter(a => answers[a.id]).length;
            const on = cat === i, full = done === at.length;
            return (
              <button key={c.name} type="button" onClick={() => go(i)} aria-current={on ? 'step' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', cursor: 'pointer', textAlign: 'left', padding: '10px 12px', borderRadius: 12, fontFamily: 'var(--font-body)', background: on ? 'var(--surface-brand-softer)' : 'transparent' }}>
                <span style={{ width: 26, height: 26, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none', background: full ? 'var(--tamara-lavender)' : on ? 'var(--light-lilac)' : 'var(--soft-grey-p1)', color: full ? '#fff' : on ? 'var(--zingy-purple)' : 'var(--text-muted)' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: on ? 'var(--zingy-purple)' : 'var(--text-primary)' }}>{c.name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{done}/{at.length}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ flex: '999 1 400px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 32 }}>
          {CATS.map((c, ci) => (
          <section key={c.name} id={'rr-cat-' + ci} data-cat={ci} style={{ display: 'flex', flexDirection: 'column', gap: 14, scrollMarginTop: 96 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ ...display(30), letterSpacing: '-.02em' }}>{ci + 1}. {c.name}</span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{c.w}% of total</span>
          </div>
          {ATTRS.filter(a => a.c === ci).map(a => (
            <div key={a.id} style={{ ...card, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge size="sm" tone="soft">{a.e}</Badge>
                <Badge size="sm" tone="neutral">{a.w}%</Badge>
                {a.crit === 'auto' ? <Badge size="sm" tone="danger" icon="triangle-alert">Auto-fail</Badge> : null}
                {a.crit === 'crit' ? <Badge size="sm" tone="warning">Critical</Badge> : null}
              </div>
              <span style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, textWrap: 'pretty' }}>{a.t}</span>
              <div role="radiogroup" aria-label={a.e} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {OPTS.map(([v, label, icon, bg, fg]) => {
                  const on = answers[a.id] === v;
                  return (
                    <button key={v} type="button" role="radio" aria-checked={on} onClick={() => setAnswers(x => ({ ...x, [a.id]: v }))}
                      style={{ flex: '1 1 120px', height: 48, borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, transition: 'background 160ms,color 160ms', background: on ? bg : '#fff', color: on ? fg : 'var(--text-body)', border: on ? '1.5px solid ' + fg : '1px solid var(--border-default)' }}>
                      <Icon name={icon} size={18} />{label}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setOpen(o => ({ ...o, [a.id]: !o[a.id] }))} aria-expanded={!!open[a.id]}
                style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--tamara-lavender)' }}>
                <Icon name={open[a.id] ? 'chevron-up' : 'chevron-down'} size={16} />{open[a.id] ? 'Hide guidance' : 'What to observe'}
              </button>
              {open[a.id] ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                  <div style={{ background: 'var(--soft-grey-p2)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Observe for</span>
                    {a.o.map(line => (
                      <div key={line} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.45, color: 'var(--text-body)' }}>
                        <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--dreamy-lilac)', flex: 'none', marginTop: 7 }} /><span>{line}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'var(--surface-brand-softer)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--zingy-purple)' }}>What good looks like</span>
                    <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-body)' }}>{a.g}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          </section>
          ))}
        </div>
      </div>

      <div style={{ position: 'sticky', bottom: 16, zIndex: 10, background: 'var(--soft-grey-m2)', color: '#fff', borderRadius: 999, padding: '10px 10px 10px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', boxShadow: 'var(--shadow-lg)' }}>
        <span style={{ fontSize: 14 }}><strong>{answered}</strong> of {ATTRS.length} answered</span>
        {room.settings.showRunningScore ? <span style={{ fontSize: 14, color: 'var(--light-lilac)' }}>Your score so far <strong style={{ color: '#fff' }}>{scoreOf(answers)}%</strong></span> : null}
        <span style={{ flex: 1 }} />
        <Button icon="send" disabled={answered < ATTRS.length} onClick={() => send('submit', { answers })}>Submit scorecard</Button>
      </div>
    </>
  );
}

function Submitted({ room, mine }) {
  const r = room.round;
  const pct = r.scorerIds.length ? Math.round(r.submitted.length / r.scorerIds.length * 100) : 0;
  return (
    <div style={{ ...card, borderRadius: 28, maxWidth: 640, width: '100%', margin: '20px auto 0', padding: 40, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
      <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--success-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={28} color="var(--success)" />
      </div>
      <span style={{ ...display(34), lineHeight: 1.02, letterSpacing: '-.02em' }}>Scorecard in for {byId(room, r.performerId).name}</span>
      <span style={{ fontSize: 15, color: 'var(--text-body)' }}>You gave <strong>{scoreOf(mine)}%</strong>. Results appear here when {room.trainerName} ends the round — {r.submitted.length} of {r.scorerIds.length} scorecards are in.</span>
      <Progress pct={pct} style={{ width: '100%' }} />
    </div>
  );
}

function Waiting({ room, me }) {
  const r = room.round;
  const midRound = r?.status === 'live';
  const inRoom = room.trainees.filter(t => t.status === 'joined');
  return (
    <div style={{ ...card, borderRadius: 28, padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ ...eyebrow, color: 'var(--text-muted)' }}>You're in, {first(me.name)}</span>
        <span style={display(40)}>{midRound ? `Round ${r.n} is underway` : `Waiting for round ${room.rounds.length + 1}`}</span>
        <span style={{ fontSize: 15, color: 'var(--text-body)' }}>
          {midRound
            ? `You joined after ${byId(room, r.performerId).name}'s round started, so you'll score from the next round.`
            : `${room.trainerName} will pick who's on the call. If it's not you, your scorecard opens automatically.`}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {inRoom.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', borderRadius: 999, background: 'var(--soft-grey-p2)', opacity: t.online ? 1 : 0.55 }}>
            <Avatar t={t} size={30} font={11} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}{t.id === me.id ? ' (you)' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TraineeRoom({ code }) {
  const { room, you, status, toast, send, offset } = useRoom(code, 'trainee');
  const live = room?.round?.status === 'live';
  const now = useNow(live, offset);
  const me = room && you?.id ? room.trainees.find(t => t.id === you.id) : null;

  const header = (
    <Header title={room?.name || 'Role-play room'} code={room?.code} right={<>
      <ConnectionBadge status={status} />
      {me ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar t={me} size={32} font={12} /><span style={{ fontSize: 14, fontWeight: 600 }}>{me.name}</span></div> : null}
    </>} />
  );

  let body;
  if (status === 'no-room') body = <Notice title="This room isn't open" body="Check the link with your trainer — the room may have been closed or the code mistyped." />;
  else if (!room) body = <Notice icon="loader-circle" title="Connecting…" body="Opening the room." />;
  else if (!me && you?.removed) body = <Notice icon="door-closed" title="You were removed from the room" body={`Ask ${room.trainerName} if this was a mistake — you can rejoin with the link.`} action={<Button variant="secondary" onClick={() => location.reload()}>Rejoin</Button>} />;
  else if (!me) body = <Join room={room} send={send} />;
  else {
    const r = room.round;
    if (room.stage === 'final') body = <Leaderboard room={room} />;
    else if (live && r.performerId === me.id) body = <Performer room={room} now={now} />;
    else if (live && room.mySubmission) body = <Submitted room={room} mine={room.mySubmission} />;
    else if (live && r.scorerIds.includes(me.id)) body = <Scoring key={r.n} room={room} me={me} send={send} now={now} />;
    else if (r?.status === 'review') body = <RoundReport room={room} round={{ n: r.n, performerId: r.performerId, result: r.result }} actions={<Badge tone="soft" dot>Waiting for the next round</Badge>} />;
    else body = <Waiting room={room} me={me} />;
  }

  return (
    <>
      {header}
      <Page><Stack>{body}</Stack></Page>
      <Toast toast={toast} />
    </>
  );
}
