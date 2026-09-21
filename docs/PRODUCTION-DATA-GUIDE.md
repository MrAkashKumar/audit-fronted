# Production Audit Data Guide

## Runtime source

The audit feature is API-only. It contains no local audit JSON, fixture provider, generated fallback,
or client-side response replacement.

```text
Browser → AuditViewComponent → AuditService → Audit backend
```

The component calls the service and subscribes explicitly. The service returns typed, cold
`HttpClient` Observables and never subscribes internally.

## Endpoints

```text
GET /api/v1/audit/allTable
GET /api/v1/audit/{labelName}?pageNo={pageNo}&pageSize={pageSize}
```

`labelName` is trimmed and passed through `encodeURIComponent`. Page numbers are zero-based. Invalid
page numbers normalize to zero and invalid page sizes normalize to 10 before the request is sent.

## Dynamic rendering

No feature label or feature-specific source/history column is hardcoded. Approval metadata is a
fixed cross-feature part of the record contract.

- `data.tableLabels` supplies the searchable feature selector.
- The exact selected API label is sent to the record endpoint.
- `originalData` supplies main-table columns and filter fields.
- `approval` supplies main-table Approval present, Maker, and Checker values only.
- `auditHistory` supplies expanded-history columns.
- Response pagination metadata controls the footer and page navigation.
- A newly returned backend label or column requires no component-template change.

The first occurrence of a field establishes its position. Columns discovered on later pages are
retained in the selected feature's schema union.

## Error behavior

- A label request failure leaves the selector empty and displays the label error state.
- A record request failure clears visible rows and displays Retry.
- Retry repeats the selected label, page number, and page size.
- No failure path reads a local file or returns fabricated successful data.

## Backend connection

For deployment, route `/api/v1/audit/*` to the backend on the same origin. For local development,
configure an Angular proxy or a backend CORS policy. Do not change the service endpoint constants to
local JSON paths.

## Verification checklist

1. Load `/audit` and confirm one request to `GET /api/v1/audit/allTable`.
2. Confirm no record request occurs before feature selection.
3. Select a feature and confirm its exact encoded label is used.
4. Change page size and confirm the request resets to `pageNo=0`.
5. Navigate pages and confirm `pageNo` and `pageSize` match the controls.
6. Confirm main columns and filter fields match `originalData`.
7. Confirm approval presence, maker, and checker match each row's `approval` object.
8. Expand history and confirm its columns match `auditHistory` without approval fields.
9. Force an HTTP error and confirm the UI displays Retry without local data.
10. Run tests, strict TypeScript checks, formatting verification, and the production build.
