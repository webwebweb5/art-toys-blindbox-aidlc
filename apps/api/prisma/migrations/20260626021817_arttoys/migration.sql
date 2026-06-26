-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RarityTier" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'SECRET');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('SINGLE', 'MULTI_PULL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DropStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "tier" "MembershipTier" NOT NULL DEFAULT 'BRONZE',
    "tier_progress" INTEGER NOT NULL DEFAULT 0,
    "social_provider" "SocialProvider",
    "social_id" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "locked_until" TIMESTAMP(3),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "referral_code" TEXT NOT NULL,
    "referred_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "artist" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "price_per_box" DECIMAL(10,2) NOT NULL,
    "figure_count" INTEGER NOT NULL,
    "cover_image" TEXT NOT NULL,
    "status" "SeriesStatus" NOT NULL DEFAULT 'DRAFT',
    "pity_threshold" INTEGER NOT NULL DEFAULT 50,
    "pity_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 2.0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "figures" (
    "id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "image" TEXT NOT NULL,
    "rarity" "RarityTier" NOT NULL,
    "probability" DECIMAL(5,2) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "figures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "type" "OrderType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_records" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "figure_id" UUID NOT NULL,
    "rarity" "RarityTier" NOT NULL,
    "pity_count_at_pull" INTEGER NOT NULL,
    "revealed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pull_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pity_trackers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pity_trackers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "operating_hours" JSONB NOT NULL,
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_records" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "figure_id" UUID NOT NULL,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "picked_up" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pull_record_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "figure_id" UUID NOT NULL,
    "qr_token" TEXT NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "extended_once" BOOLEAN NOT NULL DEFAULT false,
    "redeemed_at" TIMESTAMP(3),
    "redeemed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" UUID NOT NULL,
    "figure_id" UUID NOT NULL,
    "from_branch_id" UUID NOT NULL,
    "to_branch_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'IN_TRANSIT',
    "initiated_by" UUID NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_events" (
    "id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "total_quantity" INTEGER NOT NULL,
    "remaining_quantity" INTEGER NOT NULL,
    "per_person_limit" INTEGER NOT NULL DEFAULT 1,
    "early_access_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_access_min_tier" "MembershipTier",
    "status" "DropStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drop_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_purchase_records" (
    "id" UUID NOT NULL,
    "drop_event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "drop_purchase_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_social_provider_social_id_key" ON "users"("social_provider", "social_id");

-- CreateIndex
CREATE INDEX "series_status_idx" ON "series"("status");

-- CreateIndex
CREATE INDEX "series_published_at_idx" ON "series"("published_at");

-- CreateIndex
CREATE INDEX "figures_series_id_idx" ON "figures"("series_id");

-- CreateIndex
CREATE INDEX "figures_series_id_rarity_idx" ON "figures"("series_id", "rarity");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripe_payment_intent_id_key" ON "orders"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_series_id_idx" ON "orders"("series_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "pull_records_user_id_series_id_idx" ON "pull_records"("user_id", "series_id");

-- CreateIndex
CREATE INDEX "pull_records_order_id_idx" ON "pull_records"("order_id");

-- CreateIndex
CREATE INDEX "pull_records_figure_id_idx" ON "pull_records"("figure_id");

-- CreateIndex
CREATE UNIQUE INDEX "pity_trackers_user_id_series_id_key" ON "pity_trackers"("user_id", "series_id");

-- CreateIndex
CREATE INDEX "branches_status_idx" ON "branches"("status");

-- CreateIndex
CREATE INDEX "stock_records_figure_id_idx" ON "stock_records"("figure_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_records_branch_id_figure_id_key" ON "stock_records"("branch_id", "figure_id");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_pull_record_id_key" ON "vouchers"("pull_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_qr_token_key" ON "vouchers"("qr_token");

-- CreateIndex
CREATE INDEX "vouchers_user_id_status_idx" ON "vouchers"("user_id", "status");

-- CreateIndex
CREATE INDEX "vouchers_branch_id_status_idx" ON "vouchers"("branch_id", "status");

-- CreateIndex
CREATE INDEX "vouchers_expires_at_idx" ON "vouchers"("expires_at");

-- CreateIndex
CREATE INDEX "stock_transfers_from_branch_id_idx" ON "stock_transfers"("from_branch_id");

-- CreateIndex
CREATE INDEX "stock_transfers_to_branch_id_idx" ON "stock_transfers"("to_branch_id");

-- CreateIndex
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");

-- CreateIndex
CREATE INDEX "drop_events_status_idx" ON "drop_events"("status");

-- CreateIndex
CREATE INDEX "drop_events_starts_at_idx" ON "drop_events"("starts_at");

-- CreateIndex
CREATE INDEX "drop_events_series_id_idx" ON "drop_events"("series_id");

-- CreateIndex
CREATE UNIQUE INDEX "drop_purchase_records_drop_event_id_user_id_key" ON "drop_purchase_records"("drop_event_id", "user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "figures" ADD CONSTRAINT "figures_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_records" ADD CONSTRAINT "pull_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_records" ADD CONSTRAINT "pull_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_records" ADD CONSTRAINT "pull_records_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_records" ADD CONSTRAINT "pull_records_figure_id_fkey" FOREIGN KEY ("figure_id") REFERENCES "figures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pity_trackers" ADD CONSTRAINT "pity_trackers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pity_trackers" ADD CONSTRAINT "pity_trackers_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_records" ADD CONSTRAINT "stock_records_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_records" ADD CONSTRAINT "stock_records_figure_id_fkey" FOREIGN KEY ("figure_id") REFERENCES "figures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_pull_record_id_fkey" FOREIGN KEY ("pull_record_id") REFERENCES "pull_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_figure_id_fkey" FOREIGN KEY ("figure_id") REFERENCES "figures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_figure_id_fkey" FOREIGN KEY ("figure_id") REFERENCES "figures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_events" ADD CONSTRAINT "drop_events_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_purchase_records" ADD CONSTRAINT "drop_purchase_records_drop_event_id_fkey" FOREIGN KEY ("drop_event_id") REFERENCES "drop_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_purchase_records" ADD CONSTRAINT "drop_purchase_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
