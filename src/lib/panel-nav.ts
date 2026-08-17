// Both drawers are the same machine: one body holding every panel, addressed by
// `data-detail`, opened by anything carrying `data-detail-key`. A panel can name
// another entry, so the reading is browsable and needs the way back. Written once
// here, the trail exists in the process drawer and the team drawer alike rather
// than in whichever one it was added to last.

/** What a step deeper leaves behind, handed back when BACK returns to that panel. */
export interface PanelState {
  /** The control that was clicked to leave — where the reader's eye was. */
  invoker?: HTMLElement | null;
  /** Whatever else the component wants restored; `onBack` is what reads it. */
  restore?: () => void;
}

export interface PanelNav {
  /**
   * Switch panels. `push` records the panel being left, so BACK returns to it —
   * with `state`, it returns to the reading position inside it as well.
   */
  show(key: string, push?: boolean, state?: PanelState): boolean;
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
  /** Where focus goes after a back step that reached the first panel, since BACK is gone by then. */
  close?: HTMLElement | null;
  /**
   * Runs after a back step, holding the state recorded when that panel was left.
   * BACK is an undo, so a component that changed anything outside the drawer body
   * puts the way back to it here rather than leaving the page one step ahead.
   * Focus is not this callback's job — the trail already moves it.
   */
  onBack?: (state: PanelState | null) => void;
}

export function panelNav(root: ParentNode, options: PanelNavOptions = {}): PanelNav {
  const { title, back, close, onBack } = options;
  const panels = new Map<string, HTMLElement>();
  for (const p of root.querySelectorAll<HTMLElement>('[data-detail]')) {
    if (p.dataset.detail) panels.set(p.dataset.detail, p);
  }
  const fallbackTitle = title?.textContent ?? '';
  const trail: { key: string; state: PanelState | null }[] = [];
  let current: string | null = null;

  const sync = () => {
    if (back) back.hidden = trail.length === 0;
  };

  const show = (key: string, push = false, state: PanelState | null = null) => {
    const next = panels.get(key);
    if (!next) return false;
    if (push) {
      if (current && current !== key) trail.push({ key: current, state });
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
    const entry = trail.pop();
    if (!entry) return false;
    const ok = panels.has(entry.key);
    if (ok) {
      // `show` would clear the trail, and pushing the panel being left would put
      // the reader in a loop between two panels. Move without touching the trail.
      panels.get(current!)!.hidden = true;
      panels.get(entry.key)!.hidden = false;
      current = entry.key;
      if (title) title.textContent = panels.get(entry.key)!.dataset.title ?? fallbackTitle;
    }
    sync();
    // The reader returns to the name they clicked, so a keyboard reading resumes
    // where it stopped. The last step back takes BACK away with it, so focus falls
    // to the way out rather than to a control that is no longer there.
    (entry.state?.invoker ?? (trail.length === 0 ? close : back))?.focus();
    onBack?.(entry.state);
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
