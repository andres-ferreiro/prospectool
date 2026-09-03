# Desktop layout: floating side drawers + Kanban CRM

## Goal

Add a desktop layout that is otherwise identical to the current mobile UI,
with exactly two differences:

1. Every bottom sheet becomes a floating side panel.
2. The CRM view becomes a Kanban board instead of a single filtered list.

Everything else (top bar, search bar, bottom nav, map controls, all
business logic, all API routes) stays unchanged.

## Breakpoint

`lg` (1024px width and up), checked via a `useIsDesktop()` hook
(`matchMedia('(min-width: 1024px)')`, SSR-safe default of `false`). This is
a pure width check, so it naturally covers desktop, landscape tablets, and
any portrait tablet wide enough — no orientation branching needed.

Below 1024px: no change to any existing component or behavior.

## Floating side drawers

Six call sites currently use the shared `Drawer`/`DrawerContent`
(`components/ui/drawer.tsx`, wrapping `@base-ui/react/drawer`, which
already supports `swipeDirection: 'left' | 'right' | 'up' | 'down'` and a
`--drawer-inset` CSS var for margin):

| Drawer | Component | Desktop side | Desktop modality |
|---|---|---|---|
| Results / business detail / lead CRM form | `results-drawer.tsx` | left | non-modal (unchanged) |
| Map settings | `map-settings-drawer.tsx` | right | modal (unchanged) |
| Advanced search | `advanced-search-drawer.tsx` | right | modal (unchanged) |
| Create project | `create-project-drawer.tsx` | right | modal (unchanged) |
| Edit project | `edit-project-drawer.tsx` | right | modal (unchanged) |
| Lead detail (CRM) | `lead-detail-modal.tsx` | right | modal (unchanged) |

Implementation:

- `components/ui/drawer.tsx`: `DrawerContent` gains a `floating?: boolean`
  prop. When true, it renders with margin on all sides (via the existing
  `--drawer-inset` CSS var), full rounding, and a shadow — a detached
  floating card — instead of the current edge-flush bottom-sheet styling.
  `modal`/`disablePointerDismissal`/`showSwipeHandle` behavior is
  unaffected; only positioning/sizing changes.
- Each of the 6 drawer components picks `swipeDirection` and `floating`
  from `useIsDesktop()`: `down`/`false` below 1024px (current behavior),
  `left` or `right` (per the table above) / `true` at 1024px+.
- The results drawer keeps its existing three height states
  (list / read-only detail / full CRM form) — on desktop these become
  width/height caps on the floating left panel instead of `dvh` sheet
  heights, but the same three-state logic (`results-drawer.tsx`'s
  `!selected` / `leadsByBusinessId.has(selected.id)` branching) is
  unchanged.
- No map viewport padding/recentering is added for the floating left
  panel — it overlays the map exactly like the current bottom sheet does.
  Top bar, search bar, bottom nav, and all map control buttons keep their
  current positions unchanged at every breakpoint.

## Kanban CRM board (desktop only)

New sibling to the existing list view — `crm-page.tsx` picks one or the
other via `useIsDesktop()`. Below 1024px, `crm-board.tsx` is untouched.

- `components/crm/kanban-board.tsx`: renders one `kanban-column.tsx` per
  entry in `STAGES` (`contacted, interested, negotiating, won, lost`),
  laid out in a horizontally-scrollable row. Owns the `leads` state and
  the search-query filter (filtering happens per column, not via a single
  active-stage filter like the mobile list).
- `components/crm/kanban-column.tsx`: column header (stage label + color
  dot from `STAGE_LABELS`/`STAGE_COLORS` + count), droppable zone
  (`@dnd-kit/core`'s `useDroppable`), renders its filtered leads as
  `kanban-card.tsx`.
- `components/crm/kanban-card.tsx`: draggable (`useDraggable`) card with
  the same visual content as the existing `lead-card.tsx` (name, address,
  stage dot). Click opens the lead detail panel (`lead-detail-modal.tsx`,
  now floating right per the drawer section); this is unrelated to and
  independent from dragging.
- Drag-and-drop: `@dnd-kit/core`'s `DndContext` wraps the board. On
  `onDragEnd`, if the card was dropped on a different column, call
  `PATCH /api/leads/{id}` with `{ stage: newStage }` (the same endpoint
  and payload shape `lead-detail-content.tsx` already uses for its stage
  dropdown), then update local `leads` state optimistically. No new API
  route needed.
- The stage dropdown inside the lead detail panel remains functional and
  unchanged — dragging and the dropdown are two paths to the same PATCH
  call, exactly as requested.

New dependency: `@dnd-kit/core` (no `@dnd-kit/sortable` needed — leads
don't need ordering within a column, just column membership).

## Out of scope

- Any change to mobile/tablet-under-1024px behavior.
- Reordering leads within a column.
- Moving/resizing the top bar, search bar, bottom nav, or map control
  buttons on desktop.
- Map viewport padding to avoid the floating left panel.
- Any new API routes — the existing `PATCH /api/leads/{id}` covers the
  Kanban drag case.
