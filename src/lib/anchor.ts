// What an annotation is allowed to point at — see `_plans/spec-annotations.md`.
//
// Its own module, free of `node:`, because both ends of the write path need it:
// the browser mints an anchor and the dev-server endpoint accepts or rejects
// one. Stated in one place, they cannot drift into a client that writes an
// anchor the server answers 400 to.
//
// `team` is the only kind that stands alone: one team renders per run, so there
// is nothing to disambiguate it from.
export const ANCHOR_KINDS = [
  'activity',
  'artifact',
  'event',
  'harness',
  'process',
  'role',
  'tool',
] as const;

/** Ids are kebab-case. The source of the rule `schema.ts` enforces on the YAML. */
export const ID_PATTERN = '[a-z0-9][a-z0-9-]*';

const ANCHOR = new RegExp(`^(team|(${ANCHOR_KINDS.join('|')}):${ID_PATTERN})$`);

export const isAnchor = (s: unknown): s is string => typeof s === 'string' && ANCHOR.test(s);

/** A note is a sentence about one node, not a document. Held by the textarea and the endpoint alike. */
export const MAX_NOTE = 4000;

// The document is nested, so a node alone is not where the reader was looking:
// a tool is drawn under every activity that fills with it, and `tool:ci-workflows`
// read out of an inbox does not say which one was on screen. The context is the
// rest of that answer — the anchors above the one chosen, outermost first.
//
// It is context, not address: the anchor is still the record (D-ANN-2), and a
// note survives an edit that moves the node whether or not the chain still holds.

/** Document → … → the link above the anchor. Bounded so a deep figure cannot grow the file. */
export const MAX_CONTEXT = 6;

// One normaliser, not a guard, and not one per door. Every way a chain can
// arrive — minted by the browser, posted to the endpoint, read back out of a
// hand-edited file — is cleaned by this, so the cap cuts the same end and a bad
// crumb costs the same thing everywhere. A predicate would make the endpoint
// reject what the parser repairs, which is how a note posted from a deep figure
// comes back with a chain it did not write.
//
// It cuts from the front: over the cap, the document a note came from is the
// crumb a reader can most easily do without, and the innermost links are the
// ones carrying what the field exists for.
export const toContext = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).filter(isAnchor).slice(-MAX_CONTEXT);

/** A chain, said the short way: the kind is spelled out by whatever heads the list. */
export const crumbOf = (anchor: string) =>
  anchor === 'team' ? 'document' : anchor.slice(anchor.indexOf(':') + 1);

export const chainText = (anchors: string[]) => anchors.map(crumbOf).join(' → ');

/** Where the layer writes. Minted by the browser, matched by the dev middleware. */
export const ANNOTATIONS_ROUTE = '__annotations';
