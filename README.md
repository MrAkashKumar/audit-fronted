# Audit Frontend

Angular audit-history viewer that loads selectable features and fully dynamic audit schemas from
the production HTTP API. No runtime fixture, local JSON response, or fallback data path exists.

## What the application provides

- Searchable audit-feature selector populated by the backend API.
- Dynamic record columns derived from each response's `originalData`.
- Dynamic expanded-history columns derived from each record's `auditHistory`.
- Previous-revision comparison with dynamic changed-value highlighting and before/after tooltips.
- Source-field filtering with independent AND/OR joins.
- Sorting for every main and history column, expandable history, hover/focus history scrolling,
  loading states, and retryable errors.
- Independent bounded record/history viewports with sticky headers and current-page scope messaging.
- Server-driven, zero-based pagination with selectable page sizes.
- Explicit component subscriptions to typed service Observables.

## API endpoints

| Purpose                     | Method | Endpoint                                                        |
| --------------------------- | ------ | --------------------------------------------------------------- |
| Load table labels           | GET    | `/api/v1/audit/allTable`                                        |
| Load selected table records | GET    | `/api/v1/audit/{labelName}?pageNo={pageNo}&pageSize={pageSize}` |

`labelName` is trimmed and URL encoded by `AuditService`. The default request is
`pageNo=0&pageSize=10`. Page changes send the requested zero-based page; changing the page size
resets the request to page zero.

Examples:

```text
GET /api/v1/audit/allTable
GET /api/v1/audit/Holiday-Calendar?pageNo=0&pageSize=10
GET /api/v1/audit/Position-Balance?pageNo=2&pageSize=25
```

## Response envelope

The frontend contract contains `timestamp`, `message`, and `data`. Business-envelope
`status` and `code` fields are not part of the TypeScript models or templates.

Table-label response:

```json
{
  "timestamp": "2026-09-14T04:30:00Z",
  "message": "Request completed successfully",
  "data": {
    "tableLabels": ["Holiday-Calendar", "Loco-Singapore", "Position-Balance"]
  }
}
```

Record responses return server pagination metadata and dynamic rows:

```text
data
├── pageNo
├── pageSize
├── numberOfElements
├── totalElements
├── totalPages
├── hasPrevious
├── hasNext
└── rows[]
    ├── id
    ├── originalRecordPresent
    ├── originalData
    ├── approval
    │   ├── approvalRecordPresent
    │   ├── makerUsername
    │   └── checkerUsername
    ├── changeSummary
    └── auditHistory[]
```

See [docs/DATA-CONTRACTS.md](docs/DATA-CONTRACTS.md) for the complete typed contract.

## Runtime flow

```text
AuditViewComponent.ngOnInit
  → AuditService.getAuditTableLabels()
  → component subscribes
  → data.tableLabels renders in the selector
  → hyphens/underscores become spaces for display
  → the first letters of the first two words become the initials

User selects a label
  → AuditService.getAuditRecords(label, 0, pageSize)
  → component subscribes
  → response metadata drives pagination
  → originalData drives the main schema and filter fields
  → approval drives fixed main-table approval details
  → auditHistory drives each expanded history schema
```

The service returns cold Observables and never subscribes internally. The component owns loading,
success, error, and subscription cancellation. HTTP failures propagate to the component and never
fall back to local data.

## Project structure

```text
audit-fronted/
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   └── features/audit/
│   │       ├── audit.routes.ts
│   │       ├── models/
│   │       │   ├── audit-table-label.model.ts
│   │       │   └── audit-view.model.ts
│   │       ├── pages/audit-view/
│   │       │   ├── audit-view.component.ts
│   │       │   ├── audit-view.component.html
│   │       │   ├── audit-view.component.css
│   │       │   └── audit-view.component.spec.ts
│   │       └── services/
│   │           ├── audit.service.ts
│   │           └── audit.service.spec.ts
│   ├── main.ts
│   └── styles.css
├── docs/
├── without_Dummy_data.md
├── angular.json
└── package.json
```

## Local setup

Prerequisites: Node.js 22+, npm 10+, and a backend serving the documented audit endpoints.

```bash
npm ci
npm start
```

Open [http://localhost:4200/audit](http://localhost:4200/audit).

Route `/api/v1/audit/*` to the backend on the same origin or configure an Angular development proxy.
See [Production API integration](docs/PRODUCTION-DATA-GUIDE.md) for the runtime flow and validation
checklist.

## Error behavior

- A table-label failure leaves the selector empty and shows `Unable to load audit features.`
- A record failure clears the previous rows and shows a Retry action.
- Retry repeats the same selected label, page number, and page size.
- HTTP failures are never replaced with local or generated data.

The regression suite covers component behavior, endpoint requests, pagination, dynamic change
highlighting, DELETE lifecycle presentation, and independent scrolling. The production build must
complete without warnings.

## Commands

```bash
npm start
npm test -- --watch=false
npm run build
```

## Documentation

The files below are maintained project deliverables. They document the product, API contract,
architecture, UI behavior, dependency decisions, and backend-integration history; they are not
generated build output and must remain in source control.

- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API data contracts](docs/DATA-CONTRACTS.md)
- [UI/UX specification](docs/UI-UX-SPEC.md)
- [Audit UI refinement and responsive behavior](docs/AUDIT-UI-REFINEMENT.md)
- [Audit functionality and UX review report](docs/AUDIT-REVIEW-REPORT.md)
- [Dependency audit](docs/DEPENDENCIES.md)
- [Reusable build prompt](docs/BUILD-PROMPT.md)
- [API-only migration record](without_Dummy_data.md)
- [Production API integration and validation](docs/PRODUCTION-DATA-GUIDE.md)
