import { provideZonelessChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Observable, of, Subject, throwError } from "rxjs";
import { vi } from "vitest";

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
          CREATED_BY: "AUDIT_ADMIN",
          CREATED_ON: "2026-08-01T09:00:00Z",
          UPDATED_BY: "OPS_SG",
          UPDATED_ON: "2026-08-28T09:35:12Z",
          VERSION: 2,
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
  let labelsResponseFactory:
    (() => Observable<AuditTableLabelsApiResponse>) | null;
  let recordsResponseFactory:
    | ((
        tableLabel: string,
        pageNo: number,
        pageSize: number,
      ) => Observable<DynamicAuditApiResponse>)
    | null;

  beforeEach(async () => {
    labelRequests = 0;
    recordRequests = [];
    labelsResponseOverride = null;
    recordsResponseOverride = null;
    labelsResponseFactory = null;
    recordsResponseFactory = null;

    await TestBed.configureTestingModule({
      imports: [AuditViewComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AuditService,
          useValue: {
            getAuditTableLabels: () => {
              labelRequests += 1;
              return (
                labelsResponseFactory?.() ??
                labelsResponseOverride ??
                of(labelsResponse)
              );
            },
            getAuditRecords: (
              tableLabel: string,
              pageNo = 0,
              pageSize = 10,
            ) => {
              recordRequests.push({ tableLabel, pageNo, pageSize });
              return (
                recordsResponseFactory?.(tableLabel, pageNo, pageSize) ??
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
      "CREATED_BY",
      "CREATED_ON",
      "UPDATED_BY",
      "UPDATED_ON",
      "VERSION",
      "LOCOMOTIVE_CODE",
      "LOCOMOTIVE_NAME",
      "DEPOT_CODE",
      "FLEET_STATUS",
    ]);
    expect(component.columns.map((column) => column.label)).toEqual([
      "Created BY",
      "Created ON",
      "Updated BY",
      "Updated ON",
      "Version",
      "Locomotive Code",
      "Locomotive Name",
      "Depot Code",
      "Fleet Status",
    ]);
    expect(
      Object.fromEntries(
        component.columns.map((column) => [column.key, column.dataType]),
      ),
    ).toMatchObject({
      CREATED_ON: "date",
      UPDATED_ON: "date",
      VERSION: "number",
      LOCOMOTIVE_CODE: "text",
    });
    expect(component.filterFields.map((field) => field.key)).not.toContain(
      "COUNTRY_CODE",
    );
    expect(component.filterFields.map((field) => field.key)).toEqual(
      expect.arrayContaining([
        "CREATED_BY",
        "CREATED_ON",
        "UPDATED_BY",
        "UPDATED_ON",
        "VERSION",
      ]),
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
      expect(component.getAriaSort(key)).toBeNull();

      component.toggleSort(key);
      expect(component.sortKey).toBe(key);
      expect(component.sortDirection).toBe("asc");
      expect(component.getAriaSort(key)).toBe("ascending");

      component.toggleSort(key);
      expect(component.sortDirection).toBe("desc");
      expect(component.getAriaSort(key)).toBe("descending");

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
    expect(component.getHistoryAriaSort("revision")).toBe("descending");

    component.toggleHistorySort("revision");
    expect(component.getHistoryAriaSort("revision")).toBeNull();

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

  it("starts a fresh filter when its selected field changes", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Loco-Singapore");
    component.addFilterCondition();

    const condition = component.filterConditions[0];
    condition.fieldKey = "ID";
    condition.operator = "equals";
    condition.value = "2001";

    component.selectFilterField(condition, "LOCOMOTIVE_CODE");

    expect(condition).toMatchObject({
      fieldKey: "LOCOMOTIVE_CODE",
      operator: "contains",
      value: "",
    });

    condition.operator = "equals";
    condition.value = "SG-L-001";
    component.selectFilterField(condition, "LOCOMOTIVE_CODE");

    expect(condition).toMatchObject({
      fieldKey: "LOCOMOTIVE_CODE",
      operator: "equals",
      value: "SG-L-001",
    });
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
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.empty-selection[role="alert"]')
        ?.textContent?.trim(),
    ).toContain("Unable to load audit features");
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

  it("clears the previous feature schema while the next feature loads", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Loco-Singapore");
    expect(component.columns.length).toBeGreaterThan(0);

    const pendingResponse = new Subject<DynamicAuditApiResponse>();
    recordsResponseOverride = pendingResponse;
    component.selectTable("Position-Balance");
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    expect(component.recordsResponse).toBeNull();
    expect(component.rows).toEqual([]);
    expect(component.columns).toEqual([]);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        ".filter-button",
      )?.disabled,
    ).toBe(true);

    pendingResponse.next(createRecordsResponse());
    pendingResponse.complete();
    await fixture.whenStable();

    expect(component.isRecordsLoading).toBe(false);
    expect(component.rows).toHaveLength(1);
  });

  it("retries the exact failed page and page size", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Position-Balance");
    recordsResponseOverride = throwError(() => new Error("page failed"));
    component.goToPage(1);
    await fixture.whenStable();

    recordsResponseOverride = of(createRecordsResponse(1, 10));
    component.retryAuditRecords();
    await fixture.whenStable();

    expect(recordRequests.at(-1)).toEqual({
      tableLabel: "Position-Balance",
      pageNo: 1,
      pageSize: 10,
    });
    expect(component.currentPageNo).toBe(1);
  });

  it("distinguishes an empty API page from empty filtered results", async () => {
    const emptyResponse = createRecordsResponse();
    emptyResponse.data.rows = [];
    emptyResponse.data.numberOfElements = 0;
    emptyResponse.data.totalElements = 0;
    emptyResponse.data.totalPages = 0;
    emptyResponse.data.hasNext = false;
    recordsResponseOverride = of(emptyResponse);

    const fixture = await createFixture();
    await selectTable(fixture, "Holiday-Calendar");

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector(".panel-state")?.textContent).toContain(
      "No audit records available",
    );
    expect(element.querySelector(".panel-state")?.textContent).not.toContain(
      "clear the filter",
    );
  });

  it("shows current-page filter context alongside the server total", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Loco-Singapore");
    component.filterConditions = [
      {
        id: 1,
        join: "AND",
        fieldKey: "LOCOMOTIVE_CODE",
        operator: "equals",
        value: "missing",
      },
    ];
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector(".panel-state")?.textContent).toContain(
      "No matching records",
    );
    expect(element.querySelector(".records-summary")?.textContent).toContain(
      "0 shown on this page / 21 total",
    );
  });

  it("clears hidden values and restricts comparison operators by field type", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Loco-Singapore");
    component.addFilterCondition();
    const condition = component.filterConditions[0];
    condition.fieldKey = "VERSION";
    condition.value = "2";

    expect(
      component
        .getFilterOperatorOptions(condition)
        .map((operator) => operator.value),
    ).toContain("greaterThan");
    expect(
      component
        .getFilterOperatorOptions(condition)
        .map((operator) => operator.value),
    ).not.toContain("startsWith");

    component.selectFilterOperator(condition, "isEmpty");
    expect(condition.value).toBe("");

    component.selectFilterField(condition, "FLEET_STATUS");
    expect(
      component
        .getFilterOperatorOptions(condition)
        .map((operator) => operator.value),
    ).toContain("startsWith");
    expect(
      component
        .getFilterOperatorOptions(condition)
        .map((operator) => operator.value),
    ).not.toContain("greaterThan");
  });

  it("retains a per-feature union of dynamic columns across pages", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await selectTable(fixture, "Loco-Singapore");
    const secondPage = createRecordsResponse(1, 10);
    secondPage.data.rows[0].originalData = {
      ID: 2002,
      PAGE_TWO_ONLY: "value",
    };
    recordsResponseOverride = of(secondPage);

    component.goToPage(1);
    await fixture.whenStable();

    const keys = component.columns.map((column) => column.key);
    expect(keys).toContain("LOCOMOTIVE_CODE");
    expect(keys).toContain("PAGE_TWO_ONLY");
  });

  it("evaluates independent mixed AND/OR groups with AND precedence", async () => {
    const mixedResponse = createRecordsResponse();
    const secondRecord = structuredClone(mixedResponse.data.rows[0]);
    secondRecord.id = 2002;
    secondRecord.originalData = {
      ID: 2002,
      LOCOMOTIVE_NAME: "Harbour Runner",
      FLEET_STATUS: "RETIRED",
      DEPOT_CODE: "PSA",
    };
    mixedResponse.data.rows.push(secondRecord);
    mixedResponse.data.numberOfElements = 2;
    recordsResponseOverride = of(mixedResponse);

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Loco-Singapore");

    component.filterConditions = [
      {
        id: 1,
        join: "AND",
        fieldKey: "LOCOMOTIVE_NAME",
        operator: "equals",
        value: "Merlion One",
      },
      {
        id: 2,
        join: "OR",
        fieldKey: "FLEET_STATUS",
        operator: "equals",
        value: "RETIRED",
      },
      {
        id: 3,
        join: "AND",
        fieldKey: "DEPOT_CODE",
        operator: "equals",
        value: "PSA",
      },
    ];

    expect(component.filteredRows.map((row) => row.id)).toEqual([2001, 2002]);
    component.filterConditions[2].value = "TJS";
    expect(component.filteredRows.map((row) => row.id)).toEqual([2001]);
  });

  it("uses neutral styling for unknown operations", async () => {
    const unknownResponse = createRecordsResponse();
    unknownResponse.data.rows[0].auditHistory[0].operation = "MERGE";
    recordsResponseOverride = of(unknownResponse);

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Loco-Singapore");
    component.toggleRow(component.rows[0].id);
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    expect(component.getOperationTone("MERGE")).toBe("unknown");
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector(".operation-badge--unknown")
        ?.textContent?.trim(),
    ).toBe("MERGE");
  });

  it("keeps listbox options out of the Tab sequence and shows the selection", async () => {
    const fixture = await createFixture();
    const element = fixture.nativeElement as HTMLElement;
    const search = element.querySelector<HTMLInputElement>(
      "#audit-view-table-search",
    );

    search?.focus();
    fixture.detectChanges();
    expect(
      Array.from(
        element.querySelectorAll<HTMLButtonElement>(".table-option"),
      ).every((option) => option.tabIndex === -1),
    ).toBe(true);

    await selectTable(fixture, "Position-Balance");
    expect(
      element.querySelector(".selected-feature-name")?.textContent,
    ).toContain("Position Balance");
  });

  it("scrolls a keyboard-active feature option into the visible listbox area", async () => {
    labelsResponseOverride = of({
      ...labelsResponse,
      data: {
        tableLabels: Array.from(
          { length: 51 },
          (_, index) => `Audit-Feature-${index + 1}`,
        ),
      },
    });
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const fixture = await createFixture();
      const component = fixture.componentInstance;
      component.onTableSearchFocus();
      fixture.changeDetectorRef.markForCheck();
      await fixture.whenStable();

      component.onTableSearchKeydown(
        new KeyboardEvent("keydown", { key: "ArrowDown" }),
      );
      await new Promise((resolve) => setTimeout(resolve));

      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    }
  });

  it("upgrades a provisional null-only column type when later API data provides evidence", async () => {
    const firstPage = createRecordsResponse(0, 10);
    firstPage.data.rows[0].originalData = {
      ID: 2001,
      AMOUNT: null,
      SETTLEMENT_ON: null,
    };
    recordsResponseOverride = of(firstPage);

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Position-Balance");

    expect(
      component.columns.find((column) => column.key === "AMOUNT")?.dataType,
    ).toBe("text");

    const secondPage = createRecordsResponse(1, 10);
    secondPage.data.rows[0].originalData = {
      ID: 2002,
      AMOUNT: 25,
      SETTLEMENT_ON: "2026-09-16T08:00:00Z",
    };
    recordsResponseOverride = of(secondPage);
    component.goToPage(1);
    await fixture.whenStable();

    expect(
      component.columns.find((column) => column.key === "AMOUNT")?.dataType,
    ).toBe("number");
    expect(
      component.columns.find((column) => column.key === "SETTLEMENT_ON")
        ?.dataType,
    ).toBe("date");

    const amountCondition: AuditFilterCondition = {
      id: 99,
      join: "AND",
      fieldKey: "AMOUNT",
      operator: "contains",
      value: "",
    };
    expect(
      component
        .getFilterOperatorOptions(amountCondition)
        .map((option) => option.value),
    ).toContain("greaterThan");
  });

  it("preserves the discovered schema across a failed page request and retry", async () => {
    const firstPage = createRecordsResponse(0, 10);
    firstPage.data.rows[0].originalData = {
      ID: 2001,
      PAGE_ZERO_ONLY: "first",
    };
    recordsResponseOverride = of(firstPage);

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Position-Balance");

    recordsResponseOverride = throwError(() => new Error("page failed"));
    component.goToPage(1);
    await fixture.whenStable();

    expect(component.columns.map((column) => column.key)).toContain(
      "PAGE_ZERO_ONLY",
    );

    const secondPage = createRecordsResponse(1, 10);
    secondPage.data.rows[0].originalData = {
      ID: 2002,
      PAGE_ONE_ONLY: "second",
    };
    recordsResponseOverride = of(secondPage);
    component.retryAuditRecords();
    await fixture.whenStable();

    expect(component.columns.map((column) => column.key)).toEqual([
      "PAGE_ZERO_ONLY",
      "PAGE_ONE_ONLY",
    ]);
  });

  it("restores feature-search focus and reveals the selected option after Clear", async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const fixture = await createFixture();
      const component = fixture.componentInstance;
      const element = fixture.nativeElement as HTMLElement;
      component.selectedTableLabel = "Position-Balance";

      const search = element.querySelector<HTMLInputElement>(
        "#audit-view-table-search",
      );
      if (!search) {
        throw new Error("Feature search input was not rendered.");
      }

      search.value = "Holiday";
      search.dispatchEvent(new Event("input"));
      fixture.detectChanges();

      const clearButton = element.querySelector<HTMLButtonElement>(
        ".clear-table-search",
      );
      clearButton?.focus();
      clearButton?.click();
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));

      expect(document.activeElement).toBe(search);
      expect(component.activeTableOptionIndex).toBe(2);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    }
  });

  it("shows distinct loading and API-empty feature states", async () => {
    const pendingLabels = new Subject<AuditTableLabelsApiResponse>();
    labelsResponseOverride = pendingLabels;
    const fixture = TestBed.createComponent(AuditViewComponent);
    fixture.detectChanges();

    let element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector(".empty-selection")?.textContent).toContain(
      "Loading audit features",
    );
    expect(element.querySelector(".table-count")?.textContent).toContain(
      "Loading",
    );

    pendingLabels.next({
      ...labelsResponse,
      data: { tableLabels: [] },
    });
    pendingLabels.complete();
    await fixture.whenStable();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector(".empty-selection")?.textContent).toContain(
      "No audit features available",
    );
    expect(element.querySelector(".table-count")?.textContent).toContain(
      "0 features",
    );

    const search = element.querySelector<HTMLInputElement>(
      "#audit-view-table-search",
    );
    search?.focus();
    fixture.detectChanges();
    expect(element.querySelector(".picker-state")?.textContent).toContain(
      "No audit features available",
    );

    if (search) {
      search.value = "anything";
      search.dispatchEvent(new Event("input"));
      fixture.detectChanges();
    }
    expect(element.querySelector(".picker-state")?.textContent).toContain(
      "No audit features available",
    );
  });

  it("keeps focus inside the rule editor after removing its only condition", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Loco-Singapore");
    component.toggleRecordFilters();
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    const originalConditionId = component.filterConditions[0].id;
    const removeButton = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(".remove-condition");
    removeButton?.focus();
    removeButton?.click();
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));

    const replacementCondition = component.filterConditions[0];
    expect(replacementCondition.id).not.toBe(originalConditionId);
    expect(document.activeElement?.id).toBe(
      `filter-field-trigger-${replacementCondition.id}`,
    );
  });

  it("supports Home, End, and type-ahead in field and operator listboxes", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Loco-Singapore");
    component.toggleRecordFilters();
    const condition = component.filterConditions[0];
    const trigger = document.createElement("button");

    component.toggleFilterFieldMenu(condition);
    component.onFilterFieldKeydown(
      condition,
      new KeyboardEvent("keydown", { key: "End" }),
      trigger,
    );
    expect(component.activeFieldOptionIndex).toBe(
      component.filterFieldOptions.length - 1,
    );

    component.onFilterFieldKeydown(
      condition,
      new KeyboardEvent("keydown", { key: "Home" }),
      trigger,
    );
    expect(component.activeFieldOptionIndex).toBe(0);

    component.onFilterFieldKeydown(
      condition,
      new KeyboardEvent("keydown", { key: "v" }),
      trigger,
    );
    component.onFilterFieldKeydown(
      condition,
      new KeyboardEvent("keydown", { key: "e" }),
      trigger,
    );
    expect(
      component.filterFieldOptions[component.activeFieldOptionIndex].label,
    ).toBe("Version");

    component.selectFilterField(condition, "VERSION", trigger);
    component.toggleFilterOperatorMenu(condition);
    component.onFilterOperatorKeydown(
      condition,
      new KeyboardEvent("keydown", { key: "g" }),
      trigger,
    );
    expect(
      component.getFilterOperatorOptions(condition)[
        component.activeOperatorOptionIndex
      ].label,
    ).toBe("Greater than");
  });

  it("exposes filter disclosure state, live empty results, and long cell values", async () => {
    const response = createRecordsResponse();
    const longValue = "A very long audit value that needs keyboard expansion";
    response.data.rows[0].originalData = {
      ID: 2001,
      LONG_DESCRIPTION: longValue,
    };
    recordsResponseOverride = of(response);

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Loco-Singapore");
    let element = fixture.nativeElement as HTMLElement;
    let filterButton =
      element.querySelector<HTMLButtonElement>(".filter-button");
    expect(filterButton?.getAttribute("aria-expanded")).toBe("false");
    expect(element.querySelector("#audit-record-filters")).toBeNull();

    component.toggleRecordFilters();
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
    filterButton = element.querySelector<HTMLButtonElement>(".filter-button");
    expect(filterButton?.getAttribute("aria-expanded")).toBe("true");
    expect(filterButton?.classList.contains("filter-button--active")).toBe(
      true,
    );
    expect(filterButton?.textContent).toContain("Hide filters");
    expect(filterButton?.getAttribute("aria-controls")).toBe(
      "audit-record-filters",
    );
    expect(element.querySelector("#audit-record-filters")).not.toBeNull();

    const expandableValue = element.querySelector<HTMLElement>(
      ".cell-value--expandable",
    );
    expect(expandableValue?.tabIndex).toBe(0);
    expect(expandableValue?.getAttribute("aria-label")).toBe(
      `Long Description: ${longValue}`,
    );
    expandableValue?.click();
    expect(component.expandedRowIds.size).toBe(0);

    component.filterConditions = [
      {
        id: 1,
        join: "AND",
        fieldKey: "LONG_DESCRIPTION",
        operator: "equals",
        value: "missing",
      },
    ];
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    expect(element.querySelector('.panel-state[role="status"]')).not.toBeNull();
  });

  it("cancels a replaced record request so a late response cannot overwrite the selected feature", async () => {
    const firstRequest = new Subject<DynamicAuditApiResponse>();
    const secondRequest = new Subject<DynamicAuditApiResponse>();
    recordsResponseFactory = (tableLabel) =>
      tableLabel === "First-Feature" ? firstRequest : secondRequest;

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    component.selectTable("First-Feature");
    component.selectTable("Second-Feature");

    const lateFirstResponse = createRecordsResponse();
    lateFirstResponse.data.rows[0].id = 1001;
    firstRequest.next(lateFirstResponse);
    firstRequest.complete();

    const activeSecondResponse = createRecordsResponse();
    activeSecondResponse.data.rows[0].id = 2002;
    secondRequest.next(activeSecondResponse);
    secondRequest.complete();
    await fixture.whenStable();

    expect(component.selectedTableLabel).toBe("Second-Feature");
    expect(component.rows.map((row) => row.id)).toEqual([2002]);
  });

  it("cancels a replaced label request during Refresh", async () => {
    const firstRequest = new Subject<AuditTableLabelsApiResponse>();
    const secondRequest = new Subject<AuditTableLabelsApiResponse>();
    let factoryCall = 0;
    labelsResponseFactory = () => {
      factoryCall += 1;
      return factoryCall === 1 ? firstRequest : secondRequest;
    };

    const fixture = TestBed.createComponent(AuditViewComponent);
    fixture.detectChanges();
    fixture.componentInstance.refresh();

    firstRequest.next({
      ...labelsResponse,
      data: { tableLabels: ["Stale-Feature"] },
    });
    firstRequest.complete();
    secondRequest.next({
      ...labelsResponse,
      data: { tableLabels: ["Current-Feature"] },
    });
    secondRequest.complete();
    await fixture.whenStable();

    expect(fixture.componentInstance.tableLabels).toEqual(["Current-Feature"]);
  });

  it("applies text, numeric, date, boolean, and empty filter operators", async () => {
    const response = createRecordsResponse();
    const baseRecord = response.data.rows[0];
    response.data.rows = [
      {
        ...structuredClone(baseRecord),
        id: 1,
        originalData: {
          ID: 1,
          NAME: "Alpha",
          AMOUNT: 10,
          ACTIVE: true,
          EVENT_DATE: "2026-01-01",
        },
      },
      {
        ...structuredClone(baseRecord),
        id: 2,
        originalData: {
          ID: 2,
          NAME: "Beta",
          AMOUNT: 20,
          ACTIVE: false,
          EVENT_DATE: "2026-02-01",
        },
      },
      {
        ...structuredClone(baseRecord),
        id: 3,
        originalData: {
          ID: 3,
          NAME: null,
          AMOUNT: null,
          ACTIVE: null,
          EVENT_DATE: null,
        },
      },
    ];
    response.data.numberOfElements = 3;
    response.data.totalElements = 3;
    response.data.totalPages = 1;
    recordsResponseOverride = of(response);

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Dynamic-Feature");

    const expectMatches = (
      fieldKey: string,
      operator: AuditFilterCondition["operator"],
      value: string,
      expectedIds: number[],
    ) => {
      component.filterConditions = [
        { id: 1, join: "AND", fieldKey, operator, value },
      ];
      expect(component.filteredRows.map((row) => row.id)).toEqual(expectedIds);
    };

    expectMatches("NAME", "contains", "a", [1, 2]);
    expectMatches("NAME", "startsWith", "be", [2]);
    expectMatches("AMOUNT", "equals", "20", [2]);
    expectMatches("NAME", "notEquals", "Alpha", [2]);
    expectMatches("AMOUNT", "greaterThan", "10", [2]);
    expectMatches("EVENT_DATE", "lessThan", "2026-02-01", [1]);
    expectMatches("ACTIVE", "equals", "true", [1]);
    expectMatches("NAME", "isEmpty", "", [3]);
    expectMatches("ACTIVE", "isNotEmpty", "", [1, 2]);
  });

  it("sorts dynamic main values and keeps null values last", async () => {
    const response = createRecordsResponse();
    const baseRecord = response.data.rows[0];
    response.data.rows = [
      {
        ...structuredClone(baseRecord),
        id: 3,
        originalData: { ID: 3, AMOUNT: null },
      },
      {
        ...structuredClone(baseRecord),
        id: 1,
        originalData: { ID: 1, AMOUNT: 20 },
      },
      {
        ...structuredClone(baseRecord),
        id: 2,
        originalData: { ID: 2, AMOUNT: 10 },
      },
    ];
    response.data.numberOfElements = 3;
    response.data.totalElements = 3;
    response.data.totalPages = 1;
    recordsResponseOverride = of(response);

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Dynamic-Feature");

    component.toggleSort("AMOUNT");
    expect(component.filteredRows.map((row) => row.id)).toEqual([2, 1, 3]);
    component.toggleSort("AMOUNT");
    expect(component.filteredRows.map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it("keeps records and audit-history horizontal wheel scrolling independent", async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    const recordsRegion = document.createElement("div");
    const historyRegion = document.createElement("div");

    for (const region of [recordsRegion, historyRegion]) {
      Object.defineProperty(region, "clientWidth", { value: 300 });
      Object.defineProperty(region, "scrollWidth", { value: 900 });
      region.addEventListener("wheel", (event) =>
        component.onTableWheel(event),
      );
    }

    const recordsWheel = new WheelEvent("wheel", {
      cancelable: true,
      deltaX: 80,
    });
    recordsRegion.dispatchEvent(recordsWheel);

    expect(recordsRegion.scrollLeft).toBe(80);
    expect(historyRegion.scrollLeft).toBe(0);
    expect(recordsWheel.defaultPrevented).toBe(true);

    const historyWheel = new WheelEvent("wheel", {
      cancelable: true,
      deltaX: 45,
    });
    historyRegion.dispatchEvent(historyWheel);

    expect(recordsRegion.scrollLeft).toBe(80);
    expect(historyRegion.scrollLeft).toBe(45);
    expect(historyWheel.defaultPrevented).toBe(true);

    const verticalWheel = new WheelEvent("wheel", {
      cancelable: true,
      deltaY: 60,
    });
    historyRegion.dispatchEvent(verticalWheel);

    expect(historyRegion.scrollLeft).toBe(45);
    expect(verticalWheel.defaultPrevented).toBe(false);
  });

  it("renders 100 API rows, 40 dynamic columns, and 100 expanded revisions", async () => {
    const response = createRecordsResponse(0, 100);
    const baseRecord = response.data.rows[0];
    const values = Object.fromEntries(
      Array.from({ length: 40 }, (_, index) => [
        `FIELD_${index + 1}`,
        `value-${index + 1}`,
      ]),
    );
    const longHistory = Array.from({ length: 100 }, (_, index) => ({
      sequenceNumber: index + 1,
      revision: 10_000 + index,
      revisionTypeCode: index === 0 ? 0 : 1,
      operation: index === 0 ? "INSERT" : "UPDATE",
      ...values,
    }));
    response.data.rows = Array.from({ length: 100 }, (_, index) => ({
      ...structuredClone(baseRecord),
      id: index + 1,
      originalData: { ID: index + 1, ...values },
      changeSummary: {
        ...baseRecord.changeSummary,
        totalRevisions: index === 0 ? 100 : 2,
      },
      auditHistory:
        index === 0 ? longHistory : structuredClone(baseRecord.auditHistory),
    }));
    response.data.numberOfElements = 100;
    response.data.totalElements = 100;
    response.data.totalPages = 1;
    response.data.hasNext = false;
    recordsResponseOverride = of(response);

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await selectTable(fixture, "Wide-Feature");
    component.toggleRow(1);
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(component.columns).toHaveLength(40);
    expect(element.querySelectorAll(".record-row")).toHaveLength(100);
    expect(element.querySelectorAll(".history-table tbody tr")).toHaveLength(
      100,
    );
    expect(element.querySelectorAll('.cell-value[tabindex="0"]')).toHaveLength(
      0,
    );
    expect(element.querySelector(".records-table-wrap")).not.toBeNull();
    expect(element.querySelector(".history-table-wrap")).not.toBeNull();
  });
});
