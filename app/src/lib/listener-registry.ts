/**
 * Centralized Firestore Listener Registry
 * 
 * Manages all active Firestore listeners across the application.
 * Ensures proper cleanup before sign out to prevent permission errors.
 */

class ListenerRegistry {
  private listeners: Set<() => void> = new Set();

  /**
   * Register a Firestore listener for cleanup
   * @param unsubscribe - The unsubscribe function returned by onSnapshot
   */
  register(unsubscribe: () => void): void {
    this.listeners.add(unsubscribe);
  }

  /**
   * Unregister a specific listener
   * @param unsubscribe - The unsubscribe function to remove
   */
  unregister(unsubscribe: () => void): void {
    this.listeners.delete(unsubscribe);
  }

  /**
   * Cleanup all registered listeners
   * Called before sign out to prevent permission errors
   */
  cleanupAll(): void {
    console.log(`[ListenerRegistry] Cleaning up ${this.listeners.size} active listeners`);
    this.listeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('[ListenerRegistry] Error unsubscribing listener:', error);
      }
    });
    this.listeners.clear();
  }

  /**
   * Get count of active listeners (for debugging)
   */
  getActiveCount(): number {
    return this.listeners.size;
  }
}

// Singleton instance
export const listenerRegistry = new ListenerRegistry();

// Convenience exports
export const registerListener = (unsubscribe: () => void) => listenerRegistry.register(unsubscribe);
export const unregisterListener = (unsubscribe: () => void) => listenerRegistry.unregister(unsubscribe);
export const cleanupAllListeners = () => listenerRegistry.cleanupAll();
export const getActiveListenerCount = () => listenerRegistry.getActiveCount();
