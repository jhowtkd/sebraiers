# SEBRAEIERS ENGAJAR Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `PostCard` footer (time + small "via {network} ↗" link) with a large full-width **ENGAJAR** CTA button that opens `post.original_url` in a new tab, plus a smaller meta line below showing time and network.

**Architecture:** Single-file JSX change in `components/posts/post-card.tsx`. No data model, query, RLS, or other-page changes. Reuses the existing `<Button>` primitive (variant `primary` = `bg-brand-azul`). The external `<a target="_blank">` wraps the button. Remove the `ExternalLink` lucide import (no longer used).

**Tech Stack:** Next.js 14.2 (App Router), TypeScript 5.6, Tailwind 3.4, lucide-react (cleaned up).

## Global Constraints

Copied verbatim from spec `2026-06-21-sebraeiers-engajar-button-design.md`:

- **CTA text:** literal "ENGAJAR" (uppercase).
- **Visual:** full-width pill (`rounded-full`), `bg-brand-azul`, white text, generous padding (`size="lg"` on Button = h-12).
- **Click target:** opens `post.original_url` in new tab (`<a target="_blank" rel="noopener noreferrer">`).
- **No icon** on the button (text + bold + uppercase is enough).
- **Meta line below:** time + `via {Network}` in `text-caption text-text-muted text-center`.
- **Header, action bar, caption, cover:** unchanged.
- **Post detail page, /meu-desempenho, /ranking, /admin, auth:** unchanged.
- **No new emojis, no new components, no new dependencies.**
- **i18n:** pt-BR (button text is pt-BR per spec).
- **Tests:** no new tests (visual refactor of a presentational component; verified by build).
- **Lint/typecheck** pass after the task.

## File Structure (target)

```
components/
  posts/
    post-card.tsx               # MODIFY (imports + footer)
docs/superpowers/
  specs/2026-06-21-sebraeiers-engajar-button-design.md  (exists, approved)
  plans/2026-06-21-sebraeiers-engajar-button-implementation.md  # THIS FILE
```

---

## Task 1: Replace PostCard footer with ENGAJAR CTA

**Files:**
- Modify: `components/posts/post-card.tsx` (update imports + replace footer JSX)

**Interfaces:**
- Consumes: existing `Post` type (with `author?`), `formatRelative`, `NETWORK_LABELS`, `Button` from `@/components/ui/button`
- Produces: `PostCard` with new footer that has a large ENGAJAR button + smaller meta line

- [ ] **Step 1: Update imports in `components/posts/post-card.tsx`**

Open the file. Find the imports block (it currently imports `ExternalLink` from `lucide-react`). Replace the lucide-react import line and add the Button import.

**Current** (the first 2 import lines):
```tsx
import { MessageCircle, ExternalLink } from 'lucide-react';
```

**Replace with:**
```tsx
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
```

(`ExternalLink` is no longer used. `Button` is added from the existing primitive.)

- [ ] **Step 2: Replace the footer JSX**

Find the `<footer>` block in the JSX (it's the last block in the component, after the caption). It currently looks like:

```tsx
      {/* footer */}
      <footer className="px-3 pb-3 flex items-center justify-between text-caption text-text-muted">
        <time dateTime={post.published_at}>{time}</time>
        <a
          href={post.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-brand-azul"
        >
          via {networkLabel} <ExternalLink className="h-3 w-3" />
        </a>
      </footer>
```

**Replace with:**
```tsx
      {/* footer */}
      <footer className="px-3 pb-3 space-y-2">
        <a
          href={post.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          aria-label={`Engajar na publicação (${networkLabel})`}
        >
          <Button className="w-full" size="lg">
            ENGAJAR
          </Button>
        </a>
        <p className="text-caption text-text-muted text-center">
          {time} · via {networkLabel}
        </p>
      </footer>
```

(Removed: `flex items-center justify-between` layout, `<time>` and `<a>` with ExternalLink. Added: `<Button>` wrapped in `<a>`, meta `<p>` line below.)

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint
```

Expected: clean.

- [ ] **Step 4: Manual visual check (optional, dev server is running)**

Open `http://localhost:3000/timeline` in the browser (after logging in). Confirm:
- Each post card has a large blue "ENGAJAR" button in the footer
- Button is full-width pill style
- Time + "via {Network}" appears in smaller text below
- Clicking the button opens the original post URL in a new tab

- [ ] **Step 5: Final verification + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add components/posts/post-card.tsx
git commit -m "feat(feed): add ENGAJAR CTA button to PostCard footer (links to original post)"
```

Expected: all clean. 42+ tests passing. 15 routes built.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §1 resumo (substitui footer por CTA) | Task 1 step 2 |
| §3 mudanças (PostCard footer, imports) | Task 1 steps 1-2 |
| §4 layout do footer (CTA + meta) | Task 1 step 2 |
| §5 estrutura HTML | Task 1 step 2 |
| §6 mudanças específicas (código) | Task 1 step 2 |
| §7 estados (hover, focus — herdados do Button) | Covered by Button primitive |
| §8 YAGNI | Respected (no scope creep) |
| §9 critérios de sucesso | Step 4 manual check + step 5 build |

**Placeholder scan:** No "TBD", "TODO", "later", "similar to", "fill in". All steps have concrete code.

**Type consistency:**
- `Button` import matches the existing primitive at `components/ui/button.tsx` (has `size="lg"`, accepts `className`).
- `<a target="_blank" rel="noopener noreferrer">` pattern is the same as the rest of the file (and matches what was removed).
- `aria-label` added per accessibility best practice (external link opening in new tab).

**Potential issues for implementer to watch:**
- If the file currently uses `MessageCircle` and `ExternalLink` only, the lucide-react import line is exactly as shown. If other icons were added in later commits, the implementer should only remove `ExternalLink` (not the whole line).
- The `<Button>` is server-renderable (it's a plain `<button>` with no client interactivity). Wrapping it in `<a target="_blank">` is fine — the anchor's natural behavior takes over for the click.
- The class `block` on the `<a>` ensures the anchor takes full width (otherwise inline anchors don't fill their container's width, which would shrink the button's click target).
