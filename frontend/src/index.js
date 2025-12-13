import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Global error handler to catch unhandled errors
window.addEventListener('error', (event) => {
  // Suppress "Script error" messages which are usually CORS issues
  if (event.message === 'Script error.' || event.filename === '') {
    event.preventDefault();
    console.warn('Script error suppressed (likely CORS or external script issue)');
    return false;
  }
  console.error('Global error:', event.error || event.message);
  return true;
}, true);

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent default error handling
  event.preventDefault();
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

