// Round report and final leaderboard — rendered for both the trainer and trainees.
import { Badge, Icon } from '../ds/index.jsx';
import { ATTRS, CATS } from '../../shared/scorecard.js';
import { Avatar, byId, card, display, eyebrow, scoreColor } from '../ui.jsx';

const panel = { ...card, borderRadius: 24, padding: 24 };

export function RoundReport({ room, round, actions }) {
  const R = round.result;
  const perf = byId(room, round.performerId);
  const hasAF = R.af.length > 0;
  const zeroed = hasAF && room.settings.zeroOnAutoFail;
  const scorers = R.scorers.map(s => ({ ...s, t: byId(room, s.id) })).sort((a, b) => b.align - a.align);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...eyebrow, color: 'var(--text-muted)' }}>Round {round.n} results</span>
          <span style={display(40)}>{perf.name}</span>
        </div>
        {actions}
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 260px', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 10, background: zeroed ? 'var(--danger-surface)' : 'var(--tamara-lavender)', color: zeroed ? 'var(--danger)' : '#fff' }}>
          <span style={eyebrow}>Final score</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 96, lineHeight: 0.9, letterSpacing: '-.04em' }}>{R.final}%</span>
          <span style={{ fontSize: 14 }}>{R.n ? `Average of ${R.n} peer scorecard${R.n > 1 ? 's' : ''}` : 'No scorecards submitted'}</span>
          {hasAF ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, padding: '12px 14px', borderRadius: 14, background: '#fff', color: 'var(--danger)' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Auto-fail triggered</span>
              {R.af.map(f => <span key={f} style={{ fontSize: 13 }}>{f}</span>)}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quality score before auto-fail: {R.raw}%</span>
            </div>
          ) : null}
        </div>
        <div style={{ ...panel, flex: '2 1 380px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={display(20, 600)}>By category</span>
          {R.cats.map(c => (
            <div key={c.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 72px', gap: '6px 12px', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
              <span style={{ fontSize: 13, textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{c.earned} / {c.w}</span>
              <div style={{ gridColumn: '1 / -1', height: 8, borderRadius: 99, background: 'var(--soft-grey-p1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, width: c.pct + '%', background: scoreColor(c.pct) }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ ...panel, flex: '2 1 420px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...display(20, 600), marginBottom: 10 }}>Attribute breakdown</span>
          {ATTRS.map(a => {
            const m = R.mean[a.id];
            const [label, tone] = m >= 0.75 ? ['Met', 'success'] : m >= 0.5 ? ['Mostly', 'warning'] : ['Not met', 'danger'];
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.4, color: 'var(--text-body)' }}>
                  {a.e}{a.crit === 'auto' ? <span style={{ color: 'var(--danger)', fontWeight: 700 }}>  ·  auto-fail</span> : null}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{Math.round(m * 100)}% credit</span>
                <Badge size="sm" tone={tone}>{label}</Badge>
              </div>
            );
          })}
        </div>
        <div style={{ ...panel, flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={display(20, 600)}>Peer scores</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Alignment = how close each scorer was to the room's average</span>
          {scorers.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border-subtle)' }}>
              <Avatar t={s.t} size={30} font={11} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{s.t.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.align}% aligned</span>
              <span style={{ ...display(17), width: 48, textAlign: 'right' }}>{s.score}%</span>
            </div>
          ))}
          {R.n === 0 ? <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No scorecards were submitted.</span> : null}
        </div>
      </div>
    </>
  );
}

const PODIUM = [['var(--tamara-lavender)', '#fff', 300, 'trophy'], ['var(--light-lilac)', 'var(--zingy-purple)', 270, 'medal'], ['#fff', 'var(--text-primary)', 250, 'award']];

export function Leaderboard({ room, actions }) {
  const byP = {};
  room.rounds.forEach(x => { (byP[x.performerId] = byP[x.performerId] || []).push(x); });
  const board = Object.keys(byP).map(id => {
    const rs = byP[id];
    const score = Math.round(rs.reduce((a, x) => a + x.result.final, 0) / rs.length);
    const catP = CATS.map((c, i) => rs.reduce((a, x) => a + x.result.cats[i].pct, 0) / rs.length);
    return {
      id, t: byId(room, id), score, color: scoreColor(score),
      best: CATS[catP.indexOf(Math.max(...catP))].name, worst: CATS[catP.indexOf(Math.min(...catP))].name,
      hasAF: rs.some(x => x.result.af.length),
    };
  }).sort((a, b) => b.score - a.score);

  const al = {};
  room.rounds.forEach(x => x.result.scorers.forEach(sc => { (al[sc.id] = al[sc.id] || []).push(sc.align); }));
  const eyes = Object.keys(al)
    .map(id => ({ id, t: byId(room, id), align: Math.round(al[id].reduce((a, b) => a + b, 0) / al[id].length) }))
    .sort((a, b) => b.align - a.align).slice(0, 6);
  const roomAvg = room.rounds.length ? Math.round(room.rounds.reduce((a, x) => a + x.result.final, 0) / room.rounds.length) : 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...eyebrow, color: 'var(--text-muted)' }}>Session report · {room.rounds.length} rounds · room average {roomAvg}%</span>
          <span style={display(48)}>Leaderboard</span>
        </div>
        {actions}
      </div>

      {board.length === 0 ? (
        <div style={{ ...panel, padding: 32, fontSize: 15, color: 'var(--text-muted)' }}>No rounds finished yet. Nothing to rank — run a round first.</div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, alignItems: 'end' }}>
        {board.slice(0, 3).map((b, i) => {
          const [bg, fg, h, icon] = PODIUM[i];
          return (
            <div key={b.id} style={{ borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 12, background: bg, color: fg, minHeight: h, justifyContent: 'flex-end', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={display(20)}>#{i + 1}</span>
                <Icon name={icon} size={22} />
              </div>
              <Avatar t={b.t} size={56} font={18} style={{ background: '#fff', color: 'var(--zingy-purple)' }} />
              <span style={{ ...display(22, 600), lineHeight: 1.1 }}>{b.t.name}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 56, lineHeight: 0.9, letterSpacing: '-.03em' }}>{b.score}%</span>
              <span style={{ fontSize: 13 }}>Strongest: {b.best}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ ...panel, flex: '2 1 460px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...display(20, 600), marginBottom: 10 }}>All performers</span>
          {board.map((b, i) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
              <span style={{ ...display(18), width: 28, color: 'var(--text-muted)' }}>{i + 1}</span>
              <Avatar t={b.t} />
              <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{b.t.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Work on: {b.worst}</span>
              </div>
              {b.hasAF ? <Badge size="sm" tone="danger">Auto-fail</Badge> : null}
              <div style={{ width: 120, height: 8, borderRadius: 99, background: 'var(--soft-grey-p1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, width: b.score + '%', background: b.color }} />
              </div>
              <span style={{ ...display(20), width: 56, textAlign: 'right' }}>{b.score}%</span>
            </div>
          ))}
        </div>
        <div style={{ flex: '1 1 280px', background: 'var(--surface-brand-softer)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="scan-eye" size={20} color="var(--tamara-lavender)" />
            <span style={display(20, 600)}>Sharpest scorers</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-body)', marginBottom: 8 }}>Average alignment with the room across every round they scored</span>
          {eyes.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--light-lilac)' }}>
              <span style={{ fontWeight: 700, fontSize: 13, width: 18, color: 'var(--zingy-purple)' }}>{i + 1}</span>
              <Avatar t={s.t} size={30} font={11} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{s.t.name}</span>
              <span style={{ ...display(17), color: 'var(--zingy-purple)' }}>{s.align}%</span>
            </div>
          ))}
          {eyes.length === 0 ? <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nobody has scored a round yet.</span> : null}
        </div>
      </div>
    </>
  );
}
