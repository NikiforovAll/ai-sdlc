// Both drawers are the same machine: one body holding every panel, addressed by
// `data-detail`, opened by anything carrying `data-detail-key`. A panel can name
// another entry, so the reading is browsable and needs the way back. Written once
// here, the trail exists in the process drawer and the team drawer alike rather
// than in whichever one it was added to last.

export interface PanelNav {
  /** Switch panels. `push` records the panel being left, so BACK returns to it. */
  show(key: string, push?: boolean): boolean;
  /** Step back one panel. Returns false when the trail is empty. */
  back(): boolean;
  /** Start a fresh reading — an entry opened from the page is not a step deeper. */
  clear(): void;
  has(key: string): boolean;
  current(): string | null;
  depth(): number;
}

export interface PanelNavOptions {
  /** Shows the panel's own `data-title`; falls back to the element's initial text. */
  title?: HTMLElement | null;
  /** Hidden while the trail is empty, so BACK only appears once it leads somewhere. */
  back?: HTMLElement | null;
  /** Runs after a back step, for the focus the component wants to leave behind. */
  onBack?: () => void;
}

export function panelNav(root: ParentNode, options: PanelNavOptions = {}): PanelNav {
  const { title, back, onBack } = options;
  const panels = new Map<string, HTMLElement>();
  for (const p of root.querySelectorAll<HTMLElement>('[data-detail]')) {
    if (p.dataset.detail) panels.set(p.dataset.detail, p);
  }
  const fallbackTitle = title?.textContent ?? '';
  const trail: string[] = [];
  let current: string | null = null;

  const sync = () => {
    if (back) back.hidden = trail.length === 0;
  };

  const show = (key: string, push = false) => {
    const next = panels.get(key);
    if (!next) return false;
    if (push) {
      if (current && current !== key) trail.push(current);
    } else {
      trail.length = 0;
    }
    // The first call is the only one that has to hide the whole set; after that
    // exactly one panel is up, so the switch touches two elements.
    if (current === null) {
      for (const p of panels.values()) p.hidden = p !== next;
    } else if (current !== key) {
      panels.get(current)!.hidden = true;
      next.hidden = false;
    }
    current = key;
    if (title) title.textContent = next.dataset.title ?? fallbackTitle;
    sync();
    return true;
  };

  const stepBack = () => {
    const prev = trail.pop();
    if (!prev) return false;
    const ok = panels.has(prev);
    if (ok) {
      // `show` would clear the trail, and pushing the panel being left would put
      // the reader in a loop between two panels. Move without touching the trail.
      panels.get(current!)!.hidden = true;
      panels.get(prev)!.hidden = false;
      current = prev;
      if (title) title.textContent = panels.get(prev)!.dataset.title ?? fallbackTitle;
    }
    sync();
    onBack?.();
    return ok;
  };

  back?.addEventListener('click', stepBack);
  sync();

  return {
    show,
    back: stepBack,
    clear: () => {
      trail.length = 0;
      sync();
    },
    has: (key: string) => panels.has(key),
    current: () => current,
    depth: () => trail.length,
  };
}
