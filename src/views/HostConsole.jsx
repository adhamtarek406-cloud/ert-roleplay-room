import { useState } from 'react';
import { Badge, Button, Icon } from '../ds/index.jsx';
import { useNow, useRoom } from '../useRoom.js';
import { Avatar, ConnectionBadge, Header, LiveDot, Notice, Page, Progress, Stack, Toast, byId, elapsedLabel, card, display, eyebrow, scoreColor } from '../ui.jsx';
import { Leaderboard, RoundReport } from './Results.jsx';

const roomLink = code => `${location.origin}/room/${code}`;

function Sidebar({ room, send, showToast }) {
  const [addName, setAddName] = useState('');
  const [copied, setCopied] = useState(false);
  const r = room.round;
  const live = r?.status === 'live';
  const performed = Object.fromEntries(room.rounds.map(x => [x.performerId, x.result.final]));
  const joined = room.trainees.filter(t => t.status === 'joined').length;

  async function copy() {
    try { await navigator.clipboard.writeText(roomLink(room.code)); } catch { /* insecure context */ }
    setCopied(true);
    showToast('Room link copied');
    setTimeout(() => setCopied(false), 2200);
  }
  function add() {
    if (!addName.trim()) return;
    send('addTrainee', { name: addName });
    setAddName('');
  }

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="link" size={18} color="var(--tamara-lavender)" />
          <span style={display(18, 600)}>Invite with a link</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px 6px 14px', borderRadius: 999, background: 'var(--soft-grey-p2)', boxShadow: 'var(--shadow-inset-hairline)' }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomLink(room.code)}</span>
          <Button size="sm" icon={copied ? 'check' : 'copy'} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
        <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)' }}>Anyone with the link lands in this room. Invited trainees switch to Joined when they open it and enter their name.</span>
      </div>

      <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={display(18, 600)}>Trainees</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{joined} of {room.trainees.length} in the room</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={addName} onChange={e => setAddName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} maxLength={60} placeholder="Add trainee by name"
            style={{ flex: 1, minWidth: 0, height: 42, padding: '0 16px', borderRadius: 999, border: '1px solid var(--border-default)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)', outline: 'none', background: '#fff' }} />
          <Button size="sm" variant="secondary" icon="user-plus" onClick={add} style={{ height: 42 }}>Add</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {room.trainees.length === 0 ? <span style={{ fontSize: 13, color: 'var(--text-muted)', paddingTop: 4 }}>No one yet. Share the link or add names to pre-invite.</span> : null}
          {room.trainees.map(t => {
            let label = t.status === 'joined' ? 'Joined' : 'Invited', tone = t.status === 'joined' ? 'success' : 'neutral';
            if (live && r.performerId === t.id) { label = 'On call'; tone = 'brand'; }
            else if (live && r.submitted.includes(t.id)) { label = 'Submitted'; tone = 'info'; }
            else if (live && r.scorerIds.includes(t.id)) { label = 'Scoring'; tone = 'soft'; }
            const sub = t.status !== 'joined' ? 'Link not opened'
              : !t.online ? 'Offline — reopening the link reconnects'
              : performed[t.id] != null ? 'Performed · ' + performed[t.id] + '%' : 'Not performed yet';
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
                <Avatar t={t} style={{ opacity: t.status === 'joined' && t.online ? 1 : 0.5 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</span>
                </div>
                <Badge size="sm" tone={tone} dot={t.status === 'joined'}>{label}</Badge>
                <button type="button" className="rr-remove" onClick={() => send('removeTrainee', { id: t.id })} title="Remove from room" aria-label={`Remove ${t.name}`}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function RoundHistory({ room, openRound, finish }) {
  if (!room.rounds.length) return null;
  return (
    <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={display(18, 600)}>Session so far</span>
      {room.rounds.map(x => (
        <button key={x.n} type="button" className="rr-history" onClick={() => openRound(x.n)}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', width: 54 }}>Round {x.n}</span>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{byId(room, x.performerId).name}</span>
          <span style={{ ...display(18), color: scoreColor(x.result.final) }}>{x.result.final}%</span>
        </button>
      ))}
      <Button variant="ghost" size="sm" icon="trophy" onClick={finish}>End session and show leaderboard</Button>
    </div>
  );
}

function PickPerformer({ room, send }) {
  const joined = room.trainees.filter(t => t.status === 'joined');
  const performed = Object.fromEntries(room.rounds.map(x => [x.performerId, x.result.final]));
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ ...eyebrow, color: 'var(--text-muted)' }}>Round {room.rounds.length + 1}</span>
        <h1 style={{ margin: 0, ...display(40) }}>Who's on the call?</h1>
        <span style={{ fontSize: 15, color: 'var(--text-body)' }}>Pick a trainee to start the round. Everyone else in the room gets the scorecard.</span>
      </div>
      {joined.length < 2 ? (
        <div style={{ background: '#fff', borderRadius: 20, border: '1.5px dashed var(--dreamy-lilac)', padding: 32, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <span style={display(20, 600)}>Waiting for trainees</span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>You need at least 2 people in the room — one to perform, one to score. Copy the link and share it.</span>
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16 }}>
        {joined.map(t => {
          const done = performed[t.id] != null;
          return (
            <div key={t.id} style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, animation: 'rr-in 240ms cubic-bezier(.16,1,.3,1) both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar t={t} size={48} font={16} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{done ? 'Performed · ' + performed[t.id] + '%' : t.online ? 'Not performed yet' : 'Offline'}</span>
                </div>
              </div>
              <Button size="sm" variant={done ? 'secondary' : 'primary'} icon="play" fullWidth disabled={joined.length < 2} onClick={() => send('startRound', { performerId: t.id })}>Start round</Button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function LiveRound({ room, send, now }) {
  const r = room.round;
  const perf = byId(room, r.performerId);
  const scorers = r.scorerIds.map(id => byId(room, id));
  const subCount = r.submitted.length;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const allIn = subCount === scorers.length;

  return (
    <>
      <div style={{ background: 'var(--tamara-lavender)', color: '#fff', borderRadius: 28, padding: 32, display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <Avatar t={perf} size={96} font={36} style={{ fontFamily: 'var(--font-display)', background: '#fff', color: 'var(--zingy-purple)' }} />
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LiveDot /><span style={eyebrow}>Round {r.n} · Live</span></div>
          <span style={{ ...display(40), letterSpacing: '-.02em' }}>{perf.name}</span>
          <span style={{ fontSize: 14, color: 'var(--light-lilac)' }}>You're playing the customer</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ ...display(48, 600), letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{elapsedLabel(r.start, now)}</span>
          <span style={{ fontSize: 12, color: 'var(--light-lilac)' }}>elapsed</span>
        </div>
      </div>
      <div style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={display(20, 600)}>Scorecards</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subCount} of {scorers.length} submitted · scores stay hidden until you reveal them</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" onClick={() => send('cancelRound')}>Cancel round</Button>
            {confirmEnd && !allIn ? (
              <Button size="sm" variant="danger" icon="eye" onClick={() => send('endRound')}>Reveal with {subCount} of {scorers.length}</Button>
            ) : (
              <Button size="sm" icon="eye" disabled={subCount === 0} onClick={() => (allIn ? send('endRound') : setConfirmEnd(true))}>End round and reveal</Button>
            )}
          </div>
        </div>
        <Progress pct={scorers.length ? Math.round(subCount / scorers.length * 100) : 0} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {scorers.map((t, i) => {
            const done = r.submitted.includes(r.scorerIds[i]);
            const color = done ? 'var(--success)' : 'var(--text-muted)';
            return (
              <div key={r.scorerIds[i]} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: done ? 'var(--success-surface)' : 'var(--soft-grey-p2)' }}>
                <Avatar t={t} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                  <span style={{ fontSize: 12, color }}>{done ? 'Submitted' : 'Scoring…'}</span>
                </div>
                <Icon name={done ? 'circle-check' : 'loader-circle'} size={18} color={color} style={done ? undefined : { animation: 'tamara-spin 1.6s linear infinite' }} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function HostConsole({ code, navigate }) {
  const { room, status, toast, showToast, send, offset } = useRoom(code, 'host');
  const [viewRound, setViewRound] = useState(null);
  const live = room?.round?.status === 'live';
  const now = useNow(live, offset);

  const header = (
    <Header title={room?.name || 'Role-play room'} code={room?.code} right={<>
      <ConnectionBadge status={status} />
      {room ? <Badge tone="soft">Trainer console · {room.trainerName}</Badge> : null}
    </>} />
  );

  if (status === 'no-room') return <>{header}<Page><Notice title="Room not found" body="This room doesn't exist or the server was reset." action={<Button onClick={() => navigate('/')}>Create a new room</Button>} /></Page></>;
  if (status === 'not-host') return <>{header}<Page><Notice icon="eye" title="This is the trainer console" body="Only the browser that created the room can run it. Trainees should use the room link instead." action={<Button variant="secondary" onClick={() => navigate(`/room/${code}`)}>Open the trainee view</Button>} /></Page></>;
  if (!room) return <>{header}<Page><Notice icon="loader-circle" title="Connecting…" body="Opening your room." /></Page></>;

  const r = room.round;
  const past = viewRound && room.rounds.find(x => x.n === viewRound);
  const reportRound = past || (r?.status === 'review' ? { n: r.n, performerId: r.performerId, result: r.result } : null);
  const finish = () => { setViewRound(null); send('finish'); };

  let body;
  if (room.stage === 'final') {
    body = <Leaderboard room={room} actions={
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => send('backToRoom')}>Back to room</Button>
        <Button variant="secondary" size="sm" icon="plus" onClick={() => send('newSession')}>New session</Button>
      </div>} />;
  } else if (reportRound && !(live && !past)) {
    body = <RoundReport room={room} round={reportRound} actions={
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {past ? <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => setViewRound(null)}>Back</Button> : null}
        <Button variant="secondary" size="sm" icon="trophy" onClick={finish}>End session</Button>
        {!live ? <Button size="sm" iconRight="arrow-right" onClick={() => { setViewRound(null); send('nextRound'); }}>Next round</Button> : null}
      </div>} />;
  } else if (live) {
    body = <LiveRound key={r.n} room={room} send={send} now={now} />;
  } else {
    body = <PickPerformer room={room} send={send} />;
  }

  return (
    <>
      {header}
      <Page>
        {room.stage === 'room' ? (
          <div style={{ flex: '1 1 280px', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Sidebar room={room} send={send} showToast={showToast} />
            <RoundHistory room={room} openRound={setViewRound} finish={finish} />
          </div>
        ) : null}
        <Stack>{body}</Stack>
      </Page>
      <Toast toast={toast} />
    </>
  );
}

