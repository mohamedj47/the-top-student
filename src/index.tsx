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

// تسجيل الـ ServiceWorker للعمل بدون إنترنت (PWA)
if (typeof window !== 'undefined' && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const isLocalhost = Boolean(
      window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    if (window.location.protocol === 'https:' || isLocalhost) {
      navigator.serviceWorker.register("/sw.js").catch(err => {
        console.debug("Offline capability registration failed:", err);
      });
    }
  });
}
