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
    // نتحقق من أننا في بيئة إنتاج أو HTTPS لتجنب أخطاء المتصفح
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      navigator.serviceWorker.register("/sw.js").catch(err => {
        console.debug("Offline capability registration failed:", err);
      });
    }
  });
}
