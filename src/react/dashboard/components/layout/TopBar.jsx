import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const TopBar = ({ toggleSidebar, sidebarCollapsed, userName }) => {
  const { signOut } = useAuth();

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await signOut();
      window.location.href = '/account.html'; // Redirect to login page
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // TopBar styles
  const topBarStyles = {
    position: 'fixed',
    top: 0,
    right: 0,
    left: sidebarCollapsed ? '80px' : '250px',
    height: '64px',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 100,
    transition: 'left 0.3s ease-in-out'
  };

  const hamburgerStyles = {
    cursor: 'pointer',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '30px',
    height: '20px'
  };

  const barStyles = {
    height: '2px',
    width: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: '5px',
    transition: 'all 0.3s ease'
  };

  const userSectionStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const userGreetingStyles = {
    fontSize: '14px',
    color: '#666'
  };

  const userNameStyles = {
    fontWeight: 'bold',
    color: '#4CAF50'
  };

  const logoutButtonStyles = {
    background: 'transparent',
    border: '1px solid #4CAF50',
    color: '#4CAF50',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginLeft: '15px'
  };

  return (
    <div style={topBarStyles} className="topbar">
      <div style={hamburgerStyles} onClick={toggleSidebar} className="hamburger">
        <div style={barStyles}></div>
        <div style={barStyles}></div>
        <div style={barStyles}></div>
      </div>
      <div style={userSectionStyles} className="user-section">
        <div style={userGreetingStyles}>
          Welcome back, <span style={userNameStyles}>{userName}</span>
        </div>
        <button 
          style={logoutButtonStyles} 
          onClick={handleLogout}
          className="logout-btn"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default TopBar;
