import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/dashboard.css';

// Mount the React app
const container = document.getElementById('dashboard-root');
const root = createRoot(container);
root.render(<App />);
