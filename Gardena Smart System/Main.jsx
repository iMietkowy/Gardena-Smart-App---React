import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './src/components/App';
import { AppProvider } from './src/context/AppContext';
import { NotificationProvider } from './src/context/NotificationContext'; 



const container = document.getElementById('app');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </NotificationProvider>
    </BrowserRouter>
  </React.StrictMode>
);