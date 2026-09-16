import { Routes } from "@angular/router";

export const AUDIT_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/audit-view/audit-view.component").then(
        (component) => component.AuditViewComponent,
      ),
  },
];
