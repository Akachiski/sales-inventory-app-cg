const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzRSAjArnfrr2Ct8SwmVZlXB1-Jpeo9MOWhfoqTJL34_czSqitHSFXzW4sN22y7JF8M/exec';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('Service Worker registered.', reg);
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

function saveOffline(action, data) {
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.add({ action, data, timestamp: new Date() });
}

function syncOfflineData() {
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
        if (res.ok) console.log(`Synced ${item.action}`);
      } catch (error) {
        console.warn('Sync failed, will retry:', error);
        return;
      }
    }
    store.clear();
  };
}