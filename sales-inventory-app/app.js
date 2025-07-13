console.log("✅ app.js has loaded");

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzRSAjArnfrr2Ct8SwmVZlXB1-Jpeo9MOWhfoqTJL34_czSqitHSFXzW4sN22y7JF8M/exec';

// Register service worker with relative path for GitHub Pages
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker registered:', reg.scope);
      })
      .catch(err => {
        console.error('Service Worker registration failed:', err);
      });
  });
}

// IndexedDB setup
const DB_NAME = 'InventoryAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingActions';

let db;
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = function (event) {
  db = event.target.result;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { autoIncrement: true });
  }
};

request.onsuccess = function (event) {
  db = event.target.result;
};

request.onerror = function (event) {
  console.error('IndexedDB error:', event.target.errorCode);
};

// Save offline action to IndexedDB
function saveOffline(action, data) {
  if (!db) {
    console.error('Database not initialized.');
    return;
  }
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.add({ action, data, timestamp: new Date() });
}

// Sync offline data to backend
function syncOfflineData() {
  if (!db) {
    console.error('Database not initialized.');
    return;
  }
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const getAll = store.getAll();

  getAll.onsuccess = async function () {
    const items = getAll.result;
    for (const item of items) {
      try {
        const res = await fetch(API_BASE_URL, {
          method: 'POST',
          body: JSON.stringify({ action: item.action, ...item.data }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          console.log(`Synced ${item.action}`);
        } else {
          console.warn(`Failed to sync ${item.action}:`, res.statusText);
          return;
        }
      } catch (error) {
        console.warn('Sync failed, will retry:', error);
        return;
      }
    }
    store.clear();
  };

  getAll.onerror = function(event) {
    console.error('Failed to retrieve offline data:', event.target.errorCode);
  };
}

window.syncOfflineData = syncOfflineData;
