import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { HonestySetting } from '../types';

/**
 * Settings Service
 * Handles all system settings operations
 */
export class SettingsService {
  private static readonly COLLECTION = 'system_settings';
  private static readonly HONESTY_DOC = 'honesty_store';

  // Default values for Honesty System (without timestamp - added at runtime)
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
   * Load Honesty System settings
   * Returns default values if document doesn't exist
   */
  static async getHonestySetting(): Promise<HonestySetting> {
    try {
      const docRef = doc(db, this.COLLECTION, this.HONESTY_DOC);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const defaults = this.DEFAULT_HONESTY_SETTINGS_BASE;
        return {
          maxDebtLimit: data.maxDebtLimit ?? defaults.maxDebtLimit,
          settlementDeadlineDays: data.settlementDeadlineDays ?? defaults.settlementDeadlineDays,
          autoBlockOverdueAccounts: data.autoBlockOverdueAccounts ?? defaults.autoBlockOverdueAccounts,
          creditEligibility: data.creditEligibility ?? defaults.creditEligibility,
          updatedAt: data.updatedAt || Timestamp.now(),
        };
      }

      // Return default values if document doesn't exist
      return this.getDefaultHonestySetting();
    } catch (error) {
      console.error('Error fetching honesty settings:', error);
      // Return default values on error
      return this.getDefaultHonestySetting();
    }
  }

  /**
   * Save Honesty System settings
   * Creates or updates the document
   */
  static async saveHonestySetting(settings: Omit<HonestySetting, 'updatedAt'>): Promise<void> {
    try {
      // Validate inputs
      this.validateHonestySetting(settings);

      const docRef = doc(db, this.COLLECTION, this.HONESTY_DOC);
      const dataToSave = {
        ...settings,
        updatedAt: Timestamp.now(),
      };

      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        throw error;
      }
      console.error('Error saving honesty settings:', error);
      throw new Error('Failed to save honesty settings. Please try again.');
    }
  }

  /**
   * Validate Honesty System settings
   */
  private static validateHonestySetting(settings: Omit<HonestySetting, 'updatedAt'>): void {
    // Validate maxDebtLimit
    if (typeof settings.maxDebtLimit !== 'number' || settings.maxDebtLimit < 0) {
      throw new Error('Validation: Max Debt Limit must be a number >= 0');
    }

    // Validate settlementDeadlineDays
    if (typeof settings.settlementDeadlineDays !== 'number' || settings.settlementDeadlineDays <= 0) {
      throw new Error('Validation: Settlement Deadline must be a number > 0');
    }

    // Validate autoBlockOverdueAccounts
    if (typeof settings.autoBlockOverdueAccounts !== 'boolean') {
      throw new Error('Validation: Auto-block overdue accounts must be a boolean');
    }

    // Validate creditEligibility
    if (
      !Array.isArray(settings.creditEligibility) ||
      settings.creditEligibility.length === 0
    ) {
      throw new Error('Validation: Credit Eligibility must contain at least one role');
    }

    const validRoles = ['Faculty', 'Staff', 'Guest/Student'];
    for (const role of settings.creditEligibility) {
      if (!validRoles.includes(role)) {
        throw new Error(`Validation: Invalid role "${role}". Must be one of: ${validRoles.join(', ')}`);
      }
    }
  }
}
