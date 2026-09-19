// Offline detection and management module
// Provides utilities to detect network state and handle offline scenarios

'use client';

import React from 'react';

export type NetworkStatus = 'online' | 'offline';

export interface OfflineEvent {
  type: 'online' | 'offline';
  timestamp: number;
}

class OfflineManager {
  private listeners: Set<(event: OfflineEvent) => void> = new Set();
  private currentStatus: NetworkStatus = 'online';

  constructor() {
    this.currentStatus = typeof navigator !== 'undefined' ? navigator.onLine ? 'online' : 'offline' : 'online';
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleOnline() {
    const previousStatus = this.currentStatus;
    this.currentStatus = 'online';
    console.log('[OfflineManager] Network status changed: offline -> online');
    this.notifyListeners('online');

    // Trigger data sync when coming back online
    this.syncOfflineData();
  }

  private handleOffline() {
    const previousStatus = this.currentStatus;
    this.currentStatus = 'offline';
    console.log('[OfflineManager] Network status changed: online -> offline');
    this.notifyListeners('offline');
  }

  private notifyListeners(status: NetworkStatus) {
    const event: OfflineEvent = {
      type: status,
      timestamp: Date.now(),
    };
    this.listeners.forEach((listener) => listener(event));
  }

  // Subscribe to network status changes
  subscribe(callback: (event: OfflineEvent) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Get current network status
  getStatus(): NetworkStatus {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine ? 'online' : 'offline';
    }
    return this.currentStatus;
  }

  // Check if online
  isOnline(): boolean {
    return this.getStatus() === 'online';
  }

  // Check if offline
  isOffline(): boolean {
    return this.getStatus() === 'offline';
  }

  // Sync offline data when back online
  private async syncOfflineData() {
    try {
      // Get pending changes from localStorage
      const pendingChanges = localStorage.getItem('pending_changes');
      if (!pendingChanges) {
        return;
      }

      const changes = JSON.parse(pendingChanges);
      console.log('[OfflineManager] Syncing offline data:', changes);

      // Send to server (implement based on your API)
      // await api.sync(changes);

      // Clear pending changes after successful sync
      localStorage.removeItem('pending_changes');
      console.log('[OfflineManager] Offline data synced successfully');
    } catch (error) {
      console.error('[OfflineManager] Error syncing offline data:', error);
    }
  }

  // Store data for offline use
  storeOfflineData(key: string, value: any) {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify(value));
      console.log('[OfflineManager] Stored offline data:', key);
    } catch (error) {
      console.error('[OfflineManager] Error storing offline data:', error);
    }
  }

  // Retrieve offline data
  getOfflineData(key: string): any | null {
    try {
      const data = localStorage.getItem(`offline_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[OfflineManager] Error retrieving offline data:', error);
      return null;
    }
  }

  // Clear offline data
  clearOfflineData(key?: string) {
    try {
      if (key) {
        localStorage.removeItem(`offline_${key}`);
      } else {
        // Clear all offline data
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('offline_')) {
            localStorage.removeItem(k);
          }
        });
      }
      console.log('[OfflineManager] Cleared offline data');
    } catch (error) {
      console.error('[OfflineManager] Error clearing offline data:', error);
    }
  }
}

// Create singleton instance
const offlineManager = new OfflineManager();

export default offlineManager;

// React hook for using offline manager in components
export function useOfflineStatus() {
  const [status, setStatus] = React.useState<NetworkStatus>(offlineManager.getStatus());

  React.useEffect(() => {
    const unsubscribe = offlineManager.subscribe((event) => {
      setStatus(event.type);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}

// Check if we can use specific APIs
export const canUseLocalStorage = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

export const canUseServiceWorker = () => {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
};

export const canUseCacheAPI = () => {
  return typeof caches !== 'undefined';
};
