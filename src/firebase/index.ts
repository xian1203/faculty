/**
 * Firebase Services Index
 * Central export point for all Firebase services and utilities
 */

// Configuration
export { auth, db, app } from './config';

// Setup and Testing Utilities
export * from './test-connection';
export * from './setup-admin';

// Regular Services (one-time operations)
export { AuthService } from './services/auth.service';
export { UserService } from './services/user.service';
export { ProductService } from './services/product.service';
export { OrderService } from './services/order.service';
export { AnalyticsService } from './services/analytics.service';
export { TopupService } from './services/topup.service';
export { DebtService } from './services/debt.service';

// Media & Storage Services
export { CloudinaryService } from './services/cloudinary.service';

// Realtime Services (live data subscriptions)
export { RealtimeUserService } from './services/realtime-user.service';
export { RealtimeProductService } from './services/realtime-product.service';
export { RealtimeOrderService } from './services/realtime-order.service';
export { RealtimeAnalyticsService } from './services/realtime-analytics.service';
export { RealtimeDebtService } from './services/debt.service';
export { RealtimeTopupService } from './services/realtime-topup.service';
export { SettingsService } from './services/settings.service';
export { RealtimeSettingsService } from './services/realtime-settings.service';

// Types
export type {
  User,
  UserRole,
  Product,
  Order,
  OrderItem,
  DebtRecord,
  DebtTransaction,
  Analytics,
  ActivityLog,
  SystemSettings,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  CreateUserInput,
  UpdateUserInput,
  CreateProductInput,
  UpdateProductInput,
  CreateOrderInput,
  UpdateOrderInput,
  Topup,
  CreateTopupInput,
  UpdateTopupInput,
  AppNotification
} from './types';
