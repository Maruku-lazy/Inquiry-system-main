import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { UnseenProvider } from './context/UnseenContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ActiveInquiriesPage } from './pages/inquiries/ActiveInquiriesPage';
import { CompletedInquiriesPage } from './pages/inquiries/CompletedInquiriesPage';
import { CompletedYearPage } from './pages/inquiries/CompletedYearPage';
import { CompletedMonthPage } from './pages/inquiries/CompletedMonthPage';
import { DeletedInquiriesPage } from './pages/inquiries/DeletedInquiriesPage';
import { ActivityLogPage } from './pages/logs/ActivityLogPage';
import { InquiriesLogPage } from './pages/logs/InquiriesLogPage';
import { UsersPage } from './pages/UsersPage';
import { UserInformationPage } from './pages/UserInformationPage';
import { TeamChartPage } from './pages/TeamChartPage';
import { TeamManagementPage } from './pages/TeamManagementPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ContactsPage } from './pages/ContactsPage';
import { TasksRoute } from './pages/TasksRoute';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <UnseenProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Analytics — built by a teammate (Phase 3). Every role sees
              their own scope; admin/manager/leader can further filter by
              role via the in-page selector. */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TasksRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <ContactsPage />
              </ProtectedRoute>
            }
          />

          {/* Inquiries — every role, including admin (Phase 2). Visibility
              scoping happens server-side; the UI is identical across roles. */}
          <Route
            path="/inquiries"
            element={
              <ProtectedRoute>
                <Navigate to="/inquiries/active" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inquiries/active"
            element={
              <ProtectedRoute>
                <ActiveInquiriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inquiries/completed"
            element={
              <ProtectedRoute>
                <CompletedInquiriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inquiries/completed/:year"
            element={
              <ProtectedRoute>
                <CompletedYearPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inquiries/completed/:year/:month"
            element={
              <ProtectedRoute>
                <CompletedMonthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inquiries/deleted"
            element={
              <ProtectedRoute>
                <DeletedInquiriesPage />
              </ProtectedRoute>
            }
          />

          {/* Logs — admin only */}
          <Route
            path="/logs/activity"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ActivityLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs/inquiries"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InquiriesLogPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/information"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserInformationPage />
              </ProtectedRoute>
            }
          />

          {/* Organization — Team Chart is every role (scoped server-side);
              Team Management is manager-only. */}
          <Route
            path="/organization/chart"
            element={
              <ProtectedRoute>
                <TeamChartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/team-management"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <TeamManagementPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </UnseenProvider>
      </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
