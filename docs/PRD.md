# Product Requirements: Audit History Viewer

## Goal

Provide one reusable audit screen that discovers selectable tables from the backend and renders
each selected table's current records and revision history without table-specific templates.

## Functional requirements

1. On page initialization, call `GET /api/v1/audit/allTable`.
2. Render every value in `data.tableLabels` in a searchable, keyboard-accessible selector.
3. Do not request records before the user selects a table.
4. On selection, call
   `GET /api/v1/audit/{encodedLabel}?pageNo=0&pageSize={selectedSize}`.
5. Rebuild main and history schemas from the selected response.
6. Show Maker and Checker in the main source table only when the current page contains at least one
   row with `approvalRecordPresent: true`.
7. Keep filters limited to source fields from `originalData`.
8. Allow independent AND/OR joins for added filter conditions.
9. Keep server pagination dynamic and reset to page zero when page size changes.
10. Refresh returns to the choose-table state and reloads table labels.
11. Show explicit loading, empty, error, and retry states.
12. Never substitute local data for a failed API response.

## API envelope

The frontend consumes `timestamp`, `message`, and `data`. It does not require or display
business-envelope `status` or `code`.

## Dynamic-table requirements

- ID, Maker, Checker, revision count, and record state are fixed semantic columns.
- Other main columns come from `originalData`.
- History columns come from `auditHistory` and may differ per table or record.
- Create/update metadata columns are hidden from expanded history only; matching source columns
  remain available in the main table and filters.
- Null main values display an em dash.
- Null history values display `null`.
- Wide history data must remain horizontally scrollable.
- History values that differ from the prior chronological revision must be highlighted dynamically;
  the comparison must remain stable when the displayed table is sorted.
- The source and history tables must scroll horizontally as independent mouse/trackpad regions.

## Filtering

- Supported conditions: contains, starts with, equals, not equals, greater/greater-or-equal,
  less/less-or-equal, is empty, and is not empty.
- Numeric and date fields use ordered comparison.
- Each rule after the first independently joins with AND or OR.
- AND groups are evaluated before OR groups.
- Changing a rule to a different field clears its value and restores the default `Contains`
  operator; re-selecting the active field preserves the rule.
- Filtering applies to the current API page only.

## Non-functional requirements

- Typed HttpClient service.
- Explicit component subscriptions and cleanup.
- Accessible roles, labels, focus treatment, and keyboard selectors.
- Feature-specific CSS in `audit-view.component.css`.
- No additional UI dependency.
- Unit tests for service endpoints, pagination parameters, error propagation, and feature behavior.
- Production build must pass.

## Acceptance criteria

- Production API mode uses only the two documented audit endpoints.
- Selecting a label immediately starts the corresponding record request.
- Query parameters reflect page controls.
- API errors display an error state and do not display previously configured records.
- No runtime JSON audit files, fallback responses, or legacy fixed-schema page exist.
