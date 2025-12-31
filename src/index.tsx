
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// التحقق من الأصل (Origin) لمنع أخطاء الـ Cross-Origin في بيئة Preview
if ("serviceWorker" in navigator && !window.location.hostname.includes('ai.studio')) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      // تجاهل أخطاء التسجيل في بيئات التطوير
      console.debug("ServiceWorker registration skipped or failed", err);
    });
  });
}

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
