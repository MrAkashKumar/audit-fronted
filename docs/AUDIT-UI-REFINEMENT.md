# Audit UI Refinement

## Purpose

This document records the component-scoped design improvements applied to the Audit Viewer. The
changes preserve the existing dark, warm-charcoal, gold, orange, green, blue, and red visual
language while making the page denser, clearer, and more responsive to API-driven schemas.

No runtime sample data was introduced. The selected feature, columns, rows, history fields, counts,
and pagination continue to come from the two audit APIs.

## Updated control design

### Audit-feature search

- Uses a compact elevated surface with a dedicated search-icon tile.
- Uses a system-first enterprise font stack and consistent text rendering without adding a font
  package or remote asset.
- Keeps a subtle resting border and a stronger gold keyboard/focus ring.
- Keeps the feature count visible on larger screens and removes it on narrow mobile screens.
- Limits the option panel height and scrolls the list when the API returns many labels.
- A short label list uses only the height needed by its available rows.

### Filter controls

Field, Condition, and Value now use the same anatomy:

```text
 floating label
      ↓
┌──── Field ─────────────────┐
│ Select field             ▾ │
└────────────────────────────┘
```

- All controls share the same height, border radius, background, typography, and focus treatment.
- Field and Condition retain their controlled, keyboard-accessible listboxes.
- Value displays `Enter text, number, or date` until a value is entered.
- Boolean fields keep a select control with the same visual dimensions.
- Empty/not-empty operators display `No value required` in the same Value position.
- Added conditions retain independent AND/OR joins.
- Selecting a different Field starts that rule fresh by clearing its value and returning the
  operator to `Contains`; selecting the already active Field does not discard the current rule.

## Space optimization

- Reduced outer page padding and unused vertical space in the empty state.
- Reduced records-toolbar and filter-builder height while preserving comfortable interaction
  targets.
- Reduced the join column from a wide text region to a compact WHERE or AND/OR region.
- Consolidated repeated filter-control styling into shared selectors.
- The expanded-history tree branch and table start closer to the source record while remaining
  visually connected.

## Dynamic table sizing

The backend controls each schema. The UI does not assign a fixed width based on a known table.

```text
few response columns  → table grows to fill the records panel
many response columns → content keeps a readable intrinsic width
                      → records panel provides horizontal scrolling
wide audit history    → history uses its own horizontal scroll region
```

The main records table and nested history table use the same width strategy:

- `min-width: 100%` prevents a narrow schema from leaving an unfinished-looking empty region.
- `width: max-content` preserves readable cells when many dynamic columns arrive.
- The containing region handles horizontal overflow rather than compressing cell content.
- Main-record and audit-history overflow remain available as needed. Their slim, component-local
  warm-gray scrollbars appear on pointer hover or keyboard focus and do not reserve empty space at
  rest. Touch users can move the same regions with the native horizontal swipe gesture.
- The expanded-history tree keeps a compact indentation, and the final dynamic history column has
  explicit end padding so its content and the table boundary remain clear when fully scrolled.

## Responsive layout

| Viewport        | Search and actions               | Filter conditions                                                                | Dynamic tables                                |
| --------------- | -------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------- |
| Above 1100px    | Search and Refresh share one row | One compact row per condition                                                    | Fill available width; scroll only when needed |
| 761–1100px      | Search remains prominent         | Join occupies a compact first line; Field, Condition, Value remain aligned below | Horizontal scroll preserves readable columns  |
| 561–760px       | Search and Refresh stack         | Controls stack with Remove aligned beside the join                               | Touch-friendly horizontal scrolling           |
| 560px and below | Table-count badge is hidden      | Single-column controls use full available width                                  | History indentation is reduced                |

## Accessibility and interaction preservation

- Search remains a combobox with Arrow Up/Down, Enter, and Escape handling.
- Field and Condition remain listboxes with keyboard navigation and selected-state checkmarks.
- Floating labels remain visible after values are entered.
- Focus states use high-contrast gold and do not rely on color alone for selection.
- Table and history scroll regions preserve full data instead of hiding dynamic columns.
- Every main and audit-history data header shows a neutral sortable indicator and exposes its active
  ascending or descending state.

## Maintenance boundary

All new visual behavior is located in:

```text
src/app/features/audit/pages/audit-view/audit-view.component.css
```

`src/styles.css` is intentionally unchanged. The filter operator options are exposed as one readonly
collection and consumed directly by the template, removing a pass-through getter.

## Verification checklist

- [ ] Search options remain usable with one, three, and many API feature labels.
- [ ] A short schema fills the records panel.
- [ ] A wide schema exposes the records scrollbar.
- [ ] Expanded audit history exposes its independent scrollbar.
- [ ] The history scrollbar is hidden at rest, appears on hover/focus, and is absent when no overflow exists.
- [ ] Operation, Revision, and each dynamic history column sort independently.
- [ ] Field, Condition, and Value labels remain aligned.
- [ ] Field and Condition menus work with pointer and keyboard input.
- [ ] Every added rule can select its own AND or OR join.
- [ ] Tablet and mobile layouts do not overlap.
- [ ] Refresh returns to the choose-feature state.
- [ ] `src/styles.css` remains unchanged.
