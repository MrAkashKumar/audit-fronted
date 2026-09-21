# Audit Feature Architecture

## Design

The audit feature is a lazy-loaded, standalone Angular feature at `/audit`.

```mermaid
flowchart LR
    Router --> AuditViewComponent
    AuditViewComponent -->|subscribe| AuditService
    AuditService -->|GET /api/v1/audit/*| Backend
    Backend -->|typed Observable response| AuditViewComponent
    AuditViewComponent --> Selector
    AuditViewComponent --> DynamicTable
    DynamicTable --> HistoryTable
```

## Ownership

### AuditService

- Owns both endpoint URLs.
- Trims and URL-encodes the selected label.
- Normalizes `pageNo` to a non-negative integer.
- Normalizes `pageSize` to a positive integer, defaulting to 10.
- Returns typed, cold HttpClient Observables.
- Propagates HTTP errors.
- Has no fixture, fallback, response replacement, or local pagination path.

### AuditViewComponent

- Subscribes explicitly to label and record requests.
- Unsubscribes before replacing an in-flight request and on destroy.
- Owns loading, success, error, selection, filter, sort, expansion, and pagination state.
- Uses server pagination metadata as authoritative.
- Derives source columns from `originalData`.
- Maps `approval` to fixed main-table Approval present, Maker, and Checker columns.
- Derives history columns from each row's `auditHistory`.
- Exposes only source columns to the filter builder.

### Models

- `audit-table-label.model.ts`: table-label response.
- `audit-view.model.ts`: dynamic row, history, pagination, filter, and view models.

## Request sequence

```mermaid
sequenceDiagram
    participant User
    participant View as AuditViewComponent
    participant Service as AuditService
    participant API as Audit API

    View->>Service: getAuditTableLabels()
    Service->>API: GET /api/v1/audit/allTable
    API-->>Service: timestamp, message, data.tableLabels
    Service-->>View: Observable next
    User->>View: Select label
    View->>Service: getAuditRecords(label, 0, pageSize)
    Service->>API: GET /api/v1/audit/{label}?pageNo=0&pageSize=n
    API-->>Service: timestamp, message, data page
    Service-->>View: Observable next
    View-->>User: Dynamic records and history
```

On HTTP failure, the Observable errors and the component renders an error/retry state. There is no
automatic fallback or alternate local data source.

## Pagination

The backend owns total counts and page boundaries. The component sends a zero-based page number
and selected size. A page-size change resets to page zero. First/previous/next/last controls are
enabled from response metadata.

## Dynamic schema

Main columns are the per-feature union of keys discovered in `originalData` across loaded API
pages, including fields whose value is currently null. Only `ID` is omitted from the generated
list because the record identifier already renders in the dedicated ID column. Fields
such as `CREATED_BY`, `CREATED_ON`, `UPDATED_BY`, `UPDATED_ON`, and `VERSION` remain fully dynamic
and render whenever the selected API response supplies them.

History columns are computed per record from its history entries. The fixed history semantics
(`operation` and `revision`) render in dedicated columns, while transport/technical aliases such as
`REV`, `REVTYPE`, and `revisionTypeCode` are omitted from the generated history list. History-only
metadata whose normalized key begins with `CREATE` or `UPDATE` is also omitted, regardless of case
or separator style. Those fields remain dynamic in the main source table and filters when supplied
inside `originalData`. A feature selection starts a fresh schema union, so new backend labels work
without table-specific component code while sparse fields remain available during pagination. A
failed page request clears visible rows but preserves the same-feature schema union so an exact
retry cannot discard fields learned from earlier pages.

Approval metadata is separate from the dynamic source schema. Every main row renders the response's
`approvalRecordPresent`, `makerUsername`, and `checkerUsername` values, while filters remain limited
to `originalData` and expanded history remains limited to `auditHistory`.

Changed history values are derived from the response rather than stored in the view model. Entries
are ordered by `sequenceNumber`, then `revision`; every dynamic value is compared with the prior
chronological entry. A WeakMap cache keeps template lookups inexpensive and preserves the correct
highlight when the displayed history is sorted differently.

Column type inference stops after finding the first non-null value for a field. A key seen only with
null values is temporarily treated as text; the first later page containing a concrete value can
upgrade it to text, number, boolean, or date. Once concrete evidence is recorded, later conflicting
types do not silently replace it.

## Styling

Global `src/styles.css` contains only the Tailwind import, base page colors, and scrollbar styling.
Reusable layout utilities live in the component template; complex audit presentation and behavior
remain in `audit-view.component.css` under Angular component encapsulation.
The Angular component schematic is configured with `type: component`, so future generated components
use the `.component.ts`, `.component.html`, `.component.css`, and `.component.spec.ts` convention.
