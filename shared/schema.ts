import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "event_manager", "organizer"]);

// Guest category enum
export const guestCategoryEnum = pgEnum("guest_category", ["vip", "regular", "media", "sponsor"]);

// Check-in status enum  
export const checkInStatusEnum = pgEnum("check_in_status", ["pending", "checked_in", "duplicate", "invalid"]);

// Users table - all system users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("organizer"),
  createdById: varchar("created_by_id"),
  eventQuota: integer("event_quota").default(5),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  eventManagerId: varchar("event_manager_id").notNull(),
  capacityTierId: varchar("capacity_tier_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Guests table
export const guests = pgTable("guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  category: guestCategoryEnum("category").default("regular"),
  companions: integer("companions").default(0),
  notes: text("notes"),
  qrCode: text("qr_code").notNull().unique(),
  isCheckedIn: boolean("is_checked_in").default(false),
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: varchar("checked_in_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event organizers assignment
export const eventOrganizers = pgTable("event_organizers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  organizerId: varchar("organizer_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Audit log table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id"),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  guestId: varchar("guest_id"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Site settings table for social media links
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  twitter: text("twitter"),
  linkedin: text("linkedin"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Capacity tiers table for event packages
export const capacityTiers = pgTable("capacity_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  minGuests: integer("min_guests").notNull().default(0),
  maxGuests: integer("max_guests"),
  isUnlimited: boolean("is_unlimited").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User capacity tier quotas - how many events of each tier a user can create
export const userTierQuotas = pgTable("user_tier_quotas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  capacityTierId: varchar("capacity_tier_id").notNull(),
  quota: integer("quota").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [users.createdById],
    references: [users.id],
  }),
  events: many(events),
  eventAssignments: many(eventOrganizers),
  auditLogs: many(auditLogs),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  eventManager: one(users, {
    fields: [events.eventManagerId],
    references: [users.id],
  }),
  guests: many(guests),
  organizers: many(eventOrganizers),
  auditLogs: many(auditLogs),
}));

export const guestsRelations = relations(guests, ({ one }) => ({
  event: one(events, {
    fields: [guests.eventId],
    references: [events.id],
  }),
  checkedInByUser: one(users, {
    fields: [guests.checkedInBy],
    references: [users.id],
  }),
}));

export const eventOrganizersRelations = relations(eventOrganizers, ({ one }) => ({
  event: one(events, {
    fields: [eventOrganizers.eventId],
    references: [events.id],
  }),
  organizer: one(users, {
    fields: [eventOrganizers.organizerId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  event: one(events, {
    fields: [auditLogs.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  guest: one(guests, {
    fields: [auditLogs.guestId],
    references: [guests.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  createdAt: true,
  checkedInAt: true,
  checkedInBy: true,
  isCheckedIn: true,
});

export const insertEventOrganizerSchema = createInsertSchema(eventOrganizers).omit({
  id: true,
  assignedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertCapacityTierSchema = createInsertSchema(capacityTiers).omit({
  id: true,
  createdAt: true,
});

export const insertUserTierQuotaSchema = createInsertSchema(userTierQuotas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guests.$inferSelect;

export type InsertEventOrganizer = z.infer<typeof insertEventOrganizerSchema>;
export type EventOrganizer = typeof eventOrganizers.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type SiteSettings = typeof siteSettings.$inferSelect;

export type InsertCapacityTier = z.infer<typeof insertCapacityTierSchema>;
export type CapacityTier = typeof capacityTiers.$inferSelect;

export type InsertUserTierQuota = z.infer<typeof insertUserTierQuotaSchema>;
export type UserTierQuota = typeof userTierQuotas.$inferSelect;

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginInput = z.infer<typeof loginSchema>;
