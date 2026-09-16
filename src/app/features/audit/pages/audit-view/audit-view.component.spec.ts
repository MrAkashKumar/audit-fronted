import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Observable, of, throwError } from "rxjs";

import { AuditTableLabelsApiResponse } from "../../models/audit-table-label.model";
import {
  AuditFilterCondition,
  DynamicAuditApiResponse,
} from "../../models/audit-view.model";
import { AuditService } from "../../services/audit.service";
import { AuditViewComponent } from "./audit-view.component";

interface AuditRecordRequest {
  tableLabel: string;
  pageNo: number;
  pageSize: number;
}

const labelsResponse: AuditTableLabelsApiResponse = {
  timestamp: "2026-09-14T04:30:00Z",
  message: "Request completed successfully",
  data: {
    tableLabels: ["Holiday-Calendar", "Loco-Singapore", "Position-Balance"],
  },
};

const createRecordsResponse = (
  pageNo = 0,
  pageSize = 10,
): DynamicAuditApiResponse => ({
  timestamp: "2026-09-14T09:25:00Z",
  message: "Request completed successfully",
  data: {
    pageNo,
    pageSize,
    numberOfElements: 1,
    totalElements: 21,
    totalPages: Math.ceil(21 / pageSize),
    hasPrevious: pageNo > 0,
    hasNext: pageNo < Math.ceil(21 / pageSize) - 1,
    rows: [
      {
        id: 2001,
        originalRecordPresent: true,
        originalData: {
          ID: 2001,
          LOCOMOTIVE_CODE: "SG-L-001",
          LOCOMOTIVE_NAME: "Merlion One",
          DEPOT_CODE: "TJS",
          FLEET_STATUS: "AVAILABLE",
        },
        changeSummary: {
          totalRevisions: 2,
          insertCount: 1,
          updateCount: 1,
          deleteCount: 0,
          unknownCount: 0,
          firstRevision: 9401,
          latestRevision: 9450,
        },
        auditHistory: [
          {
            sequenceNumber: 1,
            revision: 9401,
            revisionTypeCode: 0,
            operation: "INSERT",
            ID: 2001,
            REV: 9401,
            REVTYPE: 0,
            LOCOMOTIVE_CODE: "SG-L-001",
            COUNTRY_CODE: "SG",
            FLEET_STATUS: "MAINTENANCE",
          },
          {
            sequenceNumber: 2,
            revision: 9450,
            revisionTypeCode: 1,
            operation: "UPDATE",
            ID: 2001,
            REV: 9450,
            REVTYPE: 1,
            LOCOMOTIVE_CODE: "SG-L-001",
            COUNTRY_CODE: "SG",
            FLEET_STATUS: "AVAILABLE",
          },
        ],
      },
    ],
  },
});

describe("AuditViewComponent", () => {
  let labelRequests: number;
  let recordRequests: AuditRecordRequest[];
  let labelsResponseOverride: Observable<AuditTableLabelsApiResponse> | null;
  let recordsResponseOverride: Observable<DynamicAuditApiResponse> | null;

  beforeEach(async () => {
    labelRequests = 0;
    recordRequests = [];
    labelsResponseOverride = null;
    recordsResponseOverride = null;

    await TestBed.configureTestingModule({
      imports: [AuditViewComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AuditService,
          useValue: {
            getAuditTableLabels: () => {
              labelRequests += 1;
              return labelsResponseOverride ?? of(labelsResponse);
            },
            getAuditRecords: (
              tableLabel: string,
              pageNo = 0,
              pageSize = 10,
            ) => {
              recordRequests.push({ tableLabel, pageNo, pageSize });
              return (
                recordsResponseOverride ??
                of(createRecordsResponse(pageNo, pageSize))
              );
            },
          },
        },
      ],
    }).compileComponents();
  });

  async function createFixture(): Promise<
    ComponentFixture<AuditViewComponent>
  > {
    const fixture = TestBed.createComponent(AuditViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  async function selectTable(
    fixture: ComponentFixture<AuditViewComponent>,
    tableLabel: string,
  ): Promise<void> {
    const component = fixture.componentInstance;
    component.selectTable(tableLabel);
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
  }

  it("loads table labels from the service and waits for a selection", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(labelRequests).toBe(1);
    expect(component.tableLabels).toEqual(labelsResponse.data.tableLabels);
    expect(recordRequests).toEqual([]);
    expect(element.querySelector(".empty-selection")?.textContent).toContain(
      "Choose an audit feature",
    );
  });

  it("creates display names and initials from hyphenated API labels", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    expect(component.getTableDisplayName("Holiday-Calendar")).toBe(
      "Holiday Calendar",
    );
    expect(component.getTableDisplayName("Loco-Singapore")).toBe(
      "Loco Singapore",
    );
    expect(component.getTableInitials("Holiday-Calendar")).toBe("HC");
    expect(component.getTableInitials("Loco-Singapore")).toBe("LS");
    expect(component.getTableInitials("Position-Balance")).toBe("PB");
    expect(component.getTableInitials("Single")).toBe("S");
  });

  it("searches human-readable names but retains the raw API label", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    component.tableSearchQuery = "Loco Singapore";

    expect(component.filteredTableLabels).toEqual(["Loco-Singapore"]);
  });

  it("requests the raw selected label and renders dynamic schemas", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    await selectTable(fixture, "Loco-Singapore");

    expect(recordRequests.at(-1)).toEqual({
      tableLabel: "Loco-Singapore",
      pageNo: 0,
      pageSize: 10,
    });
    expect(component.columns.map((column) => column.key)).toEqual([
      "LOCOMOTIVE_CODE",
      "LOCOMOTIVE_NAME",
      "DEPOT_CODE",
      "FLEET_STATUS",
    ]);
    expect(component.columns.map((column) => column.label)).toEqual([
      "Locomotive Code",
      "Locomotive Name",
      "Depot Code",
      "Fleet Status",
    ]);
    expect(component.filterFields.map((field) => field.key)).not.toContain(
      "COUNTRY_CODE",
    );
    expect(
      component.rows[0].historyColumns.map((column) => column.key),
    ).toContain("COUNTRY_CODE");
    expect(element.querySelector(".record-id")?.textContent).toContain("#2001");
  });

  it("sends dynamic page and page-size changes through the service", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Position-Balance");
    component.goToPage(1);
    await fixture.whenStable();

    expect(recordRequests.at(-1)).toEqual({
      tableLabel: "Position-Balance",
      pageNo: 1,
      pageSize: 10,
    });

    component.onItemsPerPageChange({
      target: { value: "25" },
    } as unknown as Event);
    await fixture.whenStable();

    expect(recordRequests.at(-1)).toEqual({
      tableLabel: "Position-Balance",
      pageNo: 0,
      pageSize: 25,
    });
  });

  it("cycles sorting for ID, every dynamic column, revisions, and record state", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Loco-Singapore");

    const sortableKeys = [
      "ID",
      ...component.columns.map((column) => column.key),
      "__REVISIONS__",
      "__RECORD_STATE__",
    ];

    for (const key of sortableKeys) {
      expect(component.getSortIndicator(key)).toBe("↕");

      component.toggleSort(key);
      expect(component.sortKey).toBe(key);
      expect(component.sortDirection).toBe("asc");
      expect(component.getSortIndicator(key)).toBe("↑");

      component.toggleSort(key);
      expect(component.sortDirection).toBe("desc");
      expect(component.getSortIndicator(key)).toBe("↓");

      component.toggleSort(key);
      expect(component.sortKey).toBe("");
      expect(component.sortDirection).toBe("");
    }
  });

  it("sorts operation, revision, and every dynamic audit-history column", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Loco-Singapore");
    const row = component.rows[0];
    const originalRevisions = row.auditHistory.map((item) => item.revision);

    component.toggleHistorySort("revision");
    expect(
      component.getSortedAuditHistory(row).map((item) => item.revision),
    ).toEqual([9401, 9450]);
    expect(component.getHistoryAriaSort("revision")).toBe("ascending");

    component.toggleHistorySort("revision");
    expect(
      component.getSortedAuditHistory(row).map((item) => item.revision),
    ).toEqual([9450, 9401]);
    expect(component.getHistorySortIndicator("revision")).toBe("↓");

    component.toggleHistorySort("revision");
    expect(component.getHistorySortIndicator("revision")).toBe("↕");

    for (const key of [
      "operation",
      ...row.historyColumns.map((column) => column.key),
    ]) {
      component.toggleHistorySort(key);
      expect(component.historySortKey).toBe(key);
      expect(component.historySortDirection).toBe("asc");
      component.toggleHistorySort(key);
      expect(component.historySortDirection).toBe("desc");
      component.toggleHistorySort(key);
    }

    expect(row.auditHistory.map((item) => item.revision)).toEqual(
      originalRevisions,
    );

    component.toggleHistorySort("revision");
    await selectTable(fixture, "Position-Balance");
    expect(component.historySortKey).toBe("");
    expect(component.historySortDirection).toBe("");
  });

  it("keeps every added AND or OR join independent", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Loco-Singapore");
    component.addFilterCondition();
    component.addFilterCondition();
    component.addFilterCondition();
    component.setFilterConditionJoin(component.filterConditions[1], "OR");

    expect(
      component.filterConditions.map((condition) => condition.join),
    ).toEqual(["AND", "OR", "AND"]);
  });

  it("uses consistent visible labels for every filter control", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    await selectTable(fixture, "Loco-Singapore");
    component.toggleRecordFilters();
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    expect(
      Array.from(element.querySelectorAll(".control-label"), (label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(["Field", "Condition", "Value"]);
    expect(
      element.querySelector<HTMLInputElement>(".filter-value input")
        ?.placeholder,
    ).toBe("Enter text, number, or date");
  });

  it("filters with source fields only", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Loco-Singapore");
    const conditions: AuditFilterCondition[] = [
      {
        id: 1,
        join: "AND",
        fieldKey: "LOCOMOTIVE_CODE",
        operator: "equals",
        value: "SG-L-001",
      },
    ];
    component.filterConditions = conditions;

    expect(component.filteredRows).toHaveLength(1);

    conditions[0].value = "missing";
    expect(component.filteredRows).toHaveLength(0);
  });

  it("shows table-label API failures without replacement labels", async () => {
    labelsResponseOverride = throwError(() => new Error("API unavailable"));
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    expect(component.tableLabels).toEqual([]);
    expect(component.tableLabelsErrorMessage).toBe(
      "Unable to load audit features.",
    );
    expect(component.areTableLabelsLoading).toBe(false);
  });

  it("shows retryable record API failures and clears response data", async () => {
    recordsResponseOverride = throwError(() => new Error("API unavailable"));
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    await selectTable(fixture, "Holiday-Calendar");

    expect(component.recordsResponse).toBeNull();
    expect(component.rows).toEqual([]);
    expect(component.columns).toEqual([]);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      "Unable to load records for Holiday-Calendar.",
    );
    expect(
      element.querySelector('[role="alert"] button')?.textContent,
    ).toContain("Retry");
  });

  it("refreshes feature labels and returns to the choose-feature state", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Holiday-Calendar");
    component.refresh();
    await fixture.whenStable();

    expect(labelRequests).toBe(2);
    expect(component.selectedTableLabel).toBe("");
    expect(component.recordsResponse).toBeNull();
    expect(component.filterConditions).toEqual([]);
    expect(document.title).toBe("Audit features | Audit Frontend");
  });
});
