import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ collapsed, userProfile }) => {
  const location = useLocation();
  
  // Menu items for dashboard
  const menuItems = [
    {
      title: 'Dashboard',
      icon: '📊',
      path: '/dashboard',
      exact: true
    },
    {
      title: 'My Progress',
      icon: '📈',
      path: '/dashboard/progress'
    },
    {
      title: 'Training Plan',
      icon: '🏋️',
      path: '/dashboard/plan'
    },
    {
      title: 'Sessions',
      icon: '📅',
      path: '/dashboard/sessions'
    },
    {
      title: 'My Profile',
      icon: '👤',
      path: '/dashboard/profile'
    },
    {
      title: 'Settings',
      icon: '⚙️',
      path: '/dashboard/settings'
    }
  ];

  // Sidebar styles
  const sidebarStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: collapsed ? '80px' : '250px',
    backgroundColor: '#333333',
    color: '#ffffff',
    transition: 'width 0.3s ease-in-out',
    zIndex: 200,
    boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
    overflowX: 'hidden',
    overflowY: 'auto'
  };

  const logoStyles = {
    display: 'flex',
    justifyContent: collapsed ? 'center' : 'flex-start',
    alignItems: 'center',
    padding: collapsed ? '20px 0' : '20px',
    borderBottom: '1px solid #444',
    height: '64px'
  };

  const logoTextStyles = {
    fontSize: '18px',
    fontWeight: 'bold',
    display: collapsed ? 'none' : 'block',
    whiteSpace: 'nowrap'
  };

  const logoIconStyles = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#4CAF50',
    color: 'white',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    marginRight: collapsed ? '0' : '10px',
    fontWeight: 'bold'
  };

  const menuStyles = {
    padding: collapsed ? '10px 0' : '20px 0'
  };

  const menuItemStyles = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    padding: collapsed ? '15px 0' : '12px 20px',
    marginBottom: '5px',
    color: isActive ? '#4CAF50' : '#f1f1f1',
    textDecoration: 'none',
    borderLeft: isActive ? '4px solid #4CAF50' : '4px solid transparent',
    backgroundColor: isActive ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
    justifyContent: collapsed ? 'center' : 'flex-start',
    transition: 'all 0.2s ease',
    borderRadius: '0 4px 4px 0'
  });

  const iconStyles = {
    fontSize: '18px',
    marginRight: collapsed ? '0' : '10px',
    width: '24px',
    height: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const userSectionStyles = {
    padding: collapsed ? '15px 0' : '15px 20px',
    borderTop: '1px solid #444',
    marginTop: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#333333'
  };

  const userAvatarStyles = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#4CAF50',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: collapsed ? '0' : '10px',
    fontSize: '16px',
    fontWeight: 'bold'
  };

  const userNameStyles = {
    display: collapsed ? 'none' : 'block',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  const userRoleStyles = {
    display: collapsed ? 'none' : 'block',
    fontSize: '12px',
    color: '#aaa',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  // Get initials from name for avatar
  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div style={sidebarStyles} className="sidebar">
      <div style={logoStyles} className="logo">
        <div style={logoIconStyles}>SF</div>
        <div style={logoTextStyles}>SHREY.FIT</div>
      </div>
      <div style={menuStyles} className="menu">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              style={menuItemStyles(isActive)} 
              className={`menu-item ${isActive ? 'active' : ''}`}
            >
              <span style={iconStyles}>{item.icon}</span>
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </div>
      <div style={userSectionStyles} className="user-section">
        <div style={userAvatarStyles}>
          {getInitials(userProfile?.name || 'Client')}
        </div>
        <div className="user-info">
          <div style={userNameStyles}>{userProfile?.name || 'Client'}</div>
          <div style={userRoleStyles}>{userProfile?.tier || 'Member'}</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
