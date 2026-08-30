// The reading position, said in the address bar — see `_plans/deep-links.md`.
//
// A coach pastes a link and the reader lands on the same activity, in the same
// view, under the same lens. Nothing here writes to the document: the URL carries
// UI state, never model state, so deep links sit inside the read-only site rule
// (D9) rather than beside it.
//
// Its own module because three surfaces read and write the same hash — the
// process document, the team drawer, and the export, which holds every document
// at once. Stated once, they cannot disagree about what a token means; stated
// three times, the export would answer a link the route does not.

/** The whole of what a URL can say about a reading. Absent key = the default. */
export interface UrlState {
  /** Export only: which document is showing. A route's path already says this. */
  doc?: string;
  /** `flow` | `grid` | `playbook`. */
  view?: string;
  /** A role id from the team catalog; empty is every role. */
  role?: string;
  /** A focus token — the drawer panel, in the grammar below. */
  open?: string;
}

// Two grammars meet here and neither leaks into the other. The drawer addresses
// its panels by `data-detail` — `tool:ci-workflows`, `__process`, a bare activity
// id — and a URL is a worse place for `:` and `__` than for a kebab word. The
// conversion is a table rather than a split on the first separator, because
// `open-slots-<slug>` is two words before the id and a split would read its
// first word as the kind.

/** `<kind>:<id>` panels, whose token is `<kind>-<id>`. */
const KINDS = ['tool', 'artifact', 'role', 'harness', 'event'] as const;

/** Panels with no id of their own. */
const SINGLETONS: Record<string, string> = {
  process: '__process',
  team: '__team',
  'open-slots': '__open',
};

const OPEN_SLOTS = 'open-slots-';

/** A focus token from the URL → the `data-detail` key a drawer answers to. */
export function tokenToKey(token: string): string | null {
  if (!token) return null;
  if (SINGLETONS[token]) return SINGLETONS[token];
  // Before the kind table: `open-slots-feature` names a process, not an `open`
  // kind, and the kind table has no `open` in it to catch the mistake.
  if (token.startsWith(OPEN_SLOTS)) return `open:${token.slice(OPEN_SLOTS.length)}`;
  for (const kind of KINDS) {
    if (token.startsWith(`${kind}-`)) return `${kind}:${token.slice(kind.length + 1)}`;
  }
  // An activity's panel is keyed by the bare id, so its token carries the prefix
  // the key does not — otherwise an activity called `role-lead` would address a
  // role. The prefix is what makes every other rule above unambiguous.
  if (token.startsWith('act-')) return token.slice(4);
  return null;
}

/** The way back: a panel key → the token that addresses it. */
export function keyToToken(key: string): string | null {
  if (!key) return null;
  for (const [token, k] of Object.entries(SINGLETONS)) if (k === key) return token;
  if (key.startsWith('open:')) return `${OPEN_SLOTS}${key.slice(5)}`;
  for (const kind of KINDS) {
    if (key.startsWith(`${kind}:`)) return `${kind}-${key.slice(kind.length + 1)}`;
  }
  return `act-${key}`;
}

const KEYS = ['doc', 'view', 'role', 'open'] as const;

// Our own writes must not read back as a reader's navigation. `replaceState`
// fires no `hashchange`, but the `file://` fallback below is a `location.replace`,
// which does — and re-applying the state we just wrote would fight whatever the
// click was in the middle of doing.
let lastWritten: string | null = null;

const currentHash = () => location.hash.slice(1);

/** What the address bar currently says. Missing and malformed keys are simply absent. */
export function readState(): UrlState {
  const raw = currentHash();
  if (!raw) return {};
  // Every link `useHref` has ever minted is a bare `#act-<id>` / `#tool-<id>`,
  // and a link that was pasted into a chat two months ago is exactly the reader
  // this feature is for. No `=` means the whole hash is the focus token.
  if (!raw.includes('=')) return { open: decodeURIComponent(raw) };
  const params = new URLSearchParams(raw);
  const state: UrlState = {};
  for (const key of KEYS) {
    const value = params.get(key);
    if (value) state[key] = value;
  }
  return state;
}

/**
 * State the reading in the address bar. Only the named keys are touched, so the
 * process document and the team drawer can each own their own without erasing
 * the other's — which is what the export, holding both at once, needs.
 *
 * An empty value removes its key: a default is said by silence, so returning to
 * FLOW or dropping the lens shortens the link rather than growing it.
 */
export function writeState(next: UrlState): void {
  // Built from `readState`, not from the raw hash, so a legacy `#act-<id>` is
  // normalised on the first write rather than being discarded by it — a reader
  // who arrived on an old link and then switched view would otherwise lose the
  // activity the link was about.
  const merged = { ...readState(), ...next };
  const params = new URLSearchParams();
  for (const key of KEYS) if (merged[key]) params.set(key, merged[key]!);
  const hash = params.toString();
  if (hash === currentHash()) return;
  lastWritten = hash;
  const url = hash ? `#${hash}` : location.pathname + location.search;
  try {
    // Not `pushState`: the objection this feature had to answer was that writing
    // the hash would fill the history with noise, and one entry per filter click
    // is exactly that. `replaceState` adds none, so Back still leaves the page.
    history.replaceState(null, '', url);
  } catch {
    // The export opens from `file://`, whose origin is opaque, and the history
    // API refuses a URL argument there. Assigning the location is not a history
    // API call and is not origin-checked; `replace` keeps the no-new-entry rule.
    location.replace(url);
  }
}

/** A reader's own navigation — Back, a pasted link, an edit in the address bar. */
export function onStateChange(fn: (state: UrlState) => void): void {
  window.addEventListener('hashchange', () => {
    if (currentHash() === lastWritten) return;
    lastWritten = null;
    fn(readState());
  });
}

/**
 * A key the document could not resolve. The address bar is the report: it stops
 * naming a state the page is not in, so a link pasted from another team's
 * document visibly shortens itself instead of failing behind the reader's back.
 * The console line is for the coach authoring the link, and is dev-only.
 */
export function dropState(key: keyof UrlState, value: string, why: string): void {
  if (import.meta.env.DEV) console.warn(`[ai-sdlc] ignoring ${key}=${value} — ${why}`);
  writeState({ [key]: '' });
}
