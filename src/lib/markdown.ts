// Descriptions are authored as markdown in YAML, so the page needs a renderer
// rather than the paragraph-splitting the drawer used to do by hand. This is
// Astro's own processor — the same one the content collections use — so the
// output matches the rest of the site and no new dependency enters the tree.
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import type { TeamDoc } from './derive';

const processor = await createMarkdownProcessor({ gfm: true, smartypants: false });

/** Render one authored block to HTML. Content is the team's own document, so it
    is trusted the same way the YAML around it is. */
export async function md(text: string): Promise<string> {
  const { code } = await processor.render(text.trim());
  return code;
}

/** Render many blocks at once, keyed by whatever the caller looks them up by. */
export async function mdMap(entries: Array<[string, string | undefined]>): Promise<Map<string, string>> {
  const rendered = await Promise.all(
    entries.filter((e): e is [string, string] => Boolean(e[1])).map(async ([k, v]) => [k, await md(v)] as const)
  );
  return new Map(rendered);
}

/** Fold one authored YAML block into paragraphs. The blocks keep the soft wraps
    the literal style preserved, and the only piece of markdown this prose
    actually uses is the paragraph break — so the panels that render `usage`,
    `need` and `note` split on it rather than reaching for the processor above.
    One home, because three panels folding prose three ways is three answers to
    what a blank line means. */
export const paragraphs = (text: string) =>
  text.trim().split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' '));

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
