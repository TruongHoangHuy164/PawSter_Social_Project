import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './pages/App.jsx';
import './styles.css';

// Ensure default theme is light on initial load (override any saved dark preference)
try {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('dark');
} catch (e) {
  // ignore in environments where localStorage is unavailable
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
