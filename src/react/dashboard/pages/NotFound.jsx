import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  const containerStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    textAlign: 'center',
    padding: '0 20px'
  };

  const headingStyles = {
    fontSize: '72px',
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: '20px'
  };

  const subheadingStyles = {
    fontSize: '24px',
    color: '#333',
    marginBottom: '30px'
  };

  const textStyles = {
    fontSize: '18px',
    color: '#666',
    maxWidth: '600px',
    marginBottom: '30px'
  };

  const linkStyles = {
    display: 'inline-block',
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  };

  return (
    <div style={containerStyles}>
      <h1 style={headingStyles}>404</h1>
      <h2 style={subheadingStyles}>Page Not Found</h2>
      <p style={textStyles}>
        Sorry, the page you're looking for doesn't exist or has been moved.
        Please check the URL or navigate back to the dashboard.
      </p>
      <Link to="/dashboard" style={linkStyles}>
        Return to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
