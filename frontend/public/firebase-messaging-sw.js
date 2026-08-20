importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// To avoid hardcoding credentials in the SW, you can either hardcode them here
// or pass them via query parameters during registration. 
// For simplicity in scaffolding, we place a placeholder block.

const firebaseConfig = {
  apiKey: "AIzaSyCvDHbrJYsfqoD90-MV6jJzpzo1PRdoArw",
  authDomain: "cms-nidhi.firebaseapp.com",
  projectId: "cms-nidhi",
  storageBucket: "cms-nidhi.firebasestorage.app",
  messagingSenderId: "93332335306",
  appId: "1:93332335306:web:ceb11852eb23b88dfe6233",
  measurementId: "G-W3Z7DPT8HM"
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
        icon: '/logo.png',
        data: payload.data,
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (e) {
  console.log("Firebase SW init failed", e);
}
