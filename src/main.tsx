
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

/**
 * وظيفة تسجيل الـ ServiceWorker بشكل احترافي لضمان أداء الأوفلاين
 */
const registerServiceWorker = async () => {
  if (typeof window !== 'undefined' && "serviceWorker" in navigator) {
    try {
      const isLocalhost = Boolean(
        window.location.hostname === 'localhost' ||
        window.location.hostname === '[::1]' ||
        window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
      );

      if (window.location.protocol === 'https:' || isLocalhost) {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  console.log("🚀 تحديث جديد للمنهج متاح؛ سيتم التفعيل في الزيارة القادمة.");
                } else {
                  console.log("✅ تم حفظ موارد المعلم الذكي للاستخدام أوفلاين بنجاح!");
                }
              }
            };
          }
        };
      }
    } catch (error) {
      console.error("Offline registration failed:", error);
    }
  }
};

window.addEventListener("load", registerServiceWorker);
