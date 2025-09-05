import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Main layout styles
  const layoutStyles = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  };

  // Main content styles
  const contentStyles = {
    flex: 1,
    transition: 'margin-left 0.3s ease-in-out',
    marginLeft: sidebarCollapsed ? '80px' : '250px',
    padding: '80px 24px 24px 24px',
    position: 'relative'
  };

  return (
    <div style={layoutStyles} className="dashboard-layout">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        userProfile={userProfile}
      />
      <div style={contentStyles} className="dashboard-content">
        <TopBar 
          toggleSidebar={toggleSidebar} 
          sidebarCollapsed={sidebarCollapsed}
          userName={userProfile?.name || 'Client'}
        />
        <main>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
