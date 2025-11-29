import { Timestamp } from 'firebase/firestore';

/**
 * Session Package Extension
 */
export interface SessionPackageExtension {
  trainerId: string;
  date: Timestamp;
  daysAdded: number;
  reason: string;
}

export interface SessionPackage {
  id: string;
  quantity: number;
  remaining: number;
  purchaseDate: number | Timestamp; // Timestamp as milliseconds or Firestore Timestamp
  expirationDate: number | Timestamp; // Timestamp as milliseconds or Firestore Timestamp
  expired: boolean;
  stripePaymentIntentId: string;
  stripePriceId: string;
  stripeProductId?: string;
  stripeProductName?: string; // Stripe product name stored at purchase time for historical accuracy
  amount?: number;
  extendedBy?: SessionPackageExtension;
}

/**
 * Session Balance
 */
export interface SessionBalance {
  available: number;
  purchased: number;
  used: number;
  expired: number;
  lastUpdated: Timestamp;
}

/**
 * Training Session Status
 */
export type SessionStatus = 'scheduled' | 'completed' | 'canceled' | 'no-show';
export type CanceledBy = 'client' | 'trainer';

/**
 * Training Session
 */
export interface TrainingSession {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  trainerId: string;
  locationId: string; // For public: training_locations doc ID, For private: "private"
  locationType: 'public' | 'private'; // Determines where to lookup address
  packageId: string;
  calendlyEventId: string;
  calendlyEventUri: string;
  scheduledDate: Timestamp;
  duration: number;
  status: SessionStatus;
  canceledBy?: CanceledBy;
  canceledAt?: Timestamp;
  cancelReason?: string;
  creditReturned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  notes?: string;
}

/**
 * Session Refund
 */
export type RefundStatus = 'pending' | 'approved' | 'completed' | 'rejected';

export interface SessionRefund {
  id: string;
  clientId: string;
  packageId: string;
  requestedBy: string;
  reason: string;
  sessionsRefunded: number;
  stripeRefundId: string;
  status: RefundStatus;
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
}

/**
 * API Request/Response Types
 */
export interface PurchaseSessionPackageRequest {
  userId: string;
  priceId: string;
}

export interface PurchaseSessionPackageResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface GetSessionBalanceRequest {
  userId: string;
}

export interface GetSessionBalanceResponse {
  available: number;
  packages: SessionPackage[];
  nextExpiration: number | null; // Timestamp as milliseconds
  upcomingExpirations: SessionPackage[];
}

export interface ScheduleSessionRequest {
  userId: string;
  calendlyEventId: string;
  eventDetails: {
    scheduledDate: Timestamp;
    duration: number;
    eventUri: string;
  };
}

export interface ScheduleSessionResponse {
  success: boolean;
  sessionId: string;
  remainingBalance: number;
}

export interface CancelSessionRequest {
  sessionId: string;
  canceledBy: CanceledBy;
  reason?: string;
}

export interface CancelSessionResponse {
  success: boolean;
  creditReturned: boolean;
}

export interface ExtendPackageExpirationRequest {
  userId: string;
  packageId: string;
  daysToAdd: number;
  reason: string;
  trainerId: string;
}

export interface ExtendPackageExpirationResponse {
  success: boolean;
  newExpirationDate: Timestamp;
}

/**
 * Calendly Webhook Types
 */
export interface CalendlyInvitee {
  email: string;
  name: string;
  uuid: string;
}

export interface CalendlyEvent {
  uuid: string;
  uri: string;
  start_time: string;
  end_time: string;
  name: string;
}

export interface CalendlyWebhookPayload {
  event: string;
  payload: {
    event: CalendlyEvent;
    invitee: CalendlyInvitee;
  };
}

/**
 * UI Component Props
 */
export interface SessionBalanceCardProps {
  balance: SessionBalance;
  packages: SessionPackage[];
  loading?: boolean;
}

export interface PurchaseHistoryProps {
  packages: SessionPackage[];
  loading?: boolean;
}

export interface UpcomingSessionsProps {
  sessions: TrainingSession[];
  onCancel: (sessionId: string) => void;
  loading?: boolean;
}

/**
 * Utility Types
 */
export interface SessionPackageWithStats extends SessionPackage {
  daysUntilExpiration: number;
  utilizationPercentage: number;
  isExpiringSoon: boolean;
}
