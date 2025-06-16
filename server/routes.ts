import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertStoreSchema, insertRatingSchema, updatePasswordSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from 'bcrypt';

// Enhanced request type with user
interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    };
  };
}

// Simple auth middleware for local users
const authenticateLocal = async (req: Request, res: Response, next: any) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const user = await storage.getUserByEmail(email);
  if (!user || !user.password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Store user info in session
  (req as any).session.userId = user.id;
  (req as any).session.userRole = user.role;
  
  res.json({ 
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  });
};

// Session-based auth check
const requireAuth = async (req: Request, res: Response, next: any) => {
  const session = (req as any).session;
  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(session.userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }
  
  (req as any).currentUser = user;
  next();
};

const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: any) => {
    const user = (req as any).currentUser;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  const session = require('express-session');
  const MemoryStore = require('memorystore')(session);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  }));

  // Auth routes
  app.post('/api/auth/login', authenticateLocal);

  app.post('/api/auth/logout', (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', requireAuth, async (req, res) => {
    const user = (req as any).currentUser;
    res.json({
      id: user.id,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      role: user.role,
      address: user.address,
    });
  });

  // User registration (public)
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const user = await storage.createLocalUser({
        ...userData,
        role: 'normal', // Force normal role for registration
      });

      // Auto-login after registration
      (req as any).session.userId = user.id;
      (req as any).session.userRole = user.role;

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Password update
  app.put('/api/auth/password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);
      const user = (req as any).currentUser;
      
      const success = await storage.updatePassword(user.id, currentPassword, newPassword);
      if (!success) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Password update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard stats (admin only)
  app.get('/api/admin/stats', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management (admin only)
  app.get('/api/admin/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { role, search } = req.query;
      const users = await storage.getAllUsers({
        role: role as string,
        search: search as string,
      });
      res.json(users);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/admin/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const user = await storage.createLocalUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("User creation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put('/api/admin/users/:id/role', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'normal', 'store_owner'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await storage.updateUserRole(id, role);
      res.json(user);
    } catch (error) {
      console.error("Role update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/admin/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("User deletion error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Store management
  app.get('/api/stores', requireAuth, async (req, res) => {
    try {
      const { search, address } = req.query;
      const user = (req as any).currentUser;
      
      let stores = await storage.getAllStores({
        search: search as string,
        address: address as string,
      });

      // Add user rating for normal users
      if (user.role === 'normal') {
        for (const store of stores) {
          const userRating = await storage.getUserRatingForStore(user.id, store.id);
          store.userRating = userRating?.rating;
        }
      }

      res.json(stores);
    } catch (error) {
      console.error("Stores fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/admin/stores', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const storeData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(storeData);
      res.status(201).json(store);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Store creation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put('/api/admin/stores/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const storeData = insertStoreSchema.partial().parse(req.body);
      const store = await storage.updateStore(parseInt(id), storeData);
      res.json(store);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Store update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/admin/stores/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStore(parseInt(id));
      res.json({ message: "Store deleted successfully" });
    } catch (error) {
      console.error("Store deletion error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rating management
  app.post('/api/ratings', requireAuth, requireRole(['normal']), async (req, res) => {
    try {
      const user = (req as any).currentUser;
      const ratingData = insertRatingSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const rating = await storage.createOrUpdateRating(ratingData);
      res.json(rating);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Rating error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Store owner routes
  app.get('/api/store-owner/stores', requireAuth, requireRole(['store_owner']), async (req, res) => {
    try {
      const user = (req as any).currentUser;
      const stores = await storage.getStoresByOwner(user.id);
      res.json(stores);
    } catch (error) {
      console.error("Owner stores fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/store-owner/ratings/:storeId', requireAuth, requireRole(['store_owner']), async (req, res) => {
    try {
      const { storeId } = req.params;
      const user = (req as any).currentUser;
      
      // Verify store ownership
      const store = await storage.getStoreById(parseInt(storeId));
      if (!store || store.ownerId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const ratings = await storage.getRatingsByStore(parseInt(storeId));
      const stats = await storage.getStoreStats(parseInt(storeId));
      
      res.json({ ratings, stats });
    } catch (error) {
      console.error("Store ratings fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
