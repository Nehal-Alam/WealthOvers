import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  boolean,
  timestamp,
  date,
  smallint,
  integer,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type_enum", [
  "savings",
  "current",
  "salary",
  "cash",
  "upi_wallet",
  "fixed_deposit",
  "recurring_deposit",
  "credit_card",
  "loan_account",
  "investment_demat",
  "other",
]);

export const transactionTypeEnum = pgEnum("transaction_type_enum", [
  "income",
  "expense",
  "transfer",
  "refund",
  "investment_buy",
  "investment_sell",
  "loan_disbursement",
  "loan_repayment",
]);

export const transactionSourceEnum = pgEnum("transaction_source_enum", [
  "manual",
  "csv_import",
  "xlsx_import",
  "pdf_import",
  "android_sms_sync",
  "notification_sync",
  "recurring_rule",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull().default(""),
  avatarUrl: text("avatar_url"),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  locale: varchar("locale", { length: 10 }).notNull().default("en-IN"),
  financialYearStartMonth: smallint("financial_year_start_month").notNull().default(4),
  timezone: varchar("timezone", { length: 50 }).notNull().default("Asia/Kolkata"),
  isPrivacyMode: boolean("is_privacy_mode").notNull().default(false),
  themePreference: varchar("theme_preference", { length: 10 }).notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  accountType: accountTypeEnum("account_type").notNull().default("savings"),
  institutionName: varchar("institution_name", { length: 100 }).notNull().default("Cash / Generic"),
  accountNumberMasked: varchar("account_number_masked", { length: 20 }),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  initialBalance: numeric("initial_balance", { precision: 15, scale: 4 }).notNull().default("0.0000"),
  currentBalance: numeric("current_balance", { precision: 15, scale: 4 }).notNull().default("0.0000"),
  color: varchar("color", { length: 20 }).notNull().default("#3B82F6"),
  icon: varchar("icon", { length: 50 }).notNull().default("Wallet"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull().default("Folder"),
  color: varchar("color", { length: 20 }).notNull().default("#6B7280"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  accountId: uuid("account_id").notNull(),
  destinationAccountId: uuid("destination_account_id"),
  categoryId: uuid("category_id"),
  subcategoryId: uuid("subcategory_id"),
  merchantId: uuid("merchant_id"),
  amount: numeric("amount", { precision: 15, scale: 4 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  description: text("description").notNull().default(""),
  notes: text("notes"),
  source: transactionSourceEnum("source").notNull().default("manual"),
  referenceNumber: varchar("reference_number", { length: 100 }),
  originalTransactionId: uuid("original_transaction_id"),
  idempotencyHash: varchar("idempotency_hash", { length: 64 }),
  isReviewed: boolean("is_reviewed").notNull().default(true),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

