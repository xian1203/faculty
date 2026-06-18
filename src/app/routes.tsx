import { createBrowserRouter } from "react-router";
import { LoginPage } from "./components/LoginPage";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardContent } from "./components/DashboardContent";
import { ProductsPage } from "./components/ProductsPage";
import { TransactionsPage } from "./components/TransactionsPage";
import { UserAccountsPage } from "./components/UserAccountsPage";
import { DebtManagementPage } from "./components/DebtManagementPage";
import { PaymentsPage } from "./components/PaymentsPage";
import { SystemAnalyticsPage } from "./components/SystemAnalyticsPage";
import { SettingsPage } from "./components/SettingsPage";
import {
  SettingsDashboard,
  SettingsProfile,
  SettingsUsers,
  SettingsHonesty,
  SettingsRfid,
  SettingsInventory,
  SettingsPos,
  SettingsNotifications,
  SettingsPreferences,
  SettingsSecurity,
  SettingsBackup
} from "./components/SettingsViews";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: DashboardContent },
      { path: "products", Component: ProductsPage },
      { path: "transactions", Component: TransactionsPage },
      { path: "user-accounts", Component: UserAccountsPage },
      { path: "debt", Component: DebtManagementPage },
      { path: "payments", Component: PaymentsPage },
      { path: "analytics", Component: SystemAnalyticsPage },
      {
        path: "settings",
        Component: SettingsPage,
        children: [
          { index: true, Component: SettingsDashboard },
          { path: "dashboard", Component: SettingsDashboard },
          { path: "profile", Component: SettingsProfile },
          { path: "users", Component: SettingsUsers },
          { path: "honesty", Component: SettingsHonesty },
          { path: "rfid", Component: SettingsRfid },
          { path: "inventory", Component: SettingsInventory },
          { path: "pos", Component: SettingsPos },
          { path: "notifications", Component: SettingsNotifications },
          { path: "preferences", Component: SettingsPreferences },
          { path: "security", Component: SettingsSecurity },
          { path: "backup", Component: SettingsBackup }
        ]
      },
    ],
  },
]);
