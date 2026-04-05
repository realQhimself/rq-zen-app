const DB_NAME = 'zen-sutra-strokes';
const DB_VERSION = 1;
const STORE_NAME = 'strokes';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: ['sutraId', 'index'] });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStroke(sutraId, index, dataUrl) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ sutraId, index, dataUrl });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStroke(sutraId, index) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get([sutraId, index]);
    request.onsuccess = () => resolve(request.result?.dataUrl ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllStrokes(sutraId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const filtered = request.result
        .filter((r) => r.sutraId === sutraId)
        .sort((a, b) => a.index - b.index)
        .map(({ index, dataUrl }) => ({ index, dataUrl }));
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearStrokes(sutraId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      for (const item of request.result) {
        if (item.sutraId === sutraId) {
          store.delete([item.sutraId, item.index]);
        }
      }
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
