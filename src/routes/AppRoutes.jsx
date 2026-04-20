import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";
import GuestRoutes from "./GuestRoutes";
import ProtectedRoutes from "./ProtectedRoutes";
import CompanyGuard from "./CompanyGuard";
import LoadingComponent from "../components/LoadingComponent";
import { useAuth } from "../contexts/AuthContext";
import MonthlyReconciliationReport from "../pages/MonthlyReconciliationReport";

// ==============================
// Lazy Loaded Pages
// ==============================

const TrialBalancePage = lazy(() => import("../pages/TrialBalancePage"));
const BalanceSheetPage = lazy(() => import("../pages/BalanceSheetPage"));
const HSNList = lazy(() => import("../pages/HSNList"));
const VendorPage = lazy(() => import("../pages/VendorPage"));
const PurchaseOrderPage = lazy(() => import("../pages/PurchaseOrderPage"));
const NotificationsPage = lazy(() => import("../pages/Notifications"));
const InvoiceData = lazy(() => import("../pages/InvoiceData"));
const ManualInvoicePage = lazy(() => import("../components/MaunalInvoicePage"));
const PurchaseOrderData = lazy(() => import("../pages/PurchaseOrderData"));
const CompanySelectionPage = lazy(
  () => import("../pages/CompanySelectionPage"),
);
const AccessDenied = lazy(() => import("../pages/AccessDenied"));
const CentralUserManagement = lazy(
  () => import("../pages/CentralUserManagement"),
);
const ManageEntity = lazy(() => import("../pages/ManageEntity"));
const DayBooks = lazy(() => import("../pages/DayBook"));
const JournalListPage = lazy(() => import("../pages/JournalListPage"));
const JournalExcelUploadPage = lazy(() => import("../pages/JournalExcelUploadPage"));
const ViewAllInvoices = lazy(() => import("../pages/ViewAllInvoices"));
const ClientPurchaseOrders = lazy(
  () => import("../pages/ClientPurchaseOrders"),
);
const VendorPurchaseOrders = lazy(
  () => import("../pages/VendorPurchaseOrders"),
);
const BulkPurchaseOrderPage = lazy(
  () => import("../pages/BulkPurchaseOrderPage"),
);
const BankReconciliationPage = lazy(
  () => import("../pages/BankReconciliationPage"),
);
const BulkInvoiceUploadPage = lazy(
  () => import("../pages/BulkInvoiceUploadPage"),
);
const TaxFlowReportPage = lazy(
  () => import("../pages/TaxFlowReportPage"),
);

// Already lazy in your code (keeping same)
const AuthPage = lazy(() => import("../pages/AuthPage"));
const HomePage = lazy(() => import("../pages/HomePage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const LedgerPage = lazy(() => import("../pages/LedgerPage"));
const JournalPage = lazy(() => import("../pages/JournalPage"));
const GroupPage = lazy(() => import("../pages/GroupPage"));
const ClientPage = lazy(() => import("../pages/ClientPage"));
const ProfitLossStatement = lazy(() => import("../pages/ProfitLossStatement"));
const SettingPage = lazy(() => import("../pages/SettingPage"));
const HSNPage = lazy(() => import("../pages/HSNList"));
const InvoiceGeneratorPage = lazy(
  () => import("../pages/InvoiceGeneratorPage"),
);

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<LoadingComponent fullPage />}>
      <Routes>
        {/* Guest */}
        <Route element={<GuestRoutes />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/accessDenied" element={<AccessDenied />} />
          </Route>
        </Route>

        {/* App (Auth + Company required) */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/company/select" element={<CompanySelectionPage />} />

          <Route element={<MainLayout />}>
            <Route path="/user-management" element={<CentralUserManagement />} />
            <Route path="/manageEntity" element={<ManageEntity />} />
          </Route>

          <Route element={<CompanyGuard />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />

              {/* Accounting */}
              <Route path="accounting">
                <Route path="group" element={<GroupPage />} />
                <Route path="account" element={<LedgerPage />} />
                <Route path="journals" element={<JournalPage />} />
                <Route path="journals/list" element={<JournalListPage />} />
                <Route path="journals/upload-excel" element={<JournalExcelUploadPage />} />
                <Route path="trial" element={<TrialBalancePage />} />
                <Route path="sheet" element={<BalanceSheetPage />} />
                <Route path="profit-loss" element={<ProfitLossStatement />} />
                <Route path="day-books" element={<DayBooks />} />
              </Route>

              <Route path="master-data">
                <Route path="client-details" element={<ClientPage />} />
                <Route path="vendor-details" element={<VendorPage />} />
                <Route path="hsn-codes" element={<HSNPage />} />
                <Route path="invoice" element={<InvoiceGeneratorPage />} />
                <Route path="manual-invoice" element={<ManualInvoicePage />} />
              </Route>

              <Route path="invoice-data" element={<InvoiceData />} />
              <Route
                path="invoice-data/viewall-invoices"
                element={<ViewAllInvoices />}
              />
              <Route
                path="invoice-data/bulk-upload"
                element={<BulkInvoiceUploadPage />}
              />
              <Route
                path="accounting/bank-reconciliation"
                element={<BankReconciliationPage />}
              />
              <Route path="accounting/bank-reconciliation/report" element={<MonthlyReconciliationReport />} />

              <Route path="purchase-order" element={<PurchaseOrderPage />} />
              <Route
                path="/purchaseorder-data/client/:clientId"
                element={<ClientPurchaseOrders />}
              />
              <Route
                path="/purchaseorder-data/vendor/:vendorId"
                element={<VendorPurchaseOrders />}
              />
              <Route
                path="purchase-order/bulk-po-upload"
                element={<BulkPurchaseOrderPage />}
              />

              <Route
                path="purchaseorder-data"
                element={<PurchaseOrderData />}
              />

              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reports/tax-flow" element={<TaxFlowReportPage />} />
              <Route path="settings" element={<SettingPage />} />
            </Route>
          </Route>
        </Route>

        {/* Owner-only */}
        <Route
          element={
            <ProtectedRoutes
              access={
                user?._id === user?.company?.owner ||
                user?.role === "superAdmin" ||
                user?.role === "admin"
              }
            />
          }
        >
          <Route element={<MainLayout />}>
            <Route path="admin-control" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
