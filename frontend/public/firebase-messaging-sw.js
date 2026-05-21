importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// To avoid hardcoding credentials in the SW, you can either hardcode them here
// or pass them via query parameters during registration. 
// For simplicity in scaffolding, we place a placeholder block.

const firebaseConfig = {
  apiKey: "AIzaSyCLKgHdUJgQP9rhXitM_IhnO--ThG5bI1I",
  authDomain: "cms-client-management.firebaseapp.com",
  projectId: "cms-client-management",
  storageBucket: "cms-client-management.firebasestorage.app",
  messagingSenderId: "634616624963",
  appId: "1:634616624963:web:bfc7c8fe574bc3a96ce1f6",
  measurementId: "G-QJELX71V6T"
};

try {
  if (firebaseConfig.apiKey !== "REPLACE_WITH_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function (payload) {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico',
        data: payload.data,
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (e) {
  console.log("Firebase SW init failed", e);
}
