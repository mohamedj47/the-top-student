import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// تسجيل الـ ServiceWorker فقط في بيئة الإنتاج السحابية
if (typeof window !== 'undefined' && "serviceWorker" in navigator && window.location.hostname !== 'localhost') {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(err => {
      console.debug("ServiceWorker registration skipped", err);
    });
  });
}
