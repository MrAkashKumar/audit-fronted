# Audit View CSS Optimization PRD

## Document status

- Status: Final safe optimization implemented and verified on 2026-09-24
- Implemented scope: proven redundancies, static utilities, and literal Tailwind state variants
- Primary feature: `src/app/features/audit/pages/audit-view`
- Visual references: `IMG_8727.HEIC`, `IMG_8728.HEIC`, and `IMG_8724.heic`

## 1. Purpose

Reduce duplication and improve the maintainability of `audit-view.component.css` by using the
project's existing Tailwind utilities where they are an exact, low-risk replacement. The work must
preserve the current audit-view design, responsive layout, interactions, accessibility, and API-driven
behavior exactly.

The objective is clearer style ownership and less redundant component CSS. A smaller line count is a
useful measurement, but it is not more important than readability or regression safety. The objective
is not to eliminate component CSS.

## 2. Current baseline

| Area                       | Verified state                                                     |
| -------------------------- | ------------------------------------------------------------------ |
| Global stylesheet          | `src/styles.css`, 28 lines                                         |
| Global stylesheet SHA-256  | `e3aba3e0004fe1180f31b809cbb4c1ddac1ac792e8692779d5cd9b436c19b47e` |
| Package manifest SHA-256   | `bfea8a912daad46730eef07942f1bbd0a36f2ca9995be5a0a98b4f31066c4e2a` |
| Audit component stylesheet | `audit-view.component.css`, 963 lines                              |
| Audit component template   | `audit-view.component.html`, 1,262 lines                           |
| Tailwind                   | Installed and active through `@import 'tailwindcss'` and PostCSS   |
| Angular Material           | Not installed and not imported in the current project              |
| Component style budget     | 19 kB warning and 22 kB error                                      |

The supplied screenshots agree with the checked-in `styles.css` and `package.json`. Although Angular
Material was mentioned in the request, `@angular/material` is not present in the supplied/current
manifest and `npm ls @angular/material` returns no installed package. This optimization must therefore
use Angular, Tailwind, and the dependencies that are already present; it must not introduce Material.

## 3. Non-negotiable constraints

1. `src/styles.css` must remain byte-for-byte unchanged.
2. `package.json` must remain byte-for-byte unchanged.
3. No package may be installed, removed, upgraded, or downgraded.
4. The package lock must not change as a side effect of this work.
5. No design, spacing, color, typography, alignment, border, shadow, animation, or responsive behavior
   may change.
6. No audit functionality, API integration, filtering, sorting, pagination, expansion, approval-column
   behavior, highlighting, or scrolling behavior may change.
7. Existing accessibility semantics, keyboard behavior, focus visibility, ARIA state, and reduced-motion
   behavior must remain unchanged.
8. Existing semantic class names used by Angular bindings, tests, or runtime state must remain available,
   even when their static styling moves to Tailwind utilities.
9. Tailwind arbitrary values must reproduce the existing CSS values exactly. Similar palette or spacing
   tokens are not acceptable substitutes.
10. Tailwind classes must be literal in the template. Runtime-generated Tailwind class names are not
    allowed because they may not be included in the production output.

## 4. Implemented scope

- Remove declarations that are demonstrably redundant with Tailwind Preflight or an existing literal
  utility already present on the same element.
- Move simple, static, single-element presentation declarations and exact self/descendant state variants
  to literal Tailwind utilities when the mapping is exact and improves ownership.
- Preserve semantic class hooks while migrating presentation declarations.
- Retain complex or behavior-dependent rules in `audit-view.component.css`.
- Measure source CSS and production output before and after each small migration batch.
- Extend regression tests only where a structural class or state needs protection.

## 5. Out of scope

- Editing or reorganizing `src/styles.css`.
- Editing dependencies, build tooling, Tailwind versions, or `package.json`.
- Adding Angular Material or converting controls to Material components.
- Redesigning the audit page or introducing a new design system.
- Changing TypeScript business logic, HTTP services, API contracts, models, or data mapping.
- Replacing accessible custom controls with visually similar but behaviorally different controls.
- Converting all component CSS into long template class lists solely to reduce the CSS line count.
- Removing a selector only because a basic static search did not find it in literal HTML.

## 6. Optimization strategy

### 6.1 Phase 0: freeze and capture the baseline

Before implementation:

- Recalculate and record the SHA-256 values for `src/styles.css` and `package.json`.
- Record `git diff` for the audit component files.
- Run the existing test suite, strict TypeScript check, and production build.
- Record the component CSS source size and generated production CSS size.
- Capture reference screenshots for every state listed in the visual validation matrix.

No migration begins if the baseline is already failing.

### 6.2 Phase 1: remove only proven redundant declarations

The audit identified the following candidates. Each must still be verified against the generated CSS
and computed browser styles before removal:

- Component-wide `box-sizing: border-box`, which duplicates Tailwind Preflight.
- `font: inherit` on form controls, which duplicates Tailwind Preflight.
- The `.filter-help` top margin, which duplicates the existing `mt-[0.55rem]` template utility.
- Repeated `scrollbar-width: thin` in the revealed-scrollbar selector.
- Repeated scrollbar-thumb radius already defined by the base thumb selector.

These are declaration-level candidates, not permission to remove their surrounding semantic selectors.

### 6.3 Phase 2: migrate low-risk static styles

Move styles only in small, independently verifiable groups. Initial candidates are:

- Audit page width, horizontal centering, and static page padding.
- Table initials tile.
- Table-option text container and text truncation.
- Current-selection badge and selection check.
- Picker loading/error message layout.
- Condition join label.
- Remove-condition button's static geometry and typography.
- Record ID typography.
- Empty-value color.
- Panel error color.

These elements are suitable because their base presentation is local to a single element and does not
depend on complex descendants or multiple runtime states. Existing semantic class names must remain
where tests, bindings, or readable DOM inspection benefit from them.

### 6.4 Phase 3: migrate exact literal state variants

After Phase 2 passed, the following groups were migrated with literal Tailwind variants while retaining
their semantic Angular class bindings:

- Table-option hover, active, and selected states.
- Filter-button hover, active, pressed, and disabled states.
- Filter field/operator open, focus, placeholder, caret, and option states.
- Per-condition AND/OR active states.
- Expand-button chevron state and record badge modifiers.
- Long-cell focus expansion, empty values, and source value badges.
- History change/delete states and operation badge modifiers.
- Loading animation and reduced-motion behavior.

The Angular bindings still toggle the same semantic class names. Tailwind provides only their visual
declarations, so TypeScript behavior and test hooks remain unchanged.

### 6.5 Phase 4: verify and report

- Compare all captured states at the same viewport dimensions.
- Exercise mouse, trackpad, keyboard, and focus interactions.
- Confirm immutable file hashes.
- Confirm no dependency or package-lock change.
- Run all automated validation commands.
- Document the exact declarations removed, styles migrated, source-size difference, bundle-size difference,
  and any candidates intentionally retained.

## 7. CSS that must remain component-specific

The following behavior-heavy styles remain component-specific because moving them would reduce clarity
or risk changing cascade, sizing, or browser-specific behavior:

- Host-level audit typography and the shared control-height token.
- Filter-condition grid areas and their responsive rearrangement.
- Independent source-table and audit-history scroll ownership.
- Hover/focus-only scrollbar reveal, including vendor pseudo-elements, `:has()`, and `:is()` selectors.
- Table descendant sizing, sticky headers, row states, and ARIA-sort indicators.
- History-row containment and history-table column boundaries.
- Exact inclusive responsive breakpoints at 1100 px, 760 px, and 560 px.
- Sort-indicator transition and its reduced-motion override.

Moving these rules into the template would spread a single interaction across multiple elements, make the
responsive behavior harder to review, or risk changing specificity and cascade order.

## 8. Dead-code policy

No complete selector is currently proven dead. The operation modifier classes are created dynamically,
so they are valid even though their full names are not literal in the template.

A selector may be removed only when all of the following are true:

1. It has no literal or dynamic reference in the template or component.
2. It is not used by an Angular class binding, accessibility state, or test hook.
3. It is absent in every rendered interaction state.
4. Its removal produces no computed-style or visual difference at supported breakpoints.
5. Tests and production build remain green.

Static text search alone is insufficient evidence for deletion.

## 9. Functional regression matrix

The later implementation must preserve all of these workflows:

| Area             | Required behavior                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Feature selector | Search, open/close, keyboard navigation, selected marker, loading and error states                                         |
| Record loading   | Selection triggers the current API flow without an extra click                                                             |
| Filters          | Open/close, field/operator menus, value input, independent AND/OR joins, add/remove, clear, field reset                    |
| Dynamic schema   | Columns continue to come from API response data and remain responsive to narrow/wide tables                                |
| Sorting          | Every supported source and history column retains ascending/descending behavior and ARIA state                             |
| Pagination       | Page size, first/previous/next/last controls, disabled states, and counts remain unchanged                                 |
| Record expansion | Row and button expansion continue to work without duplicate event behavior                                                 |
| Approval         | Maker/Checker conditional visibility and empty-row display remain unchanged                                                |
| History          | Tree alignment, sticky header, boundaries, operation badges, change highlighting, and delete highlighting remain unchanged |
| Scrolling        | Source table and audit-history table remain independently horizontally scrollable                                          |
| Scrollbar        | Small scrollbar remains hidden until the appropriate region is hovered or focused                                          |
| Long values      | Truncation, title, keyboard focus expansion, and cell containment remain unchanged                                         |
| Accessibility    | Focus rings, keyboard operation, roles, labels, live/error states, and reduced motion remain unchanged                     |

## 10. Visual validation matrix

Capture and compare, at minimum:

- Viewport widths above 1100 px, at 1100 px, 761 px, 760 px, 561 px, 560 px, and a narrow mobile width.
- Empty feature selection.
- Feature selector closed and open, with selected and keyboard-active rows.
- Label loading, label error, record loading, record error, and empty records.
- Records with few columns and records wide enough to scroll.
- Filter panel closed and open.
- Field and operator menus open, including selected and keyboard-active options.
- One condition and multiple mixed AND/OR conditions.
- Expanded audit history with a narrow schema and a wide schema.
- Hover/focus scrollbar reveal in the source table and nested history table.
- Changed history values and deleted history rows.
- Maker/Checker hidden and visible response scenarios.
- Desktop and mobile pagination layouts.

The visual acceptance threshold is no intentional difference. Any detected difference requires rollback or
explicit user approval; it cannot be accepted merely because it appears subjectively cleaner.

## 11. Automated validation

The later implementation is complete only when all commands pass:

```bash
npm test -- --watch=false
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

Additionally:

- `git diff --check` must pass.
- `src/styles.css` and `package.json` hashes must match the frozen baseline.
- `package-lock.json` must have no optimization-related diff.
- Production component CSS must not cross or move closer to the configured budget limits.
- The final report must distinguish source-line reduction from generated production-size reduction.

## 12. Acceptance criteria

1. The audit UI is visually identical at every validated breakpoint and interaction state.
2. All existing functionality and API-driven behavior remain unchanged.
3. `src/styles.css` and `package.json` are byte-for-byte unchanged.
4. No dependency or lockfile change occurs.
5. Only exact Tailwind utilities from the existing toolchain are used.
6. Structural table, scrollbar, responsive, and ARIA relationship styles remain component-scoped.
7. Every removed declaration is documented with evidence that it was redundant.
8. No selector is removed solely on the basis of static-search output.
9. Template readability does not materially deteriorate.
10. Tests, strict TypeScript compilation, production build, visual checks, and interaction checks pass.

## 13. Final implementation decision

Stop at the current boundary. The remaining 230 lines are structural or browser-specific rules for
dynamic tables, nested scrollbar ownership, ARIA sorting, and exact inclusive responsive breakpoints.
Moving them into the template would not be a meaningful optimization and would increase regression risk.

## 14. Implemented result

The optimization migrated static presentation for the page shell, feature menu, filter controls and
menus, condition controls, source/history table shells, expansion button, record badges, operation badge,
loading indicator, and error state. A second reviewed pass migrated exact literal state variants while
retaining their semantic class hooks. Structural and browser-specific selectors remain scoped.

| Measurement                   |   Before | Final result |       Difference |
| ----------------------------- | -------: | -----------: | ---------------: |
| Component CSS lines           |      963 |          230 |    -733 (-76.1%) |
| Component CSS bytes           |   17,113 |        4,088 | -13,025 (-76.1%) |
| Template lines                |    1,262 |        1,358 |              +96 |
| Combined HTML and CSS bytes   |   70,455 |       72,912 |           +2,457 |
| Lazy audit component chunk    | 76.27 kB |     77.80 kB |         +1.53 kB |
| Generated global Tailwind CSS | 15.38 kB |     37.05 kB |        +21.67 kB |
| Estimated initial transfer    | 67.97 kB |     70.89 kB |         +2.92 kB |

This trade-off is intentional and transparent: component-scoped CSS is substantially smaller, while
literal Tailwind utilities increase generated global CSS and template bytes. The result meets the
requested Tailwind-first ownership model and remains well below the component-style budget; it is not a
net bundle-size optimization.

## 15. Final verification

- Production build: passed.
- Unit tests: 51 passed across 3 test files.
- Strict application and specification TypeScript checks: passed.
- `git diff --check`: passed.
- `src/styles.css`, `package.json`, and `package-lock.json`: SHA-256 values unchanged from the frozen
  baseline.
- No dependency was installed or removed.

The implementation preserved the exact 760 px inclusive component breakpoint rather than replacing it
with Tailwind's strict-below arbitrary max-width variant. Global stylesheet, package manifest, and lockfile
hashes remained unchanged. All 51 tests, strict TypeScript compilation, and the production build passed.
The global CSS increase is the explicit cost of moving exact, previously component-scoped values to
literal Tailwind utilities. The remaining component CSS owns host styling, responsive grid changes,
sticky-table relationships, nested hover/focus scrollbars, history-table geometry, ARIA-sort
relationships, and exact inclusive breakpoints. Moving those rules would reduce clarity or increase
regression risk and is therefore outside the safe optimization boundary.
