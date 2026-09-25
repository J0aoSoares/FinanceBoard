import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { RequireAdmin } from './auth/RequireAdmin';
import { AppLayout } from './components/layout/AppLayout';
import { SettingsLayout } from './components/layout/SettingsLayout';
import { LoginPage } from './features/auth/LoginPage';
import { BillsPage } from './features/bills/BillsPage';
import { CategoriesPage } from './features/categories/CategoriesPage';
import { CompaniesPage } from './features/companies/CompaniesPage';
import { InvoiceDetailPage } from './features/invoices/InvoiceDetailPage';
import { InvoicesPage } from './features/invoices/InvoicesPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage';
import { CashflowReportPage } from './features/reports/CashflowReportPage';
import { ProjectCostsReportPage } from './features/reports/ProjectCostsReportPage';
import { ReportsLayout } from './features/reports/ReportsLayout';
import { WithholdingsReportPage } from './features/reports/WithholdingsReportPage';
import { ReceivablesPage } from './features/receivables/ReceivablesPage';
import { SuppliersPage } from './features/suppliers/SuppliersPage';
import { UsersPage } from './features/users/UsersPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/bills" replace />} />
          <Route path="/bills" element={<BillsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/receivables" element={<ReceivablesPage />} />
          <Route path="/reports" element={<ReportsLayout />}>
            <Route index element={<CashflowReportPage />} />
            <Route path="cashflow" element={<CashflowReportPage />} />
            <Route path="withholdings" element={<WithholdingsReportPage />} />
            <Route path="project-costs" element={<ProjectCostsReportPage />} />
          </Route>
        </Route>

        <Route element={<SettingsLayout />}>
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/bills" replace />} />
    </Routes>
  );
}
