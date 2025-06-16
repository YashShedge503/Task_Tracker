import {
  users,
  stores,
  ratings,
  type UpsertUser,
  type User,
  type InsertUser,
  type InsertStore,
  type Store,
  type InsertRating,
  type Rating,
  type StoreWithRating,
  type RatingWithUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and, or, ilike } from "drizzle-orm";
import bcrypt from 'bcrypt';

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations
  createLocalUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(filters?: { role?: string; search?: string }): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  
  // Store operations
  createStore(store: InsertStore): Promise<Store>;
  getAllStores(filters?: { search?: string; address?: string }): Promise<StoreWithRating[]>;
  getStoreById(id: number): Promise<Store | undefined>;
  getStoresByOwner(ownerId: string): Promise<Store[]>;
  updateStore(id: number, store: Partial<InsertStore>): Promise<Store>;
  deleteStore(id: number): Promise<void>;
  
  // Rating operations
  createOrUpdateRating(rating: InsertRating): Promise<Rating>;
  getRatingsByStore(storeId: number): Promise<RatingWithUser[]>;
  getUserRatingForStore(userId: string, storeId: number): Promise<Rating | undefined>;
  getStoreStats(storeId: number): Promise<{ averageRating: number; totalRatings: number }>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{ totalUsers: number; totalStores: number; totalRatings: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Additional user operations
  async createLocalUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(filters?: { role?: string; search?: string }): Promise<User[]> {
    let query = db.select().from(users);
    
    const conditions = [];
    if (filters?.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(users.name, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`),
        ilike(users.address, `%${filters.search}%`)
      ));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(asc(users.name));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user?.password) return false;
    
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return false;
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return true;
  }

  // Store operations
  async createStore(storeData: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values(storeData).returning();
    return store;
  }

  async getAllStores(filters?: { search?: string; address?: string }): Promise<StoreWithRating[]> {
    let query = db
      .select({
        id: stores.id,
        name: stores.name,
        email: stores.email,
        address: stores.address,
        ownerId: stores.ownerId,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt,
        averageRating: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`,
        totalRatings: sql<number>`COUNT(${ratings.id})`,
      })
      .from(stores)
      .leftJoin(ratings, eq(stores.id, ratings.storeId))
      .groupBy(stores.id);

    const conditions = [];
    if (filters?.search) {
      conditions.push(ilike(stores.name, `%${filters.search}%`));
    }
    if (filters?.address) {
      conditions.push(ilike(stores.address, `%${filters.address}%`));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(asc(stores.name));
    return results.map(r => ({
      ...r,
      averageRating: Number(r.averageRating) || 0,
      totalRatings: Number(r.totalRatings) || 0,
    }));
  }

  async getStoreById(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async getStoresByOwner(ownerId: string): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.ownerId, ownerId));
  }

  async updateStore(id: number, storeData: Partial<InsertStore>): Promise<Store> {
    const [store] = await db
      .update(stores)
      .set({ ...storeData, updatedAt: new Date() })
      .where(eq(stores.id, id))
      .returning();
    return store;
  }

  async deleteStore(id: number): Promise<void> {
    await db.delete(stores).where(eq(stores.id, id));
  }

  // Rating operations
  async createOrUpdateRating(ratingData: InsertRating): Promise<Rating> {
    const [rating] = await db
      .insert(ratings)
      .values(ratingData)
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.storeId],
        set: {
          rating: ratingData.rating,
          updatedAt: new Date(),
        },
      })
      .returning();
    return rating;
  }

  async getRatingsByStore(storeId: number): Promise<RatingWithUser[]> {
    return await db
      .select({
        id: ratings.id,
        userId: ratings.userId,
        storeId: ratings.storeId,
        rating: ratings.rating,
        createdAt: ratings.createdAt,
        updatedAt: ratings.updatedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(ratings)
      .innerJoin(users, eq(ratings.userId, users.id))
      .where(eq(ratings.storeId, storeId))
      .orderBy(desc(ratings.createdAt));
  }

  async getUserRatingForStore(userId: string, storeId: number): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.storeId, storeId)));
    return rating;
  }

  async getStoreStats(storeId: number): Promise<{ averageRating: number; totalRatings: number }> {
    const [result] = await db
      .select({
        averageRating: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`,
        totalRatings: sql<number>`COUNT(${ratings.id})`,
      })
      .from(ratings)
      .where(eq(ratings.storeId, storeId));

    return {
      averageRating: Number(result.averageRating) || 0,
      totalRatings: Number(result.totalRatings) || 0,
    };
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{ totalUsers: number; totalStores: number; totalRatings: number }> {
    const [userCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const [storeCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(stores);
    const [ratingCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(ratings);

    return {
      totalUsers: Number(userCount.count) || 0,
      totalStores: Number(storeCount.count) || 0,
      totalRatings: Number(ratingCount.count) || 0,
    };
  }
}

export const storage = new DatabaseStorage();
