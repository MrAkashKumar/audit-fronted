# Audit API Data Contracts

## Shared envelope

Both endpoints return:

```ts
{
  timestamp: string;
  message: string;
  data: unknown;
}
```

`status` and `code` are intentionally not part of the frontend response models.

## Table labels

`GET /api/v1/audit/allTable`

```json
{
  "timestamp": "2026-09-14T04:30:00Z",
  "message": "Request completed successfully",
  "data": {
    "tableLabels": ["Holiday-Calendar", "Loco-Singapore", "Position-Balance"]
  }
}
```

`data.tableLabels` must be an array of labels accepted by the record endpoint. The exact returned
label is used as the route parameter. The UI replaces hyphens and underscores with spaces for
display and derives initials from the first letters of the first two words.

## Audit records

`GET /api/v1/audit/{labelName}?pageNo={pageNo}&pageSize={pageSize}`

| Parameter | Type          | Rule                             |
| --------- | ------------- | -------------------------------- |
| labelName | path string   | Trimmed and URL encoded          |
| pageNo    | query integer | Zero based and non-negative      |
| pageSize  | query integer | Positive; frontend default is 10 |

```ts
interface DynamicAuditApiResponse {
  timestamp: string;
  message: string;
  data: DynamicAuditPage;
}

interface DynamicAuditPage {
  pageNo: number;
  pageSize: number;
  numberOfElements: number;
  totalElements: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  rows: DynamicAuditRecord[];
}

interface DynamicAuditRecord {
  id: string | number;
  originalRecordPresent: boolean;
  originalData: Record<string, string | number | boolean | null> | null;
  approval: AuditApprovalDetails;
  changeSummary: DynamicChangeSummary;
  auditHistory: DynamicAuditHistoryEntry[];
}

interface AuditApprovalDetails {
  approvalRecordPresent: boolean;
  makerUsername: string | null;
  checkerUsername: string | null;
}

interface DynamicChangeSummary {
  totalRevisions: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  unknownCount: number;
  firstRevision: number;
  latestRevision: number;
}

interface DynamicAuditHistoryEntry {
  sequenceNumber: number;
  revision: number;
  revisionTypeCode: number;
  operation: string;
  [column: string]: string | number | boolean | null;
}
```

## UI mapping

- `id` renders in the fixed ID column.
- `originalData` supplies every dynamic main column and filter field. Only `ID` is omitted from that
  generated list because `id` already renders in the dedicated ID column.
- `changeSummary.totalRevisions` supplies the revision badge.
- `originalRecordPresent` supplies Current/Audit only state.
- `approval` supplies the conditional Maker and Checker columns in the main source table only. The
  columns render when at least one row on the current API page has `approvalRecordPresent: true` and
  remain hidden when every row is false. Approval is not added to filters or expanded history.
- `approvalRecordPresent` controls column visibility but is not rendered as its own UI column. On a
  mixed page, false rows show an em dash under the visible Maker and Checker columns.
- These three fields do not distinguish an Approved outcome from a Rejected outcome. The UI does
  not guess; an explicit backend outcome field would be required to display that distinction.
- `auditHistory` supplies the expandable history table.
- `operation` and `revision` have dedicated history columns.
- Technical keys such as `REV`, `REVTYPE`, and `revisionTypeCode` are excluded from the dynamic
  history column list.
- History keys whose normalized names begin with `CREATE` or `UPDATE` are excluded from the expanded
  history view only. Equivalent source fields inside `originalData` still render in the main table
  and remain available to filters.

## Empty and error responses

An empty successful page must still return complete pagination metadata with `rows: []`.
Transport or server failures must use HTTP error responses. The frontend does not manufacture a
successful response, perform client-side page slicing, or fall back to local records.
