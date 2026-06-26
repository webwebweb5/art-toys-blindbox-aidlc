import {
  Role,
  MembershipTier,
  SocialProvider,
  SeriesStatus,
  RarityTier,
  OrderType,
  OrderStatus,
  VoucherStatus,
  BranchStatus,
  TransferStatus,
  DropStatus,
} from './enums';

export interface IUser {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string;
  role: Role;
  tier: MembershipTier;
  tierProgress: number;
  socialProvider: SocialProvider | null;
  socialId: string | null;
  emailVerified: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
  referralCode: string;
  referredBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISeries {
  id: string;
  name: string;
  artist: string;
  description: string | null;
  pricePerBox: number;
  figureCount: number;
  coverImage: string;
  status: SeriesStatus;
  pityThreshold: number;
  pityMultiplier: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFigure {
  id: string;
  seriesId: string;
  name: string;
  image: string;
  rarity: RarityTier;
  probability: number;
  sortOrder: number;
  createdAt: Date;
}

export interface IOrder {
  id: string;
  userId: string;
  seriesId: string;
  type: OrderType;
  quantity: number;
  totalAmount: number;
  stripePaymentIntentId: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPullRecord {
  id: string;
  orderId: string;
  userId: string;
  seriesId: string;
  figureId: string;
  rarity: RarityTier;
  pityCountAtPull: number;
  revealedAt: Date | null;
  createdAt: Date;
}

export interface IPityTracker {
  id: string;
  userId: string;
  seriesId: string;
  counter: number;
  updatedAt: Date;
}

export interface IBranch {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  operatingHours: Record<string, { open: string; close: string }>;
  status: BranchStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockRecord {
  id: string;
  branchId: string;
  figureId: string;
  available: number;
  reserved: number;
  pickedUp: number;
  updatedAt: Date;
}

export interface IVoucher {
  id: string;
  userId: string;
  pullRecordId: string;
  branchId: string;
  figureId: string;
  qrToken: string;
  status: VoucherStatus;
  expiresAt: Date;
  extendedOnce: boolean;
  redeemedAt: Date | null;
  redeemedBy: string | null;
  createdAt: Date;
}

export interface IStockTransfer {
  id: string;
  figureId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  status: TransferStatus;
  initiatedBy: string;
  completedAt: Date | null;
  createdAt: Date;
}

export interface IDropEvent {
  id: string;
  seriesId: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  totalQuantity: number;
  remainingQuantity: number;
  perPersonLimit: number;
  earlyAccessMinutes: number;
  earlyAccessMinTier: MembershipTier | null;
  status: DropStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDropPurchaseRecord {
  id: string;
  dropEventId: string;
  userId: string;
  purchaseCount: number;
}
