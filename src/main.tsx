import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { register } from './serviceWorker';
import { ThemeProvider } from './components/ui/theme-provider';

// Initialize the application
const initApp = async () => {
  try {
    console.log('Initializing application...');
    
    const container = document.getElementById('root');

    if (!container) {
      throw new Error('Root element not found in the document');
    }

    const root = createRoot(container);

    root.render(
      <ThemeProvider defaultTheme="system">
        <App />
      </ThemeProvider>
    );

    // Register service worker for PWA capabilities
    register();
  } catch (error) {
    console.error('Error initializing application:', error);
    
    // Show error message to user
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 20px; font-family: system-ui, sans-serif;">
          <h1 style="color: #e11d48;">Application Error</h1>
          <p>There was a problem initializing the application. Please try refreshing the page.</p>
          <p>Technical details: ${error.message || 'Unknown error'}</p>
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button style="padding: 10px 20px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;" 
                    onclick="window.location.reload()">
              Refresh Page
            </button>
          </div>
        </div>
      `;
    }
  }
};

// Start the app
initApp();
