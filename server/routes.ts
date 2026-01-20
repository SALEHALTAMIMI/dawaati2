import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { randomBytes, createHash } from "crypto";

// Generate a secure, unique 12-character alphanumeric code
function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars: 0,O,1,I
  const bytes = randomBytes(12);
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  // Format: XXXX-XXXX-XXXX for readability
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}
import { insertUserSchema, insertEventSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import QRCode from "qrcode";

const upload = multer({ storage: multer.memoryStorage() });

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Password hashing utility
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "غير مصرح" });
  }
  next();
}

// Role hierarchy: super_admin > admin > event_manager > organizer
const roleHierarchy: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  event_manager: 2,
  organizer: 1,
};

// Check if user has minimum required role level
function hasMinRole(userRole: string, minRole: string): boolean {
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[minRole] || 0);
}

// Check if user can bypass ownership restrictions (admin and super_admin)
function canBypassOwnership(userRole: string): boolean {
  return userRole === "admin" || userRole === "super_admin";
}

// Role-based access control middleware
function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "غير مصرح" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "غير مسموح" });
    }
    (req as any).user = user;
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "event-management-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "بيانات ناقصة" });
      }

      const user = await storage.getUserByUsername(username);
      const hashedPassword = hashPassword(password);
      
      if (!user || user.password !== hashedPassword) {
        return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "الحساب غير مفعل" });
      }

      req.session.userId = user.id;
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "فشل تسجيل الخروج" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "غير مصرح" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }
    
    res.json({ ...user, password: undefined });
  });

  // User routes - Super Admin only for admins
  app.get("/api/users/admins", requireRole("super_admin"), async (req, res) => {
    try {
      const admins = await storage.getUsersByRole("admin");
      res.json(admins.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Event managers - Admin or Super Admin
  app.get("/api/users/event-managers", requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const managers = await storage.getUsersByRole("event_manager");
      res.json(managers.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Organizers - Event Manager only (their own organizers)
  app.get("/api/users/organizers", requireRole("event_manager", "super_admin", "admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      let organizers;
      if (user.role === "event_manager") {
        organizers = await storage.getUsersByCreator(user.id);
      } else {
        organizers = await storage.getUsersByRole("organizer");
      }
      res.json(organizers.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Create user - Role-based
  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) return res.status(401).json({ error: "غير مصرح" });

      const { role } = req.body;

      // Check permissions - admin can create all subordinate roles
      if (role === "admin" && currentUser.role !== "super_admin") {
        return res.status(403).json({ error: "غير مسموح" });
      }
      if (role === "event_manager" && !["super_admin", "admin"].includes(currentUser.role)) {
        return res.status(403).json({ error: "غير مسموح" });
      }
      if (role === "organizer" && !["super_admin", "admin", "event_manager"].includes(currentUser.role)) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      // Validate request
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "بيانات غير صالحة" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "اسم المستخدم مستخدم مسبقاً" });
      }

      const newUser = await storage.createUser({
        ...req.body,
        password: hashPassword(req.body.password),
        createdById: currentUser.id,
      });

      res.json({ ...newUser, password: undefined });
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء المستخدم" });
    }
  });

  // Update user
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) return res.status(401).json({ error: "غير مصرح" });

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ error: "المستخدم غير موجود" });

      // Permission check - super_admin can manage everyone, admin can manage subordinates
      const canUpdate =
        (currentUser.role === "super_admin" && targetUser.role !== "super_admin") ||
        (currentUser.role === "admin" && ["event_manager", "organizer"].includes(targetUser.role)) ||
        (currentUser.role === "event_manager" && targetUser.role === "organizer" && targetUser.createdById === currentUser.id);

      if (!canUpdate) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const { name, eventQuota } = req.body;
      const updateData: any = {};
      if (name) updateData.name = name;
      if (eventQuota !== undefined) updateData.eventQuota = eventQuota;

      // Handle password update if provided
      if (req.body.password && req.body.password.length >= 6) {
        updateData.password = hashPassword(req.body.password);
      }

      const updated = await storage.updateUser(req.params.id, updateData);
      res.json({ ...updated, password: undefined });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "خطأ في تحديث المستخدم" });
    }
  });

  // Toggle user active status
  app.patch("/api/users/:id/toggle-active", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) return res.status(401).json({ error: "غير مصرح" });

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ error: "المستخدم غير موجود" });

      // Prevent self-disable (lockout protection)
      if (targetUser.id === currentUser.id) {
        return res.status(403).json({ error: "لا يمكنك تعطيل حسابك الخاص" });
      }

      // Permission check - super_admin can toggle anyone except super_admin, admin can toggle subordinates
      const canToggle =
        (currentUser.role === "super_admin" && targetUser.role !== "super_admin") ||
        (currentUser.role === "admin" && ["event_manager", "organizer"].includes(targetUser.role)) ||
        (currentUser.role === "event_manager" && targetUser.role === "organizer" && targetUser.createdById === currentUser.id);

      if (!canToggle) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const updated = await storage.updateUser(req.params.id, {
        isActive: !targetUser.isActive,
      });
      res.json({ ...updated, password: undefined });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تغيير حالة المستخدم" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) return res.status(401).json({ error: "غير مصرح" });

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ error: "المستخدم غير موجود" });

      // Prevent self-delete (lockout protection)
      if (targetUser.id === currentUser.id) {
        return res.status(403).json({ error: "لا يمكنك حذف حسابك الخاص" });
      }

      // Permission check - super_admin can delete anyone except super_admin, admin can delete subordinates
      const canDelete =
        (currentUser.role === "super_admin" && targetUser.role !== "super_admin") ||
        (currentUser.role === "admin" && ["event_manager", "organizer"].includes(targetUser.role)) ||
        (currentUser.role === "event_manager" && targetUser.role === "organizer" && targetUser.createdById === currentUser.id);

      if (!canDelete) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ success: true, message: "تم حذف المستخدم بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في حذف المستخدم" });
    }
  });

  // Event routes - Event Manager role
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "غير مصرح" });

      let eventList;
      if (user.role === "event_manager") {
        eventList = await storage.getEventsByManager(user.id);
      } else if (user.role === "organizer") {
        eventList = await storage.getOrganizerEvents(user.id);
      } else {
        eventList = await storage.getEvents();
      }
      res.json(eventList);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب المناسبات" });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "غير مصرح" });

      // Check access - admin and super_admin can access all events
      if (!canBypassOwnership(user.role)) {
        if (user.role === "event_manager" && event.eventManagerId !== user.id) {
          return res.status(403).json({ error: "غير مسموح" });
        }
        if (user.role === "organizer") {
          const assignedEvents = await storage.getOrganizerEvents(user.id);
          if (!assignedEvents.some(e => e.id === event.id)) {
            return res.status(403).json({ error: "غير مسموح" });
          }
        }
      }

      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب المناسبة" });
    }
  });

  app.post("/api/events", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;

      // Validate capacity tier for event managers
      if (user.role === "event_manager" && !req.body.capacityTierId) {
        return res.status(400).json({ error: "يجب اختيار باقة سعة المناسبة" });
      }

      // If capacity tier provided, verify it exists
      if (req.body.capacityTierId) {
        const tier = await storage.getCapacityTier(req.body.capacityTierId);
        if (!tier || !tier.isActive) {
          return res.status(400).json({ error: "باقة السعة غير صالحة" });
        }
        
        // Check tier-specific quota for event managers
        if (user.role === "event_manager") {
          const userTierQuotas = await storage.getUserTierQuotas(user.id);
          const tierQuota = userTierQuotas.find(q => String(q.capacityTierId) === String(req.body.capacityTierId));
          const quota = tierQuota?.quota || 0;
          
          if (quota === 0) {
            return res.status(403).json({ 
              error: `ليس لديك صلاحية إنشاء مناسبات من باقة "${tier.name}". تواصل مع مالك النظام.` 
            });
          }
          
          const tierEventCount = await storage.getEventCountByManagerAndTier(user.id, req.body.capacityTierId);
          if (tierEventCount >= quota) {
            return res.status(403).json({ 
              error: `لقد وصلت للحد الأقصى من باقة "${tier.name}" (${quota}). تواصل مع مالك النظام لزيادة حصتك.` 
            });
          }
        }
      }

      // Parse date string to Date object
      const eventData = {
        ...req.body,
        eventManagerId: user.id,
        date: req.body.date ? new Date(req.body.date) : undefined,
        isActive: true,
      };

      // Validate required fields
      if (!eventData.name || !eventData.date) {
        return res.status(400).json({ error: "اسم المناسبة والتاريخ مطلوبان" });
      }

      const event = await storage.createEvent(eventData);

      await storage.createAuditLog({
        eventId: event.id,
        userId: user.id,
        action: "create_event",
        details: `تم إنشاء المناسبة: ${event.name}`,
      });

      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء المناسبة" });
    }
  });

  app.patch("/api/events/:id", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }

      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const updateData = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };

      const updated = await storage.updateEvent(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ error: "خطأ في تحديث المناسبة" });
    }
  });

  app.delete("/api/events/:id", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }

      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await storage.deleteEvent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطأ في حذف المناسبة" });
    }
  });

  // Guest routes
  app.get("/api/events/:id/guests", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "غير مصرح" });

      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "المناسبة غير موجودة" });

      // Check access - admin and super_admin bypass ownership
      if (!canBypassOwnership(user.role) && user.role === "event_manager" && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const guests = await storage.getGuestsByEvent(req.params.id);
      res.json(guests);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الضيوف" });
    }
  });

  app.post("/api/events/:id/upload-guests", requireRole("event_manager", "admin", "super_admin"), upload.single("file"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "لم يتم رفع ملف" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

      // Check capacity limit if event has a capacity tier
      let maxAllowedGuests = Infinity;
      if (event.capacityTierId) {
        const tier = await storage.getCapacityTier(event.capacityTierId);
        if (tier && !tier.isUnlimited && tier.maxGuests) {
          const currentGuests = await storage.getGuestsByEvent(req.params.id);
          const remainingCapacity = tier.maxGuests - currentGuests.length;
          if (remainingCapacity <= 0) {
            return res.status(403).json({ 
              error: `لقد وصلت للحد الأقصى من الضيوف لهذه المناسبة (${tier.maxGuests}). يمكنك ترقية باقة السعة.` 
            });
          }
          maxAllowedGuests = remainingCapacity;
        }
      }

      let guestsToCreate = data.map((row) => ({
        eventId: req.params.id,
        name: String(row["الاسم"] || row["Name"] || row["name"] || ""),
        phone: String(row["الجوال"] || row["Phone"] || row["phone"] || ""),
        category: ((row["الفئة"] || row["Category"] || "regular").toString().toLowerCase()) as any,
        companions: parseInt(row["عدد المرافقين"] || row["Companions"] || "0") || 0,
        notes: String(row["ملاحظات"] || row["Notes"] || ""),
        qrCode: generateAccessCode(),
      }));

      // Limit guests to remaining capacity
      let limitedMessage = "";
      if (guestsToCreate.length > maxAllowedGuests) {
        const originalCount = guestsToCreate.length;
        guestsToCreate = guestsToCreate.slice(0, maxAllowedGuests);
        limitedMessage = ` (تم إضافة ${guestsToCreate.length} فقط من ${originalCount} بسبب حد السعة)`;
      }

      const createdGuests = await storage.createGuests(guestsToCreate);

      await storage.createAuditLog({
        eventId: req.params.id,
        userId: user.id,
        action: "upload_guests",
        details: `تم رفع ${createdGuests.length} ضيف`,
      });

      res.json({ count: createdGuests.length, guests: createdGuests });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "خطأ في معالجة الملف" });
    }
  });

  // Add single guest
  app.post("/api/events/:id/guests", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      // Check capacity limit if event has a capacity tier
      if (event.capacityTierId) {
        const tier = await storage.getCapacityTier(event.capacityTierId);
        if (tier && !tier.isUnlimited && tier.maxGuests) {
          const currentGuests = await storage.getGuestsByEvent(req.params.id);
          if (currentGuests.length >= tier.maxGuests) {
            return res.status(403).json({ 
              error: `لقد وصلت للحد الأقصى من الضيوف لهذه المناسبة (${tier.maxGuests}). يمكنك ترقية باقة السعة.` 
            });
          }
        }
      }

      const { name, phone, category, companions, notes } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "اسم الضيف مطلوب" });
      }

      const guest = await storage.createGuest({
        eventId: req.params.id,
        name: name.trim(),
        phone: phone || "",
        category: category || "regular",
        companions: companions || 0,
        notes: notes || "",
        qrCode: generateAccessCode(),
      });

      await storage.createAuditLog({
        eventId: req.params.id,
        userId: user.id,
        action: "add_guest",
        details: `تم إضافة ضيف: ${guest.name}`,
        guestId: guest.id,
      });

      res.json(guest);
    } catch (error) {
      console.error("Add guest error:", error);
      res.status(500).json({ error: "خطأ في إضافة الضيف" });
    }
  });

  app.post("/api/guests/:id/check-in", requireRole("organizer", "event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const guest = await storage.getGuest(req.params.id);
      
      if (!guest) {
        return res.status(404).json({
          status: "invalid",
          message: "الضيف غير موجود",
        });
      }

      // Verify access to this event
      if (user.role === "organizer") {
        const assignedEvents = await storage.getOrganizerEvents(user.id);
        if (!assignedEvents.some(e => e.id === guest.eventId)) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      } else if (user.role === "event_manager") {
        const event = await storage.getEvent(guest.eventId);
        if (!event || event.eventManagerId !== user.id) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      }

      if (guest.isCheckedIn) {
        const checkedInByUser = guest.checkedInBy
          ? await storage.getUser(guest.checkedInBy)
          : null;
        return res.json({
          status: "duplicate",
          guest,
          message: "تم استخدام هذه الدعوة مسبقاً!",
          checkedInAt: guest.checkedInAt,
          checkedInBy: checkedInByUser?.name || "غير معروف",
        });
      }

      const updatedGuest = await storage.checkInGuest(req.params.id, user.id);

      await storage.createAuditLog({
        eventId: guest.eventId,
        userId: user.id,
        action: "check_in",
        details: `تم تسجيل حضور: ${guest.name}`,
        guestId: guest.id,
      });

      res.json({
        status: "success",
        guest: updatedGuest,
        message: "تم تسجيل الحضور بنجاح",
      });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تسجيل الحضور" });
    }
  });

  // Get single guest
  app.get("/api/guests/:id", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const guest = await storage.getGuest(req.params.id);
      
      if (!guest) {
        return res.status(404).json({ error: "الضيف غير موجود" });
      }

      const event = await storage.getEvent(guest.eventId);
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      res.json(guest);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب بيانات الضيف" });
    }
  });

  // Update guest
  app.patch("/api/guests/:id", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const guest = await storage.getGuest(req.params.id);
      
      if (!guest) {
        return res.status(404).json({ error: "الضيف غير موجود" });
      }

      const event = await storage.getEvent(guest.eventId);
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const { name, phone, category, companions, notes } = req.body;
      const updated = await storage.updateGuest(req.params.id, {
        name,
        phone,
        category,
        companions,
        notes,
      });

      await storage.createAuditLog({
        eventId: guest.eventId,
        userId: user.id,
        action: "update_guest",
        details: `تم تعديل ضيف: ${guest.name}`,
        guestId: guest.id,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "خطأ في تحديث الضيف" });
    }
  });

  // Delete guest
  app.delete("/api/guests/:id", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const guest = await storage.getGuest(req.params.id);
      
      if (!guest) {
        return res.status(404).json({ error: "الضيف غير موجود" });
      }

      const event = await storage.getEvent(guest.eventId);
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await storage.deleteGuest(req.params.id);

      await storage.createAuditLog({
        eventId: guest.eventId,
        userId: user.id,
        action: "delete_guest",
        details: `تم حذف ضيف: ${guest.name}`,
        guestId: guest.id,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطأ في حذف الضيف" });
    }
  });

  // Organizer events
  app.get("/api/organizer/events", requireRole("organizer", "event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;

      if (user.role === "organizer") {
        const events = await storage.getOrganizerEvents(user.id);
        res.json(events);
      } else if (canBypassOwnership(user.role)) {
        // Admin and super_admin see all events
        const events = await storage.getEvents();
        res.json(events);
      } else {
        const events = await storage.getEventsByManager(user.id);
        res.json(events);
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب المناسبات" });
    }
  });

  // Event organizers management
  app.get("/api/events/:id/organizers", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "غير مصرح" });

      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "المناسبة غير موجودة" });

      // Check access - admin/super_admin bypass, event manager owns event, or organizer is assigned
      if (!canBypassOwnership(user.role)) {
        if (user.role === "event_manager" && event.eventManagerId !== user.id) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      }
      if (user.role === "organizer") {
        const assignedEvents = await storage.getOrganizerEvents(user.id);
        if (!assignedEvents.some(e => e.id === event.id)) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      }

      const organizers = await storage.getEventOrganizers(req.params.id);
      res.json(organizers.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب المنظمين" });
    }
  });

  app.post("/api/events/:id/organizers", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const { organizerId } = req.body;
      
      // Event manager can only assign organizers they created
      if (user.role === "event_manager") {
        const organizer = await storage.getUser(organizerId);
        if (!organizer || organizer.createdById !== user.id) {
          return res.status(403).json({ error: "لا يمكنك تعيين منظم لم تقم بإنشائه" });
        }
      }
      
      const assignment = await storage.assignOrganizer({
        eventId: req.params.id,
        organizerId,
      });
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "خطأ في تعيين المنظم" });
    }
  });

  app.delete("/api/events/:id/organizers/:organizerId", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await storage.removeOrganizer(req.params.id, req.params.organizerId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطأ في إزالة المنظم" });
    }
  });

  // Audit logs - Event manager only
  app.get("/api/events/:id/audit-logs", requireRole("event_manager", "super_admin", "admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) return res.status(404).json({ error: "المناسبة غير موجودة" });

      // Event manager can only see their own event logs
      if (user.role === "event_manager" && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const logs = await storage.getAuditLogsByEvent(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب السجلات" });
    }
  });

  // Stats routes - Role-based
  app.get("/api/stats/super-admin", requireRole("super_admin"), async (req, res) => {
    try {
      const stats = await storage.getStats("super_admin");
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الإحصائيات" });
    }
  });

  app.get("/api/stats/admin", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const stats = await storage.getStats("admin");
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الإحصائيات" });
    }
  });

  app.get("/api/stats/event-manager", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const stats = await storage.getStats("event_manager", user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الإحصائيات" });
    }
  });

  app.get("/api/stats/comprehensive", requireRole("super_admin"), async (req, res) => {
    try {
      const stats = await storage.getComprehensiveStats();
      res.json(stats);
    } catch (error) {
      console.error("Comprehensive stats error:", error);
      res.status(500).json({ error: "خطأ في جلب الإحصائيات التفصيلية" });
    }
  });

  // Export guests to Excel with access codes
  app.get("/api/events/:id/export-guests", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const guests = await storage.getGuestsByEvent(req.params.id);

      if (guests.length === 0) {
        return res.status(400).json({ error: "لا يوجد مدعوين للتصدير" });
      }

      const categoryLabels: Record<string, string> = {
        vip: "VIP",
        regular: "عادي",
        media: "إعلام",
        sponsor: "راعي",
      };

      // Prepare data for Excel
      const excelData = guests.map((guest, index) => ({
        "#": index + 1,
        "الاسم": guest.name,
        "الجوال": guest.phone || "",
        "الفئة": categoryLabels[guest.category || "regular"],
        "عدد المرافقين": guest.companions || 0,
        "ملاحظات": guest.notes || "",
        "كود الدخول": guest.qrCode,
        "الحالة": guest.isCheckedIn ? "حاضر" : "لم يحضر",
      }));

      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      worksheet["!cols"] = [
        { wch: 5 },   // #
        { wch: 25 },  // الاسم
        { wch: 15 },  // الجوال
        { wch: 10 },  // الفئة
        { wch: 12 },  // عدد المرافقين
        { wch: 30 },  // ملاحظات
        { wch: 18 },  // كود الدخول
        { wch: 12 },  // الحالة
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "المدعوين");

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      // Set headers for file download
      const filename = encodeURIComponent(`مدعوين-${event.name}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${filename}`);
      res.setHeader("Content-Length", buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "خطأ في تصدير البيانات" });
    }
  });

  // Reports download endpoints
  app.get("/api/events/:id/reports/:type", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const reportType = req.params.type as "attendance" | "absence" | "audit";
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      if (!canBypassOwnership(user.role) && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const categoryLabels: Record<string, string> = {
        vip: "VIP",
        regular: "عادي",
        media: "إعلام",
        sponsor: "راعي",
      };

      let excelData: any[] = [];
      let sheetName = "";

      if (reportType === "attendance" || reportType === "absence") {
        const guests = await storage.getGuestsByEvent(req.params.id);
        const filteredGuests = guests.filter(g => 
          reportType === "attendance" ? g.isCheckedIn : !g.isCheckedIn
        );

        if (filteredGuests.length === 0) {
          return res.status(400).json({ 
            error: reportType === "attendance" 
              ? "لا يوجد حضور لتصديره" 
              : "لا يوجد غياب لتصديره" 
          });
        }

        excelData = filteredGuests.map((guest, index) => ({
          "#": index + 1,
          "الاسم": guest.name,
          "الجوال": guest.phone || "",
          "الفئة": categoryLabels[guest.category || "regular"],
          "عدد المرافقين": guest.companions || 0,
          "ملاحظات": guest.notes || "",
          ...(reportType === "attendance" ? {
            "وقت الحضور": guest.checkedInAt 
              ? new Date(guest.checkedInAt).toLocaleString("ar-SA")
              : "",
          } : {}),
        }));
        sheetName = reportType === "attendance" ? "الحضور" : "الغياب";
      } else if (reportType === "audit") {
        const logs = await storage.getAuditLogsByEvent(req.params.id);

        if (logs.length === 0) {
          return res.status(400).json({ error: "لا يوجد سجلات لتصديرها" });
        }

        const actionLabels: Record<string, string> = {
          check_in: "تسجيل حضور",
          upload_guests: "رفع ضيوف",
          add_guest: "إضافة ضيف",
          delete_guest: "حذف ضيف",
          assign_organizer: "تعيين منظم",
          remove_organizer: "إزالة منظم",
        };

        excelData = await Promise.all(logs.map(async (log, index) => {
          const logUser = await storage.getUser(log.userId);
          return {
            "#": index + 1,
            "التاريخ": log.timestamp ? new Date(log.timestamp).toLocaleString("ar-SA") : "",
            "المستخدم": logUser?.name || "غير معروف",
            "العملية": actionLabels[log.action] || log.action,
            "التفاصيل": log.details || "",
          };
        }));
        sheetName = "سجل العمليات";
      } else {
        return res.status(400).json({ error: "نوع التقرير غير صالح" });
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const reportNames: Record<string, string> = {
        attendance: "تقرير-الحضور",
        absence: "تقرير-الغياب",
        audit: "سجل-العمليات",
      };
      const filename = encodeURIComponent(`${reportNames[reportType]}-${event.name}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${filename}`);
      res.setHeader("Content-Length", buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error("Report error:", error);
      res.status(500).json({ error: "خطأ في تحميل التقرير" });
    }
  });

  // Check-in by text code (QR scanner reads the code directly)
  app.post("/api/check-in/code", requireRole("organizer", "event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const { code, eventId } = req.body;

      if (!code) {
        return res.status(400).json({ status: "invalid", message: "الكود مطلوب" });
      }

      // Find guest by QR code
      const guest = await storage.getGuestByQrCode(code.toUpperCase());
      if (!guest) {
        return res.status(404).json({ status: "invalid", message: "الكود غير صالح أو غير موجود" });
      }

      // Verify guest belongs to the selected event
      if (eventId && guest.eventId !== eventId) {
        return res.status(400).json({ status: "invalid", message: "هذا الكود ليس لهذه المناسبة" });
      }

      // Verify access to the event
      if (user.role === "organizer") {
        const assignedEvents = await storage.getOrganizerEvents(user.id);
        if (!assignedEvents.some(e => e.id === guest.eventId)) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      } else if (user.role === "event_manager") {
        const event = await storage.getEvent(guest.eventId);
        if (!event || event.eventManagerId !== user.id) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      }

      if (guest.isCheckedIn) {
        const checkedInByUser = guest.checkedInBy
          ? await storage.getUser(guest.checkedInBy)
          : null;
        return res.json({
          status: "duplicate",
          guest,
          message: "تم استخدام هذه الدعوة مسبقاً!",
          checkedInAt: guest.checkedInAt,
          checkedInBy: checkedInByUser?.name || "غير معروف",
        });
      }

      const updatedGuest = await storage.checkInGuest(guest.id, user.id);

      await storage.createAuditLog({
        eventId: guest.eventId,
        userId: user.id,
        action: "check_in",
        details: `تم تسجيل حضور عبر المسح: ${guest.name}`,
        guestId: guest.id,
      });

      res.json({
        status: "success",
        guest: updatedGuest,
        message: "تم تسجيل الحضور بنجاح",
      });
    } catch (error) {
      console.error("Check-in by code error:", error);
      res.status(500).json({ status: "invalid", message: "خطأ في التحقق من الكود" });
    }
  });

  // Verify QR code (for check-in by scanning)
  app.post("/api/check-in/verify-qr", requireRole("organizer", "event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const { qrData } = req.body;

      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
      } catch {
        return res.status(400).json({ status: "invalid", message: "كود غير صالح" });
      }

      const guest = await storage.getGuest(parsedData.id);
      if (!guest || guest.qrCode !== parsedData.code) {
        return res.status(404).json({ status: "invalid", message: "الدعوة غير صالحة" });
      }

      // Verify access to the event
      if (user.role === "organizer") {
        const assignedEvents = await storage.getOrganizerEvents(user.id);
        if (!assignedEvents.some(e => e.id === guest.eventId)) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      } else if (user.role === "event_manager") {
        const event = await storage.getEvent(guest.eventId);
        if (!event || event.eventManagerId !== user.id) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      }

      if (guest.isCheckedIn) {
        const checkedInByUser = guest.checkedInBy
          ? await storage.getUser(guest.checkedInBy)
          : null;
        return res.json({
          status: "duplicate",
          guest,
          message: "تم استخدام هذه الدعوة مسبقاً!",
          checkedInAt: guest.checkedInAt,
          checkedInBy: checkedInByUser?.name || "غير معروف",
        });
      }

      const updatedGuest = await storage.checkInGuest(guest.id, user.id);

      await storage.createAuditLog({
        eventId: guest.eventId,
        userId: user.id,
        action: "check_in",
        details: `تم تسجيل حضور: ${guest.name}`,
        guestId: guest.id,
      });

      res.json({
        status: "success",
        guest: updatedGuest,
        message: "تم تسجيل الحضور بنجاح",
      });
    } catch (error) {
      res.status(500).json({ error: "خطأ في التحقق من الكود" });
    }
  });

  // ============ REPORTS ENDPOINTS ============

  // Get admin report (super_admin only)
  app.get("/api/reports/admin/:id", requireRole("super_admin"), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const report = await storage.getAdminReport(req.params.id, start, end);
      if (!report) {
        return res.status(404).json({ error: "المدير غير موجود" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء التقرير" });
    }
  });

  // Get event manager report (super_admin only)
  app.get("/api/reports/event-manager/:id", requireRole("super_admin"), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const report = await storage.getEventManagerReport(req.params.id, start, end);
      if (!report) {
        return res.status(404).json({ error: "مدير المناسبة غير موجود" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء التقرير" });
    }
  });

  // Get events report (super_admin only)
  app.get("/api/reports/events", requireRole("super_admin"), async (req, res) => {
    try {
      const { startDate, endDate, eventId } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const report = await storage.getEventsReport(start, end, eventId as string);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء التقرير" });
    }
  });

  // Get guests report for a specific event (super_admin only)
  app.get("/api/reports/guests/:eventId", requireRole("super_admin"), async (req, res) => {
    try {
      const { startDate, endDate, checkedInOnly } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const report = await storage.getGuestsReport(
        req.params.eventId,
        start,
        end,
        checkedInOnly === "true"
      );
      if (!report) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء التقرير" });
    }
  });

  // Get audit report (super_admin only)
  app.get("/api/reports/audit", requireRole("super_admin"), async (req, res) => {
    try {
      const { startDate, endDate, userId, eventId } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const report = await storage.getAuditReport(
        start,
        end,
        userId as string,
        eventId as string
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء التقرير" });
    }
  });

  // Export report to Excel (super_admin only)
  // Security: Server regenerates data instead of trusting client-supplied data
  app.post("/api/reports/export", requireRole("super_admin"), async (req, res) => {
    try {
      const { reportType, params, fileName } = req.body;
      
      // Parse date filters
      const startDate = params?.startDate ? new Date(params.startDate) : undefined;
      const endDate = params?.endDate ? new Date(params.endDate) : undefined;
      
      // Regenerate report data on server for security
      let reportData: any = null;
      
      switch (reportType) {
        case "admin":
          if (!params?.adminId) {
            return res.status(400).json({ error: "معرف المدير مطلوب" });
          }
          reportData = await storage.getAdminReport(params.adminId, startDate, endDate);
          if (!reportData) {
            return res.status(404).json({ error: "المدير غير موجود" });
          }
          break;
        case "eventManager":
          if (!params?.eventManagerId) {
            return res.status(400).json({ error: "معرف مدير المناسبة مطلوب" });
          }
          reportData = await storage.getEventManagerReport(params.eventManagerId, startDate, endDate);
          if (!reportData) {
            return res.status(404).json({ error: "مدير المناسبة غير موجود" });
          }
          break;
        case "events":
          reportData = await storage.getEventsReport(startDate, endDate, params?.eventId);
          break;
        case "guests":
          if (!params?.eventId) {
            return res.status(400).json({ error: "معرف المناسبة مطلوب" });
          }
          reportData = await storage.getGuestsReport(params.eventId, startDate, endDate, params?.checkedInOnly);
          if (!reportData) {
            return res.status(404).json({ error: "المناسبة غير موجودة" });
          }
          break;
        case "audit":
          reportData = await storage.getAuditReport(startDate, endDate, params?.userId, params?.eventId);
          break;
        default:
          return res.status(400).json({ error: "نوع تقرير غير صالح" });
      }
      
      let worksheetData: any[] = [];
      
      switch (reportType) {
        case "admin":
          worksheetData = [
            ["تقرير المدير: " + (reportData.admin?.name || "")],
            [],
            ["ملخص"],
            ["مديرو المناسبات", reportData.summary?.eventManagersCount || 0],
            ["المنظمون", reportData.summary?.organizersCount || 0],
            ["المناسبات", reportData.summary?.eventsCount || 0],
            ["إجمالي الضيوف", reportData.summary?.totalGuests || 0],
            ["الحاضرون", reportData.summary?.checkedInGuests || 0],
            ["نسبة الحضور", (reportData.summary?.checkInRate || 0) + "%"],
            [],
            ["مديرو المناسبات"],
            ["الاسم", "اسم المستخدم", "الحالة", "المناسبات", "الضيوف", "الحاضرون"],
            ...(reportData.eventManagers || []).map((m: any) => [
              m.name, m.username, m.isActive ? "نشط" : "غير نشط", m.eventsCount, m.totalGuests, m.checkedIn
            ]),
            [],
            ["المناسبات"],
            ["الاسم", "التاريخ", "الموقع", "مدير المناسبة", "الضيوف", "الحاضرون"],
            ...(reportData.events || []).map((e: any) => [
              e.name, e.date, e.location, e.managerName, e.totalGuests, e.checkedIn
            ]),
          ];
          break;

        case "eventManager":
          worksheetData = [
            ["تقرير مدير المناسبة: " + (reportData.manager?.name || "")],
            [],
            ["ملخص"],
            ["المناسبات", reportData.summary?.eventsCount || 0],
            ["المناسبات النشطة", reportData.summary?.activeEventsCount || 0],
            ["إجمالي الضيوف", reportData.summary?.totalGuests || 0],
            ["الحاضرون", reportData.summary?.checkedInGuests || 0],
            ["نسبة الحضور", (reportData.summary?.checkInRate || 0) + "%"],
            [],
            ["المناسبات"],
            ["الاسم", "التاريخ", "الموقع", "الضيوف", "الحاضرون", "VIP", "عادي", "إعلام", "راعي"],
            ...(reportData.events || []).map((e: any) => [
              e.name, e.date, e.location, e.totalGuests, e.checkedIn,
              e.categoryBreakdown?.vip || 0, e.categoryBreakdown?.regular || 0,
              e.categoryBreakdown?.media || 0, e.categoryBreakdown?.sponsor || 0
            ]),
          ];
          break;

        case "events":
          worksheetData = [
            ["تقرير المناسبات العام"],
            [],
            ["ملخص"],
            ["إجمالي المناسبات", reportData.summary?.eventsCount || 0],
            ["المناسبات النشطة", reportData.summary?.activeEventsCount || 0],
            ["إجمالي الضيوف", reportData.summary?.totalGuests || 0],
            ["الحاضرون", reportData.summary?.checkedInGuests || 0],
            ["نسبة الحضور", (reportData.summary?.checkInRate || 0) + "%"],
            [],
            ["المناسبات"],
            ["الاسم", "التاريخ", "الموقع", "مدير المناسبة", "الضيوف", "الحاضرون", "المتبقون", "النسبة%"],
            ...(reportData.events || []).map((e: any) => [
              e.name, e.date, e.location, e.managerName, e.totalGuests, e.checkedIn, e.pending, e.checkInRate
            ]),
          ];
          break;

        case "guests":
          worksheetData = [
            ["تقرير الضيوف - " + (reportData.event?.name || "")],
            [],
            ["معلومات المناسبة"],
            ["التاريخ", reportData.event?.date || ""],
            ["الموقع", reportData.event?.location || ""],
            ["مدير المناسبة", reportData.event?.managerName || ""],
            [],
            ["ملخص"],
            ["إجمالي الضيوف", reportData.summary?.totalGuests || 0],
            ["الحاضرون", reportData.summary?.checkedIn || 0],
            ["المتبقون", reportData.summary?.pending || 0],
            ["إجمالي المرافقين", reportData.summary?.totalCompanions || 0],
            [],
            ["الضيوف"],
            ["الاسم", "الهاتف", "الفئة", "المرافقين", "الملاحظات", "الحالة", "وقت الحضور"],
            ...(reportData.guests || []).map((g: any) => [
              g.name, g.phone, g.category, g.companions, g.notes,
              g.isCheckedIn ? "حاضر" : "غير حاضر", g.checkedInAt || ""
            ]),
          ];
          break;

        case "audit":
          worksheetData = [
            ["تقرير سجل العمليات"],
            [],
            ["ملخص"],
            ["إجمالي العمليات", reportData.summary?.totalActions || 0],
            ["تسجيل الحضور", reportData.summary?.actionTypes?.check_in || 0],
            ["إنشاء مناسبة", reportData.summary?.actionTypes?.create_event || 0],
            ["تحديث مناسبة", reportData.summary?.actionTypes?.update_event || 0],
            ["إضافة ضيف", reportData.summary?.actionTypes?.create_guest || 0],
            ["رفع ضيوف", reportData.summary?.actionTypes?.upload_guests || 0],
            [],
            ["العمليات"],
            ["التاريخ", "المستخدم", "العملية", "المناسبة", "التفاصيل"],
            ...(reportData.logs || []).map((l: any) => [
              l.timestamp, l.userName, l.action, l.eventName, l.details
            ]),
          ];
          break;

        default:
          return res.status(400).json({ error: "نوع تقرير غير صالح" });
      }

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "التقرير");

      // Set RTL for the worksheet
      worksheet["!dir"] = "rtl";

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      // Use RFC 5987 encoding for Arabic filenames
      const safeFileName = encodeURIComponent(fileName || "report");
      res.setHeader("Content-Disposition", `attachment; filename="report.xlsx"; filename*=UTF-8''${safeFileName}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "خطأ في تصدير التقرير" });
    }
  });

  // Get list of admins for report selection
  app.get("/api/reports/admins-list", requireRole("super_admin"), async (req, res) => {
    try {
      const admins = await storage.getUsersByRole("admin");
      res.json(admins.map(a => ({ id: a.id, name: a.name, username: a.username })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب قائمة المديرين" });
    }
  });

  // Get list of event managers for report selection
  app.get("/api/reports/event-managers-list", requireRole("super_admin"), async (req, res) => {
    try {
      const managers = await storage.getUsersByRole("event_manager");
      res.json(managers.map(m => ({ id: m.id, name: m.name, username: m.username })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب قائمة مديري المناسبات" });
    }
  });

  // Get list of events for report selection
  app.get("/api/reports/events-list", requireRole("super_admin"), async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events.map(e => ({ id: e.id, name: e.name, date: e.date })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب قائمة المناسبات" });
    }
  });

  // Site Settings - Public endpoint for login page
  app.get("/api/settings/public", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الإعدادات" });
    }
  });

  // Site Settings - Get (super_admin only)
  app.get("/api/settings", requireRole("super_admin"), async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الإعدادات" });
    }
  });

  // Site Settings - Update (super_admin only)
  app.put("/api/settings", requireRole("super_admin"), async (req, res) => {
    try {
      // Allow empty strings (which will be converted to null) or valid URLs
      const urlSchema = z.string().refine(
        (val) => val === "" || /^https?:\/\/.+/.test(val),
        { message: "يجب أن يكون رابط صالح" }
      ).nullable().optional();
      const settingsSchema = z.object({
        whatsapp: urlSchema,
        instagram: urlSchema,
        facebook: urlSchema,
        twitter: urlSchema,
        linkedin: urlSchema,
      });
      
      const parseResult = settingsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "بيانات غير صالحة - تأكد من صحة الروابط" });
      }
      
      const { whatsapp, instagram, facebook, twitter, linkedin } = parseResult.data;
      const settings = await storage.updateSiteSettings({
        whatsapp: whatsapp || null,
        instagram: instagram || null,
        facebook: facebook || null,
        twitter: twitter || null,
        linkedin: linkedin || null,
      });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "خطأ في تحديث الإعدادات" });
    }
  });

  // Capacity Tiers - Get all (public for event creation form)
  app.get("/api/capacity-tiers", requireAuth, async (req, res) => {
    try {
      const tiers = await storage.getCapacityTiers();
      res.json(tiers.filter(t => t.isActive));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب باقات السعة" });
    }
  });

  // Capacity Tiers - Get all including inactive (super_admin only)
  app.get("/api/capacity-tiers/all", requireRole("super_admin"), async (req, res) => {
    try {
      const tiers = await storage.getCapacityTiers();
      res.json(tiers);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب باقات السعة" });
    }
  });

  // Capacity Tiers - Create (super_admin only)
  app.post("/api/capacity-tiers", requireRole("super_admin"), async (req, res) => {
    try {
      const tierSchema = z.object({
        name: z.string().min(1, "اسم الباقة مطلوب"),
        minGuests: z.number().min(0).default(0),
        maxGuests: z.number().nullable().optional(),
        isUnlimited: z.boolean().default(false),
        isActive: z.boolean().default(true),
        sortOrder: z.number().default(0),
      });
      
      const parseResult = tierSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "بيانات غير صالحة" });
      }
      
      const tier = await storage.createCapacityTier(parseResult.data);
      res.json(tier);
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء باقة السعة" });
    }
  });

  // Capacity Tiers - Update (super_admin only)
  app.patch("/api/capacity-tiers/:id", requireRole("super_admin"), async (req, res) => {
    try {
      const tier = await storage.getCapacityTier(req.params.id);
      if (!tier) {
        return res.status(404).json({ error: "الباقة غير موجودة" });
      }
      
      const updated = await storage.updateCapacityTier(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "خطأ في تحديث باقة السعة" });
    }
  });

  // Capacity Tiers - Delete (super_admin only)
  app.delete("/api/capacity-tiers/:id", requireRole("super_admin"), async (req, res) => {
    try {
      const tier = await storage.getCapacityTier(req.params.id);
      if (!tier) {
        return res.status(404).json({ error: "الباقة غير موجودة" });
      }
      
      await storage.deleteCapacityTier(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطأ في حذف باقة السعة" });
    }
  });

  // Event Manager Quota Info with tier details
  app.get("/api/quota/info", requireRole("event_manager", "admin", "super_admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (user.role !== "event_manager") {
        return res.json({ hasQuota: false });
      }
      
      // Get user tier quotas
      const userTierQuotas = await storage.getUserTierQuotas(user.id);
      const capacityTiers = await storage.getCapacityTiers();
      
      // Build tier quotas with usage info
      const tierQuotasInfo = await Promise.all(
        capacityTiers.filter(t => t.isActive).map(async (tier) => {
          const tierQuota = userTierQuotas.find(q => String(q.capacityTierId) === String(tier.id));
          const quota = tierQuota?.quota || 0;
          const used = await storage.getEventCountByManagerAndTier(user.id, tier.id);
          return {
            tierId: tier.id,
            tierName: tier.name,
            quota,
            used,
            remaining: Math.max(0, quota - used),
          };
        })
      );
      
      // Calculate totals
      const totalQuota = tierQuotasInfo.reduce((sum, t) => sum + t.quota, 0);
      const totalUsed = tierQuotasInfo.reduce((sum, t) => sum + t.used, 0);
      
      res.json({
        hasQuota: totalQuota > 0,
        totalQuota,
        usedQuota: totalUsed,
        remainingQuota: Math.max(0, totalQuota - totalUsed),
        tierQuotas: tierQuotasInfo,
      });
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب معلومات الحصة" });
    }
  });

  // Subscriptions Management - Get all event managers with usage details
  app.get("/api/subscriptions", requireRole("super_admin"), async (req, res) => {
    try {
      const eventManagers = await storage.getUsersByRole("event_manager");
      const capacityTiers = await storage.getCapacityTiers();
      
      const subscriptionsData = await Promise.all(
        eventManagers.map(async (manager) => {
          const events = await storage.getEventsByManager(manager.id);
          const eventCount = events.length;
          
          // Get per-tier quotas for this manager
          const userTierQuotas = await storage.getUserTierQuotas(manager.id);
          
          // Build tier quotas map
          const tierQuotasMap: Record<string, number> = {};
          for (const q of userTierQuotas) {
            tierQuotasMap[String(q.capacityTierId)] = q.quota;
          }
          
          // Count events by capacity tier
          const tierUsage: Record<string, { count: number; guests: number }> = {};
          let totalGuests = 0;
          
          for (const event of events) {
            const guests = await storage.getGuestsByEvent(event.id);
            const guestCount = guests.length;
            totalGuests += guestCount;
            
            // Ensure consistent string type for tier ID comparison
            const tierId = event.capacityTierId ? String(event.capacityTierId) : "none";
            if (!tierUsage[tierId]) {
              tierUsage[tierId] = { count: 0, guests: 0 };
            }
            tierUsage[tierId].count++;
            tierUsage[tierId].guests += guestCount;
          }
          
          // Build tier details with quotas for all active tiers
          const tierDetails = capacityTiers
            .filter(t => t.isActive)
            .map(tier => {
              const tierId = String(tier.id);
              const usage = tierUsage[tierId] || { count: 0, guests: 0 };
              const quota = tierQuotasMap[tierId] || 0;
              return {
                tierId,
                tierName: tier.name,
                quota,
                eventCount: usage.count,
                guestCount: usage.guests,
                remaining: Math.max(0, quota - usage.count),
              };
            });
          
          // Calculate total quota and usage from tier quotas
          const totalTierQuota = tierDetails.reduce((sum, t) => sum + t.quota, 0);
          const totalTierUsed = tierDetails.reduce((sum, t) => sum + t.eventCount, 0);
          
          return {
            id: manager.id,
            name: manager.name,
            username: manager.username,
            isActive: manager.isActive,
            totalQuota: totalTierQuota,
            eventsUsed: totalTierUsed,
            eventsRemaining: Math.max(0, totalTierQuota - totalTierUsed),
            totalGuests,
            tierQuotas: tierDetails,
            createdAt: manager.createdAt,
          };
        })
      );
      
      res.json(subscriptionsData);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب بيانات الاشتراكات" });
    }
  });

  // Update event manager tier quotas
  const tierQuotaSchema = z.object({
    tierId: z.string(),
    quota: z.number().int().min(0, "الحصة يجب أن تكون رقم صحيح موجب").max(100, "الحد الأقصى للحصة لكل باقة هو 100"),
  });
  
  const tierQuotasUpdateSchema = z.object({
    tierQuotas: z.array(tierQuotaSchema),
  });
  
  app.patch("/api/subscriptions/:id/tier-quotas", requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      
      const parseResult = tierQuotasUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "بيانات غير صالحة" });
      }
      
      const { tierQuotas } = parseResult.data;
      
      const user = await storage.getUser(id);
      if (!user || user.role !== "event_manager") {
        return res.status(404).json({ error: "مدير المناسبات غير موجود" });
      }
      
      // Validate that all tier IDs exist
      const allTiers = await storage.getCapacityTiers();
      const validTierIds = new Set(allTiers.map(t => String(t.id)));
      
      for (const tq of tierQuotas) {
        if (!validTierIds.has(String(tq.tierId))) {
          return res.status(400).json({ error: `باقة السعة غير موجودة: ${tq.tierId}` });
        }
      }
      
      // Update each tier quota
      for (const tq of tierQuotas) {
        await storage.setUserTierQuota(id, tq.tierId, tq.quota);
      }
      
      // Calculate total quota for audit log
      const totalQuota = tierQuotas.reduce((sum, tq) => sum + tq.quota, 0);
      
      await storage.createAuditLog({
        userId: (req as any).user.id,
        action: "update_tier_quotas",
        details: `تم تحديث حصص الباقات لـ ${user.name} (إجمالي: ${totalQuota} مناسبة)`,
      });
      
      res.json({ success: true, message: "تم تحديث الحصص بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تحديث الحصص" });
    }
  });

  return httpServer;
}
