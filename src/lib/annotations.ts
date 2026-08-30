// The annotation store — see `_plans/spec-annotations.md`.
//
// A reader's note about the document, anchored to a model id rather than to
// anything on screen (D-ANN-2), living as one file per note under
// `<team-dir>/annotations/` (D-ANN-6). One file per note is what makes a write a
// create and a resolve an `rm`: two tabs never clobber each other, and a diff
// shows exactly what was said and what was consumed.
//
// This module is imported from both sides — the dev-server endpoint that writes
// and the CLI that reads — so it stays on `node:` and `yaml` alone. Nothing here
// touches Astro. What the browser needs too lives in `anchor.ts`, which is free
// of `node:` for that reason.
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { isAnchor } from './anchor.ts';

export interface Annotation {
  id: string;
  /** `kind:id` naming a node in the model — or bare `team`, the whole document. */
  anchor: string;
  created: string;
  note: string;
}

const ID = /^[a-z0-9]{6}$/;

export const annotationsDir = (teamDir: string) => join(resolve(teamDir), 'annotations');

const newId = () => randomBytes(3).toString('hex');

// Frontmatter carries the machine half, the body carries the sentence. A note is
// prose a person wrote, so it is not folded into a YAML string where a colon or
// a line break would have to be escaped to survive.
function serialize(a: Annotation) {
  const front = stringify({ id: a.id, anchor: a.anchor, created: a.created });
  return `---\n${front}---\n\n${a.note.trim()}\n`;
}

/** The note, or what is wrong with the file in the words a reader can act on. */
function parseFile(file: string, text: string): Annotation | string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return 'no frontmatter';
  let front: unknown;
  try {
    front = parse(m[1]);
  } catch (err) {
    return (err as Error).message.split('\n')[0];
  }
  const f = front as Partial<Annotation> | null;
  if (!f || typeof f !== 'object') return 'frontmatter is not a mapping';
  if (!isAnchor(f.anchor)) return `anchor "${f.anchor}" is not a model id`;
  return {
    id: typeof f.id === 'string' ? f.id : basename(file, '.md'),
    anchor: f.anchor,
    created: typeof f.created === 'string' ? f.created : '',
    note: m[2].trim(),
  };
}

export interface Store {
  annotations: Annotation[];
  /** Files under `annotations/` this module could not read as one. */
  problems: { file: string; problem: string }[];
}

// A missing folder is the normal state of a document nobody has annotated, not
// an error — every caller of this reads "no notes" from the same empty array.
export async function readAnnotations(teamDir: string): Promise<Store> {
  const dir = annotationsDir(teamDir);
  const names = await readdir(dir).catch(() => [] as string[]);
  const files = names.filter((n) => n.endsWith('.md')).map((n) => join(dir, n));
  const read = await Promise.all(files.map(async (file) => parseFile(file, await readFile(file, 'utf8'))));

  const annotations: Annotation[] = [];
  const problems: Store['problems'] = [];
  read.forEach((parsed, i) =>
    typeof parsed === 'string' ? problems.push({ file: files[i], problem: parsed }) : annotations.push(parsed)
  );

  annotations.sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  return { annotations, problems };
}

export async function writeAnnotation(teamDir: string, anchor: string, note: string): Promise<Annotation> {
  const dir = annotationsDir(teamDir);
  await mkdir(dir, { recursive: true });

  // `wx` is the collision check — the write fails rather than overwriting a note
  // somebody else is looking at, which a read-then-write cannot promise.
  for (;;) {
    const annotation: Annotation = { id: newId(), anchor, created: new Date().toISOString(), note: note.trim() };
    try {
      await writeFile(join(dir, `${annotation.id}.md`), serialize(annotation), { encoding: 'utf8', flag: 'wx' });
      return annotation;
    } catch (err) {
      if ((err as { code?: string }).code !== 'EEXIST') throw err;
    }
  }
}

// Editing rewrites the note and keeps everything else: the id a reader is
// looking at and the moment the note was first made are what make a second
// pass a correction rather than a second note.
export async function updateAnnotation(teamDir: string, id: string, note: string): Promise<Annotation | null> {
  if (!ID.test(id)) return null;
  const file = join(annotationsDir(teamDir), `${id}.md`);
  const text = await readFile(file, 'utf8').catch(() => null);
  if (text === null) return null;
  const parsed = parseFile(file, text);
  if (typeof parsed === 'string') return null;
  const annotation = { ...parsed, note: note.trim() };
  await writeFile(file, serialize(annotation), 'utf8');
  return annotation;
}

// Resolving is deleting (D-ANN-9): the document is the record, and a note whose
// change is already in the YAML is noise.
export async function resolveAnnotation(teamDir: string, id: string): Promise<boolean> {
  if (!ID.test(id)) return false;
  return unlink(join(annotationsDir(teamDir), `${id}.md`)).then(
    () => true,
    () => false
  );
}
