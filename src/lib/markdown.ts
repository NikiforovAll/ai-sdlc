// Descriptions are authored as markdown in YAML, so the page needs a renderer
// rather than the paragraph-splitting the drawer used to do by hand. This is
// Astro's own processor — the same one the content collections use — so the
// output matches the rest of the site and no new dependency enters the tree.
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import type { TeamDoc } from './derive';

const processor = await createMarkdownProcessor({ gfm: true, smartypants: false });

/** Render one authored block to HTML. Content is the team's own document, so it
    is trusted the same way the YAML around it is.

    The processor slugs every heading into an `id`, which is right for a page and
    wrong here: a description is rendered into a drawer on every page that draws
    the catalog, so two roles with an `### Owns` heading collide the moment the
    export concatenates the routes into one file. Nothing links to a heading
    inside a drawer, so the id is dropped rather than made unique. */
export async function md(text: string): Promise<string> {
  const { code } = await processor.render(text.trim());
  return code.replace(/(<h[1-6])\s+id="[^"]*"/g, '$1');
}

/** Render many blocks at once, keyed by whatever the caller looks them up by. */
export async function mdMap(entries: Array<[string, string | undefined]>): Promise<Map<string, string>> {
  const rendered = await Promise.all(
    entries.filter((e): e is [string, string] => Boolean(e[1])).map(async ([k, v]) => [k, await md(v)] as const)
  );
  return new Map(rendered);
}

/** Every authored block a panel renders inline — `why`, `usage`, `need` —
    rendered through the same processor the descriptions use and keyed by the
    block's own text. Splitting on the blank line by hand answered the paragraph
    break and nothing else, so a backtick or a list authored in YAML reached the
    page as literal characters. The text is its own key because two blocks with
    the same words render the same HTML, which saves every panel inventing an id
    to look its own prose up by. */
export function proseBlocks(texts: Array<string | undefined>): Promise<Map<string, string>> {
  const seen = [...new Set(texts.filter((t): t is string => Boolean(t)))];
  return mdMap(seen.map((t) => [t, t]));
}

/** Every catalog description the drawers read, keyed the way the panels are.
    Which catalogs carry authored prose is a fact about the model, so it is
    answered once here rather than by each drawer's frontmatter. */
export function catalogDescriptions(team: TeamDoc): Promise<Map<string, string>> {
  const entries: Array<[string, string | undefined]> = [];
  const add = (kind: string, list: { id: string; description?: string }[]) => {
    for (const e of list) entries.push([`${kind}:${e.id}`, e.description]);
  };
  add('artifact', team.artifacts);
  add('role', team.roles);
  add('harness', team.harnesses);
  add('event', team.events);
  add('tool', team.tools);
  return mdMap(entries);
}
