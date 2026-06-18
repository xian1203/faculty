import {
  doc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { HonestySetting } from '../types';

/**
 * Realtime Settings Service
 * Handles real-time subscriptions to system settings using Firestore listeners
 */
export class RealtimeSettingsService {
  private static readonly COLLECTION = 'system_settings';
  private static readonly HONESTY_DOC = 'honesty_store';

  private static readonly DEFAULT_HONESTY_SETTINGS_BASE = {
    maxDebtLimit: 500,
    settlementDeadlineDays: 30,
    autoBlockOverdueAccounts: true,
    creditEligibility: ['Faculty'],
  };

  private static getDefaultHonestySetting(): HonestySetting {
    return {
      ...this.DEFAULT_HONESTY_SETTINGS_BASE,
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Subscribe to real-time Honesty System settings updates
   * Automatically returns default values if document doesn't exist
   * 
   * @param onUpdate Callback function called with updated settings
   * @param onError Optional callback for errors
   * @returns Unsubscribe function to stop listening
   */
  static subscribeToHonestySetting(
    onUpdate: (settings: HonestySetting) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    try {
      const docRef = doc(db, this.COLLECTION, this.HONESTY_DOC);

      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          try {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const defaults = this.DEFAULT_HONESTY_SETTINGS_BASE;
              const settings: HonestySetting = {
                maxDebtLimit: data.maxDebtLimit ?? defaults.maxDebtLimit,
                settlementDeadlineDays: data.settlementDeadlineDays ?? defaults.settlementDeadlineDays,
                autoBlockOverdueAccounts: data.autoBlockOverdueAccounts ?? defaults.autoBlockOverdueAccounts,
                creditEligibility: data.creditEligibility ?? defaults.creditEligibility,
                updatedAt: data.updatedAt || Timestamp.now(),
              };
              onUpdate(settings);
            } else {
              // Document doesn't exist, use defaults
              onUpdate(this.getDefaultHonestySetting());
            }
          } catch (error) {
            console.error('Error processing honesty settings snapshot:', error);
            if (onError) {
              onError(error instanceof Error ? error : new Error('Unknown error processing settings'));
            }
          }
        },
        (error) => {
          console.error('Error subscribing to honesty settings:', error);
          if (onError) {
            onError(error instanceof Error ? error : new Error('Failed to subscribe to settings'));
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up honesty settings subscription:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to setup subscription'));
      }
      // Return no-op unsubscribe function if setup fails
      return () => {};
    }
  }
}
