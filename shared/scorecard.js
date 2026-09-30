// ERT — Experience Recovery scorecard. Shared by the server (scoring) and the client (rendering).
// Weights sum to 100. crit: 'auto' = auto-fail attribute, 'crit' = critical (flagged, not auto-fail).

export const CATS = [
  { name: 'Opening script & self-introduction', w: 10 },
  { name: 'Active listening & feedback', w: 10 },
  { name: 'Empathy & emotional acknowledgment', w: 10 },
  { name: 'Experience recovery', w: 20 },
  { name: 'Ownership & retention', w: 25 },
  { name: 'Non-defensive communication', w: 15 },
  { name: 'Closing protocol', w: 10 },
];

const A = (id, c, e, t, w, crit, o, g) => ({ id, c, e, t, w, crit, o, g });

export const ATTRS = [
  A('a1', 0, 'Call opening tone', 'Opens the call with a clear, confident greeting (steady pace, no hesitation)', 2, 'auto',
    ['Speaks at a steady, unhurried pace', 'No stumbling, filler words, or long pauses', 'Tone conveys assurance, not uncertainty', 'Self introduction — mentions the company name', 'Uses the proper greeting message'],
    'Opening lines are delivered at a steady pace with no hesitation or mumbling, using the greeting script with a self introduction and the company name, Tamara.'),
  A('a2', 0, 'Identity verification', "Verifies the account holder's identity by name before discussing the case", 3, 'auto',
    ["States the customer's name directly", 'Confirms it matches the account before proceeding', 'Verification happens before any case detail is shared', 'Follows the ID verification process if account actions are needed'],
    'Addresses the customer by name and confirms they are the correct account holder before any case details are discussed.'),
  A('a3', 0, 'Consent / scheduling', "Asks whether it's a good time to talk and offers to reschedule if not", 2, null,
    ['Explicitly asks about availability', 'Offers a specific alternate time if declined', 'Does not proceed with case details if the customer says no'],
    "Checks for consent to continue and offers a specific alternative time if the customer can't talk now."),
  A('a4', 0, 'Case preparation', "References the customer's recent experience accurately", 3, 'auto',
    ['Has checked the case history', 'Details are accurate, not vague or generic', 'Customer is not asked to explain "what happened" from scratch'],
    'States specific, accurate details of the recent experience.'),
  A('a5', 1, 'Feedback solicitation', 'Asks the customer directly for feedback on the recent experience', 5, null,
    ['Uses an open-ended feedback question', 'Asked before moving to resolution', 'Not skipped or assumed'],
    "Explicitly invites the customer's opinion on how the previous experience went, rather than assuming satisfaction."),
  A('a6', 1, 'Active listening', 'Lets the customer fully express feedback without interrupting or rushing', 5, null,
    ["No interruptions during the customer's response", 'Natural pauses are respected', "Feedback isn't cut short to move on"],
    'Allows natural pauses, does not talk over the customer, and does not cut feedback short.'),
  A('a7', 2, 'Empathy — specificity & consistency', "Acknowledges the customer's specific emotion rather than using a generic scripted phrase", 10, null,
    ['Names the specific emotion or situation described', 'References something the customer actually said', 'Avoids repeating the same stock phrase', 'Empathy present at separate points in the call', 'Reappears during resolution / compensation', "Acknowledges the customer's situation"],
    'Empathy references what the customer described — not a generic "I understand" — and shows up during feedback, resolution and closing, not only at the start.'),
  A('a8', 3, 'Refund appropriateness', 'Offers compensation or refund when warranted, sized to the actual impact', 5, 'auto',
    ['Offer is made when the issue justifies it', 'Amount/type matches the severity of the impact', 'Not skipped when deserved; not excessive', 'Issues the refund when applicable'],
    'Compensation is offered when warranted and is proportionate to the issue — not withheld, not inflated. The refund action is taken when needed.'),
  A('a9', 3, 'Refund transparency', 'States the rationale for the compensation, tied to the specific issue and its impact', 10, null,
    ['Rationale is stated out loud', 'Ties directly to the specific issue', 'Not delivered as an unexplained number', 'Clear refund/compensation timeline (SLA)'],
    'States out loud why this refund or compensation was chosen, connects it to the issue, and gives the correct SLA.'),
  A('a10', 3, 'Authority / escalation', 'Stays within authorized compensation limits and escalates when needed', 5, 'crit',
    ["Offer stays within the agent's approval tier", 'Escalates when the right offer exceeds it', 'No unauthorized promises'],
    'Does not offer compensation beyond their approval limit without escalation or supervisor sign-off.'),
  A('a11', 4, 'Retention ownership', 'Actively works to retain the customer rather than treating the call as a simple close', 15, 'auto',
    ["Doesn't end the call immediately after resolution", 'Engages the customer about the ongoing relationship', 'Names a concrete reason to stay — not a generic "we value you"', "Reason is relevant to this customer's situation", 'Delivered before or during closing'],
    'Takes a specific action to keep the customer engaged and names a concrete reason to stay — new features, relationship history, an improvement made.'),
  A('a12', 4, 'Respect for customer perspective', "Responds politely to the customer's account without arguing or dismissing it", 10, null,
    ["Doesn't contradict the customer's version outright", 'No dismissive language ("that\'s not what happened")', "Acknowledges the customer's perspective even if records differ", 'Stays courteous when correcting a fact'],
    "Does not invalidate the customer's version of events, even where facts differ from internal records."),
  A('a13', 5, 'Composure under pressure', 'Stays composed and non-defensive when the customer criticizes the company', 10, null,
    ['Tone remains even, not raised', 'No argumentative pushback', 'Tone stays calm through to the close', 'No sarcasm or impatience', "Professional even if the customer doesn't warm up"],
    'Tone and word choice stay even and respectful to the end of the call, even if the customer stays negative.'),
  A('a14', 5, 'Language clarity', 'Uses clear, professional language free of jargon or slang', 5, null,
    ['No internal jargon or acronyms', 'No slang, filler words, or unprofessional phrasing', 'Consistently professional across the call', "Uses the customer's preferred language (EN/AR)"],
    'Word choice stays professional and easy to understand — no unexplained jargon, slang or filler.'),
  A('a15', 6, 'Documentation compliance', 'Logs the case accurately', 5, 'auto',
    ['Case comment reflects what was discussed', 'Compensation/resolution details recorded', 'Complete enough for another agent to pick up', 'Correct issue type and interaction type'],
    'Post-call documentation reflects everything discussed and agreed, with no gaps.'),
  A('a16', 6, 'Closing protocol', 'Ends the call following the required closing script', 5, null,
    ['Mentions the Tamara brand', 'Thanks the customer for their time and feedback', 'Thanks the customer for their patience'],
    'Uses the appropriate closing script.'),
];

export const CRED = { met: 1, part: 0.5, miss: 0 };

export const DEFAULT_SETTINGS = { partialCredit: false, zeroOnAutoFail: true, showRunningScore: true };

export const SCORECARD_LABEL = `ERT — Experience Recovery · ${CATS.length} categories · ${ATTRS.length} attributes`;

// Validates a scorer's answers against the scorecard and the room's rating scale.
export function validAnswers(answers, settings) {
  if (!answers || typeof answers !== 'object') return false;
  const allowed = settings.partialCredit ? ['met', 'part', 'miss'] : ['met', 'miss'];
  return ATTRS.every(a => allowed.includes(answers[a.id]));
}

export function scoreOf(answers) {
  return Math.round(ATTRS.reduce((t, a) => t + (answers[a.id] ? a.w * CRED[answers[a.id]] : 0), 0));
}

// subs: { [scorerId]: answers }. Returns the round result shown on the report.
export function computeRound(subs, settings) {
  const ids = Object.keys(subs);
  const n = ids.length;
  const mean = {};
  ATTRS.forEach(a => { mean[a.id] = n ? ids.reduce((t, i) => t + CRED[subs[i][a.id]], 0) / n : 0; });
  const raw = Math.round(ATTRS.reduce((t, a) => t + a.w * mean[a.id], 0));
  const af = ATTRS.filter(a => a.crit === 'auto' && n && mean[a.id] < 0.5);
  const final = af.length && settings.zeroOnAutoFail ? 0 : raw;
  const cats = CATS.map((c, ci) => {
    const e = ATTRS.filter(a => a.c === ci).reduce((t, a) => t + a.w * mean[a.id], 0);
    return { name: c.name, w: c.w, earned: Math.round(e * 10) / 10, pct: Math.round(e / c.w * 100) };
  });
  const scorers = ids.map(i => {
    const ans = subs[i];
    const align = Math.round(100 - ATTRS.reduce((t, a) => t + Math.abs(CRED[ans[a.id]] - mean[a.id]), 0) / ATTRS.length * 100);
    return { id: i, score: scoreOf(ans), align };
  });
  return { raw, final, af: af.map(a => a.e), mean, cats, scorers, n };
}
