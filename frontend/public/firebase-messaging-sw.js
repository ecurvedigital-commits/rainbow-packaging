/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDwY3qXoyPdwtiUUg2_CVhDRoT52oK61Ko",
  authDomain: "rainbow-packaging.firebaseapp.com",
  projectId: "rainbow-packaging",
  storageBucket: "rainbow-packaging.firebasestorage.app",
  messagingSenderId: "765116435018",
  appId: "1:765116435018:web:edf5cdaa764189cc0374b3",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Background push notification handler when tab is closed or in background
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || '⚠️ Rainbow Packaging Alert';
  const body = payload.notification?.body || payload.data?.body || 'Pending stock requires attention.';
  const clickAction = payload.data?.click_action || '/approvals';

  const notificationOptions = {
    body,
    icon: '/rainbow-packaging-icon.png',
    badge: '/favicon.svg',
    tag: payload.data?.tag || 'stock-alert',
    data: {
      click_action: clickAction,
      ...payload.data,
    },
  };

  self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || '/approvals';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(clickAction) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

