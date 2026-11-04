import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported, getToken } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: "AIzaSyDwY3qXoyPdwtiUUg2_CVhDRoT52oK61Ko",
  authDomain: "rainbow-packaging.firebaseapp.com",
  projectId: "rainbow-packaging",
  storageBucket: "rainbow-packaging.firebasestorage.app",
  messagingSenderId: "765116435018",
  appId: "1:765116435018:web:edf5cdaa764189cc0374b3",
  measurementId: "G-6HBDZ7ZWZX",
};

export const VAPID_KEY = "BJbWSbqxUfcUde87Jm-IvTl3k2uW6jntda1FN8m9pF3365Sy1yefirmQvqloFcnHhD74e2IbT3xs5viBYVCMSRU";

// Initialize Firebase App
export const firebaseApp = initializeApp(firebaseConfig);

// Initialize FCM Messaging asynchronously (safe for environments without Service Worker / Push support)
let messagingInstance = null;

export async function getMessagingClient() {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(firebaseApp);
      return messagingInstance;
    }
  } catch (err) {
    console.warn('Firebase Messaging not supported in this browser environment:', err.message);
  }
  return null;
}

/**
 * Safely fetches an FCM push token using the registered service worker.
 * Includes race timeout safeguards to prevent hanging on network or SW delays.
 * @returns {Promise<string | null>}
 */
export async function getFcmToken() {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return null;
    }
    if (Notification.permission !== 'granted') {
      return null;
    }

    const messaging = await getMessagingClient();
    if (!messaging) return null;

    // Register service worker if not already registered
    await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((e) => {
      console.warn('Service worker register warning:', e.message);
    });

    // Await active SW with a 4s timeout
    const swReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 4000)),
    ]).catch(() => null);

    // Retrieve FCM token with a 6s timeout
    const token = await Promise.race([
      getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg || undefined,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('FCM token retrieval timeout')), 6000)),
    ]);

    return token || null;
  } catch (err) {
    console.warn('FCM token acquisition note:', err.message);
    return null;
  }
}

/**
 * Retrieves FCM registration token ONLY if permission has already been granted.
 * Never prompts the user.
 * @returns {Promise<string | null>}
 */
export async function getStoredPushTokenSilently() {
  return getFcmToken();
}

/**
 * Requests browser push notification permission and retrieves device FCM registration token.
 * Called when user explicitly clicks 'Allow' on the permission prompt.
 * @returns {Promise<string | null>}
 */
export async function requestPushToken() {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    return await getFcmToken();
  } catch (err) {
    console.warn('Failed to retrieve FCM push token:', err);
    return null;
  }
}

