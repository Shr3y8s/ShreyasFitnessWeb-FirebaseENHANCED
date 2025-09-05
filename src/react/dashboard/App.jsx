import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoadingSpinner from './components/shared/LoadingSpinner';

// Use lazy loading for dashboard components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <Router basename="/">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

// Move routes inside a component that has access to AuthContext
const AppRoutes = () => {
  const { currentUser, loading } = useAuth();
  
  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return <LoadingSpinner />;
    }
    
    if (!currentUser) {
      return <Navigate to="/account.html" replace />;
    }
    
    return children;
  };
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route 
          path="/"
          element={
            <Navigate to="/dashboard" replace />
          }
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
