import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Additional fields for the store rating platform
  name: varchar("name", { length: 60 }),
  address: text("address"),
  password: varchar("password"), // For non-Replit users
  role: varchar("role", { length: 20 }).notNull().default("normal"), // 'admin', 'normal', 'store_owner'
});

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  email: varchar("email").notNull(),
  address: text("address").notNull(),
  ownerId: varchar("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: integer("store_id").notNull().references(() => stores.id),
  rating: integer("rating").notNull(), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.userId, table.storeId), // One rating per user per store
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedStores: many(stores),
  ratings: many(ratings),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, {
    fields: [stores.ownerId],
    references: [users.id],
  }),
  ratings: many(ratings),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
  store: one(stores, {
    fields: [ratings.storeId],
    references: [stores.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users, {
  name: z.string().min(20, "Name must be at least 20 characters").max(60, "Name must not exceed 60 characters"),
  email: z.string().email("Invalid email format"),
  address: z.string().max(400, "Address must not exceed 400 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(16, "Password must not exceed 16 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  role: z.enum(["admin", "normal", "store_owner"]),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertStoreSchema = createInsertSchema(stores, {
  name: z.string().min(1, "Store name is required").max(60, "Store name must not exceed 60 characters"),
  email: z.string().email("Invalid email format"),
  address: z.string().max(400, "Address must not exceed 400 characters"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings, {
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must not exceed 5"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(16, "Password must not exceed 16 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;
export type UpdatePassword = z.infer<typeof updatePasswordSchema>;

// Extended types with relations
export type StoreWithRating = Store & {
  averageRating: number;
  totalRatings: number;
  userRating?: number;
};

export type UserWithRole = User & {
  displayName: string;
};

export type RatingWithUser = Rating & {
  user: Pick<User, 'id' | 'name' | 'email'>;
};
