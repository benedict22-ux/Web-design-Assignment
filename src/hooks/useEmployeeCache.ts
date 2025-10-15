import { useState, useEffect } from 'react';

const DB_NAME = 'EmployeeDB';
const STORE_NAME = 'employees';
const PENDING_STORE_NAME = 'pending_operations';
const DB_VERSION = 2;

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  birth_date: string;
  salary: number;
  role: string;
  manager_id: string | null;
  manager?: {
    first_name: string;
    last_name: string;
  };
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('employee_number', 'employee_number', { unique: false });
        objectStore.createIndex('email', 'email', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(PENDING_STORE_NAME)) {
        const pendingStore = db.createObjectStore(PENDING_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const useEmployeeCache = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveToCache = async (employees: Employee[]) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing data
      store.clear();

      // Add all employees
      employees.forEach(employee => {
        store.put(employee);
      });

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const getFromCache = async (): Promise<Employee[]> => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error reading from cache:', error);
      return [];
    }
  };

  const clearCache = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await store.clear();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const addPendingOperation = async (operation: 'create' | 'update' | 'delete', employee: Employee) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([PENDING_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(PENDING_STORE_NAME);
      
      store.add({
        operation,
        employee,
        timestamp: Date.now()
      });

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error adding pending operation:', error);
    }
  };

  const getPendingOperations = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction([PENDING_STORE_NAME], 'readonly');
      const store = transaction.objectStore(PENDING_STORE_NAME);
      
      return new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting pending operations:', error);
      return [];
    }
  };

  const clearPendingOperations = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction([PENDING_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(PENDING_STORE_NAME);
      
      store.clear();

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error clearing pending operations:', error);
    }
  };

  const addToLocalDB = async (employee: Employee) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.put(employee);

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error adding to local DB:', error);
    }
  };

  const updateInLocalDB = async (employee: Employee) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.put(employee);

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error updating in local DB:', error);
    }
  };

  const deleteFromLocalDB = async (id: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.delete(id);

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error deleting from local DB:', error);
    }
  };

  return {
    saveToCache,
    getFromCache,
    clearCache,
    addPendingOperation,
    getPendingOperations,
    clearPendingOperations,
    addToLocalDB,
    updateInLocalDB,
    deleteFromLocalDB,
    isOnline
  };
};
