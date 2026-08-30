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

/** Where the layer writes. Minted by the browser, matched by the dev middleware. */
export const ANNOTATIONS_ROUTE = '__annotations';
