import {
  users,
  events,
  guests,
  eventOrganizers,
  auditLogs,
  siteSettings,
  capacityTiers,
  userTierQuotas,
  type User,
  type InsertUser,
  type Event,
  type InsertEvent,
  type Guest,
  type InsertGuest,
  type EventOrganizer,
  type InsertEventOrganizer,
  type AuditLog,
  type InsertAuditLog,
  type SiteSettings,
  type InsertSiteSettings,
  type CapacityTier,
  type InsertCapacityTier,
  type UserTierQuota,
  type InsertUserTierQuota,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByCreator(createdById: string): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Events
  getEvent(id: string): Promise<Event | undefined>;
  getEvents(): Promise<Event[]>;
  getEventsByManager(managerId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;

  // Guests
  getGuest(id: string): Promise<Guest | undefined>;
  getGuestByQrCode(qrCode: string): Promise<Guest | undefined>;
  getGuestsByEvent(eventId: string): Promise<Guest[]>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  createGuests(guests: InsertGuest[]): Promise<Guest[]>;
  updateGuest(id: string, data: Partial<Guest>): Promise<Guest | undefined>;
  deleteGuest(id: string): Promise<void>;
  checkInGuest(id: string, organizerId: string): Promise<Guest | undefined>;

  // Event Organizers
  getEventOrganizers(eventId: string): Promise<User[]>;
  getOrganizerEvents(organizerId: string): Promise<Event[]>;
  assignOrganizer(data: InsertEventOrganizer): Promise<EventOrganizer>;
  removeOrganizer(eventId: string, organizerId: string): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByEvent(eventId: string): Promise<AuditLog[]>;

  // Stats
  getStats(role: string, userId?: string): Promise<Record<string, number>>;
  getComprehensiveStats(): Promise<any>;

  // Reports
  getAdminReport(adminId: string, startDate?: Date, endDate?: Date): Promise<any>;
  getEventManagerReport(managerId: string, startDate?: Date, endDate?: Date): Promise<any>;
  getEventsReport(startDate?: Date, endDate?: Date, eventId?: string): Promise<any>;
  getGuestsReport(eventId: string, startDate?: Date, endDate?: Date, checkedInOnly?: boolean): Promise<any>;
  getAuditReport(startDate?: Date, endDate?: Date, userId?: string, eventId?: string): Promise<any>;
  getAllAuditLogs(startDate?: Date, endDate?: Date): Promise<AuditLog[]>;

  // Site Settings
  getSiteSettings(): Promise<SiteSettings | undefined>;
  updateSiteSettings(data: InsertSiteSettings): Promise<SiteSettings>;

  // Capacity Tiers
  getCapacityTiers(): Promise<CapacityTier[]>;
  getCapacityTier(id: string): Promise<CapacityTier | undefined>;
  createCapacityTier(tier: InsertCapacityTier): Promise<CapacityTier>;
  updateCapacityTier(id: string, data: Partial<InsertCapacityTier>): Promise<CapacityTier | undefined>;
  deleteCapacityTier(id: string): Promise<void>;
  getEventCountByManager(managerId: string): Promise<number>;

  // User Tier Quotas
  getUserTierQuotas(userId: string): Promise<UserTierQuota[]>;
  setUserTierQuota(userId: string, capacityTierId: string, quota: number): Promise<UserTierQuota>;
  deleteUserTierQuotas(userId: string): Promise<void>;
  getEventCountByManagerAndTier(managerId: string, capacityTierId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any));
  }

  async getUsersByCreator(createdById: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.createdById, createdById));
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(desc(events.date));
  }

  async getEventsByManager(managerId: string): Promise<Event[]> {
    return db.select().from(events).where(eq(events.eventManagerId, managerId)).orderBy(desc(events.date));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Guests
  async getGuest(id: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest || undefined;
  }

  async getGuestByQrCode(qrCode: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.qrCode, qrCode));
    return guest || undefined;
  }

  async getGuestsByEvent(eventId: string): Promise<Guest[]> {
    return db.select().from(guests).where(eq(guests.eventId, eventId));
  }

  async createGuest(insertGuest: InsertGuest): Promise<Guest> {
    const [guest] = await db.insert(guests).values(insertGuest).returning();
    return guest;
  }

  async createGuests(insertGuests: InsertGuest[]): Promise<Guest[]> {
    if (insertGuests.length === 0) return [];
    return db.insert(guests).values(insertGuests).returning();
  }

  async updateGuest(id: string, data: Partial<Guest>): Promise<Guest | undefined> {
    const [guest] = await db.update(guests).set(data).where(eq(guests.id, id)).returning();
    return guest || undefined;
  }

  async deleteGuest(id: string): Promise<void> {
    await db.delete(guests).where(eq(guests.id, id));
  }

  async checkInGuest(id: string, organizerId: string): Promise<Guest | undefined> {
    const [guest] = await db
      .update(guests)
      .set({
        isCheckedIn: true,
        checkedInAt: new Date(),
        checkedInBy: organizerId,
      })
      .where(eq(guests.id, id))
      .returning();
    return guest || undefined;
  }

  // Event Organizers
  async getEventOrganizers(eventId: string): Promise<User[]> {
    const assignments = await db
      .select()
      .from(eventOrganizers)
      .where(eq(eventOrganizers.eventId, eventId));
    
    if (assignments.length === 0) return [];
    
    const organizerIds = assignments.map((a) => a.organizerId);
    const organizers = await Promise.all(
      organizerIds.map((id) => this.getUser(id))
    );
    return organizers.filter((o): o is User => o !== undefined);
  }

  async getOrganizerEvents(organizerId: string): Promise<Event[]> {
    const assignments = await db
      .select()
      .from(eventOrganizers)
      .where(eq(eventOrganizers.organizerId, organizerId));
    
    if (assignments.length === 0) return [];
    
    const eventIds = assignments.map((a) => a.eventId);
    const eventList = await Promise.all(
      eventIds.map((id) => this.getEvent(id))
    );
    return eventList.filter((e): e is Event => e !== undefined && e.isActive === true);
  }

  async assignOrganizer(data: InsertEventOrganizer): Promise<EventOrganizer> {
    const [assignment] = await db.insert(eventOrganizers).values(data).returning();
    return assignment;
  }

  async removeOrganizer(eventId: string, organizerId: string): Promise<void> {
    await db
      .delete(eventOrganizers)
      .where(
        and(
          eq(eventOrganizers.eventId, eventId),
          eq(eventOrganizers.organizerId, organizerId)
        )
      );
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogsByEvent(eventId: string): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.eventId, eventId))
      .orderBy(desc(auditLogs.timestamp));
  }

  // Stats
  async getStats(role: string, userId?: string): Promise<Record<string, number>> {
    const allUsers = await db.select().from(users);
    const allEvents = await db.select().from(events);
    const allGuests = await db.select().from(guests);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (role === "super_admin") {
      return {
        totalAdmins: allUsers.filter((u) => u.role === "admin").length,
        totalEventManagers: allUsers.filter((u) => u.role === "event_manager").length,
        totalEvents: allEvents.length,
        activeEvents: allEvents.filter((e) => e.isActive).length,
      };
    }

    if (role === "admin") {
      return {
        totalEventManagers: allUsers.filter((u) => u.role === "event_manager").length,
        totalEvents: allEvents.length,
        activeEvents: allEvents.filter((e) => e.isActive).length,
        totalGuests: allGuests.length,
      };
    }

    if (role === "event_manager" && userId) {
      const userEvents = allEvents.filter((e) => e.eventManagerId === userId);
      const userEventIds = userEvents.map((e) => e.id);
      const userGuests = allGuests.filter((g) => userEventIds.includes(g.eventId));
      
      return {
        totalEvents: userEvents.length,
        activeEvents: userEvents.filter((e) => e.isActive).length,
        totalGuests: userGuests.length,
        checkedInToday: userGuests.filter(
          (g) => g.isCheckedIn && g.checkedInAt && new Date(g.checkedInAt) >= today
        ).length,
      };
    }

    return {};
  }

  async getComprehensiveStats(): Promise<any> {
    const allUsers = await db.select().from(users);
    const allEvents = await db.select().from(events);
    const allGuests = await db.select().from(guests);
    const allAssignments = await db.select().from(eventOrganizers);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const admins = allUsers.filter((u) => u.role === "admin");
    const eventManagers = allUsers.filter((u) => u.role === "event_manager");
    const organizers = allUsers.filter((u) => u.role === "organizer");

    const adminStats = admins.map((admin) => {
      const managersCreatedByAdmin = eventManagers.filter((m) => m.createdById === admin.id);
      const organizersCreatedByAdmin = organizers.filter((o) => o.createdById === admin.id);
      return {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        eventManagersCount: managersCreatedByAdmin.length,
        organizersCount: organizersCreatedByAdmin.length,
      };
    });

    const eventManagerStats = eventManagers.map((manager) => {
      const managerEvents = allEvents.filter((e) => e.eventManagerId === manager.id);
      const managerEventIds = managerEvents.map((e) => e.id);
      const managerGuests = allGuests.filter((g) => managerEventIds.includes(g.eventId));
      const managerOrganizers = organizers.filter((o) => o.createdById === manager.id);
      const checkedInGuests = managerGuests.filter((g) => g.isCheckedIn);
      
      return {
        id: manager.id,
        name: manager.name,
        username: manager.username,
        isActive: manager.isActive,
        createdAt: manager.createdAt,
        eventsCount: managerEvents.length,
        activeEventsCount: managerEvents.filter((e) => e.isActive).length,
        totalGuests: managerGuests.length,
        checkedInGuests: checkedInGuests.length,
        organizersCount: managerOrganizers.length,
        events: managerEvents.map((event) => {
          const eventGuests = allGuests.filter((g) => g.eventId === event.id);
          const eventOrgs = allAssignments.filter((a) => a.eventId === event.id);
          return {
            id: event.id,
            name: event.name,
            date: event.date,
            location: event.location,
            isActive: event.isActive,
            totalGuests: eventGuests.length,
            checkedIn: eventGuests.filter((g) => g.isCheckedIn).length,
            organizersCount: eventOrgs.length,
          };
        }),
      };
    });

    const eventStats = allEvents.map((event) => {
      const eventGuests = allGuests.filter((g) => g.eventId === event.id);
      const eventOrgs = allAssignments.filter((a) => a.eventId === event.id);
      const manager = eventManagers.find((m) => m.id === event.eventManagerId);
      const checkedIn = eventGuests.filter((g) => g.isCheckedIn);
      
      const categoryBreakdown = {
        vip: eventGuests.filter((g) => g.category === "vip").length,
        regular: eventGuests.filter((g) => g.category === "regular").length,
        media: eventGuests.filter((g) => g.category === "media").length,
        sponsor: eventGuests.filter((g) => g.category === "sponsor").length,
      };

      return {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
        isActive: event.isActive,
        createdAt: event.createdAt,
        managerName: manager?.name || "غير معروف",
        managerId: event.eventManagerId,
        totalGuests: eventGuests.length,
        checkedIn: checkedIn.length,
        pending: eventGuests.length - checkedIn.length,
        checkInRate: eventGuests.length > 0 ? Math.round((checkedIn.length / eventGuests.length) * 100) : 0,
        organizersCount: eventOrgs.length,
        categoryBreakdown,
      };
    });

    const organizerStats = organizers.map((organizer) => {
      const assignments = allAssignments.filter((a) => a.organizerId === organizer.id);
      const assignedEventIds = assignments.map((a) => a.eventId);
      const assignedEvents = allEvents.filter((e) => assignedEventIds.includes(e.id));
      
      return {
        id: organizer.id,
        name: organizer.name,
        username: organizer.username,
        isActive: organizer.isActive,
        createdAt: organizer.createdAt,
        assignedEventsCount: assignedEvents.length,
        events: assignedEvents.map((e) => ({ id: e.id, name: e.name, date: e.date })),
      };
    });

    const totalCheckedIn = allGuests.filter((g) => g.isCheckedIn).length;
    const todayCheckIns = allGuests.filter(
      (g) => g.isCheckedIn && g.checkedInAt && new Date(g.checkedInAt) >= today
    ).length;

    return {
      overview: {
        totalAdmins: admins.length,
        activeAdmins: admins.filter((a) => a.isActive).length,
        totalEventManagers: eventManagers.length,
        activeEventManagers: eventManagers.filter((m) => m.isActive).length,
        totalOrganizers: organizers.length,
        activeOrganizers: organizers.filter((o) => o.isActive).length,
        totalEvents: allEvents.length,
        activeEvents: allEvents.filter((e) => e.isActive).length,
        totalGuests: allGuests.length,
        totalCheckedIn,
        todayCheckIns,
        checkInRate: allGuests.length > 0 ? Math.round((totalCheckedIn / allGuests.length) * 100) : 0,
      },
      admins: adminStats,
      eventManagers: eventManagerStats,
      events: eventStats,
      organizers: organizerStats,
    };
  }

  // Report functions
  async getAdminReport(adminId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const admin = await this.getUser(adminId);
    if (!admin || admin.role !== "admin") return null;

    const allUsers = await db.select().from(users);
    const allEvents = await db.select().from(events);
    const allGuests = await db.select().from(guests);
    const allAssignments = await db.select().from(eventOrganizers);

    // Event managers created by this admin
    const eventManagersCreated = allUsers.filter(
      (u) => u.role === "event_manager" && u.createdById === adminId
    );
    
    // Organizers created by this admin
    const organizersCreated = allUsers.filter(
      (u) => u.role === "organizer" && u.createdById === adminId
    );

    // Events by event managers this admin created
    const eventManagerIds = eventManagersCreated.map((m) => m.id);
    let relatedEvents = allEvents.filter((e) => eventManagerIds.includes(e.eventManagerId));

    // Apply date filter
    if (startDate) {
      relatedEvents = relatedEvents.filter((e) => new Date(e.date) >= startDate);
    }
    if (endDate) {
      relatedEvents = relatedEvents.filter((e) => new Date(e.date) <= endDate);
    }

    const relatedEventIds = relatedEvents.map((e) => e.id);
    const relatedGuests = allGuests.filter((g) => relatedEventIds.includes(g.eventId));
    const checkedInGuests = relatedGuests.filter((g) => g.isCheckedIn);

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        createdAt: admin.createdAt,
        isActive: admin.isActive,
      },
      summary: {
        eventManagersCount: eventManagersCreated.length,
        organizersCount: organizersCreated.length,
        eventsCount: relatedEvents.length,
        totalGuests: relatedGuests.length,
        checkedInGuests: checkedInGuests.length,
        checkInRate: relatedGuests.length > 0 ? Math.round((checkedInGuests.length / relatedGuests.length) * 100) : 0,
      },
      eventManagers: eventManagersCreated.map((m) => {
        const mEvents = relatedEvents.filter((e) => e.eventManagerId === m.id);
        const mEventIds = mEvents.map((e) => e.id);
        const mGuests = relatedGuests.filter((g) => mEventIds.includes(g.eventId));
        return {
          id: m.id,
          name: m.name,
          username: m.username,
          isActive: m.isActive,
          eventsCount: mEvents.length,
          totalGuests: mGuests.length,
          checkedIn: mGuests.filter((g) => g.isCheckedIn).length,
        };
      }),
      events: relatedEvents.map((e) => {
        const eGuests = relatedGuests.filter((g) => g.eventId === e.id);
        const manager = eventManagersCreated.find((m) => m.id === e.eventManagerId);
        return {
          id: e.id,
          name: e.name,
          date: e.date,
          location: e.location,
          isActive: e.isActive,
          managerName: manager?.name,
          totalGuests: eGuests.length,
          checkedIn: eGuests.filter((g) => g.isCheckedIn).length,
        };
      }),
    };
  }

  async getEventManagerReport(managerId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const manager = await this.getUser(managerId);
    if (!manager || manager.role !== "event_manager") return null;

    const allUsers = await db.select().from(users);
    const allGuests = await db.select().from(guests);
    const allAssignments = await db.select().from(eventOrganizers);
    
    let managerEvents = await db.select().from(events).where(eq(events.eventManagerId, managerId));
    
    // Apply date filter
    if (startDate) {
      managerEvents = managerEvents.filter((e) => new Date(e.date) >= startDate);
    }
    if (endDate) {
      managerEvents = managerEvents.filter((e) => new Date(e.date) <= endDate);
    }

    const eventIds = managerEvents.map((e) => e.id);
    const eventGuests = allGuests.filter((g) => eventIds.includes(g.eventId));
    const checkedInGuests = eventGuests.filter((g) => g.isCheckedIn);
    
    // Organizers created by this manager
    const createdOrganizers = allUsers.filter(
      (u) => u.role === "organizer" && u.createdById === managerId
    );

    // All organizers assigned to manager's events
    const assignedOrganizerIdsSet = new Set(
      allAssignments.filter((a) => eventIds.includes(a.eventId)).map((a) => a.organizerId)
    );
    const assignedOrganizerIds = Array.from(assignedOrganizerIdsSet);
    const assignedOrganizers = allUsers.filter((u) => assignedOrganizerIds.includes(u.id));

    return {
      manager: {
        id: manager.id,
        name: manager.name,
        username: manager.username,
        createdAt: manager.createdAt,
        isActive: manager.isActive,
      },
      summary: {
        eventsCount: managerEvents.length,
        activeEventsCount: managerEvents.filter((e) => e.isActive).length,
        totalGuests: eventGuests.length,
        checkedInGuests: checkedInGuests.length,
        checkInRate: eventGuests.length > 0 ? Math.round((checkedInGuests.length / eventGuests.length) * 100) : 0,
        createdOrganizersCount: createdOrganizers.length,
        assignedOrganizersCount: assignedOrganizers.length,
      },
      events: managerEvents.map((e) => {
        const eGuests = eventGuests.filter((g) => g.eventId === e.id);
        const eOrgs = allAssignments.filter((a) => a.eventId === e.id);
        const categoryBreakdown = {
          vip: eGuests.filter((g) => g.category === "vip").length,
          regular: eGuests.filter((g) => g.category === "regular").length,
          media: eGuests.filter((g) => g.category === "media").length,
          sponsor: eGuests.filter((g) => g.category === "sponsor").length,
        };
        return {
          id: e.id,
          name: e.name,
          date: e.date,
          location: e.location,
          isActive: e.isActive,
          totalGuests: eGuests.length,
          checkedIn: eGuests.filter((g) => g.isCheckedIn).length,
          organizersCount: eOrgs.length,
          categoryBreakdown,
        };
      }),
      organizers: createdOrganizers.map((o) => {
        const oEvents = allAssignments.filter((a) => a.organizerId === o.id && eventIds.includes(a.eventId));
        return {
          id: o.id,
          name: o.name,
          username: o.username,
          isActive: o.isActive,
          assignedEventsCount: oEvents.length,
        };
      }),
    };
  }

  async getEventsReport(startDate?: Date, endDate?: Date, eventId?: string): Promise<any> {
    const allUsers = await db.select().from(users);
    const allGuests = await db.select().from(guests);
    const allAssignments = await db.select().from(eventOrganizers);
    
    let allEvents = await db.select().from(events);
    
    if (eventId) {
      allEvents = allEvents.filter((e) => e.id === eventId);
    }
    if (startDate) {
      allEvents = allEvents.filter((e) => new Date(e.date) >= startDate);
    }
    if (endDate) {
      allEvents = allEvents.filter((e) => new Date(e.date) <= endDate);
    }

    const eventIds = allEvents.map((e) => e.id);
    const filteredGuests = allGuests.filter((g) => eventIds.includes(g.eventId));
    const checkedInGuests = filteredGuests.filter((g) => g.isCheckedIn);

    const eventManagers = allUsers.filter((u) => u.role === "event_manager");

    return {
      summary: {
        eventsCount: allEvents.length,
        activeEventsCount: allEvents.filter((e) => e.isActive).length,
        totalGuests: filteredGuests.length,
        checkedInGuests: checkedInGuests.length,
        checkInRate: filteredGuests.length > 0 ? Math.round((checkedInGuests.length / filteredGuests.length) * 100) : 0,
      },
      events: allEvents.map((e) => {
        const eGuests = filteredGuests.filter((g) => g.eventId === e.id);
        const eOrgs = allAssignments.filter((a) => a.eventId === e.id);
        const manager = eventManagers.find((m) => m.id === e.eventManagerId);
        const categoryBreakdown = {
          vip: eGuests.filter((g) => g.category === "vip").length,
          regular: eGuests.filter((g) => g.category === "regular").length,
          media: eGuests.filter((g) => g.category === "media").length,
          sponsor: eGuests.filter((g) => g.category === "sponsor").length,
        };
        return {
          id: e.id,
          name: e.name,
          date: e.date,
          location: e.location,
          isActive: e.isActive,
          createdAt: e.createdAt,
          managerName: manager?.name || "غير معروف",
          managerId: e.eventManagerId,
          totalGuests: eGuests.length,
          checkedIn: eGuests.filter((g) => g.isCheckedIn).length,
          pending: eGuests.length - eGuests.filter((g) => g.isCheckedIn).length,
          checkInRate: eGuests.length > 0 ? Math.round((eGuests.filter((g) => g.isCheckedIn).length / eGuests.length) * 100) : 0,
          organizersCount: eOrgs.length,
          categoryBreakdown,
        };
      }),
    };
  }

  async getGuestsReport(eventId: string, startDate?: Date, endDate?: Date, checkedInOnly?: boolean): Promise<any> {
    const event = await this.getEvent(eventId);
    if (!event) return null;

    let eventGuests = await db.select().from(guests).where(eq(guests.eventId, eventId));

    // Filter by check-in date if provided
    if (startDate && checkedInOnly) {
      eventGuests = eventGuests.filter(
        (g) => g.isCheckedIn && g.checkedInAt && new Date(g.checkedInAt) >= startDate
      );
    }
    if (endDate && checkedInOnly) {
      eventGuests = eventGuests.filter(
        (g) => g.isCheckedIn && g.checkedInAt && new Date(g.checkedInAt) <= endDate
      );
    }
    if (checkedInOnly) {
      eventGuests = eventGuests.filter((g) => g.isCheckedIn);
    }

    const manager = await this.getUser(event.eventManagerId);
    const organizers = await this.getEventOrganizers(eventId);

    const categoryBreakdown = {
      vip: eventGuests.filter((g) => g.category === "vip").length,
      regular: eventGuests.filter((g) => g.category === "regular").length,
      media: eventGuests.filter((g) => g.category === "media").length,
      sponsor: eventGuests.filter((g) => g.category === "sponsor").length,
    };

    return {
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
        isActive: event.isActive,
        managerName: manager?.name,
      },
      summary: {
        totalGuests: eventGuests.length,
        checkedIn: eventGuests.filter((g) => g.isCheckedIn).length,
        pending: eventGuests.filter((g) => !g.isCheckedIn).length,
        totalCompanions: eventGuests.reduce((sum, g) => sum + (g.companions || 0), 0),
        categoryBreakdown,
      },
      guests: eventGuests.map((g) => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        category: g.category,
        companions: g.companions,
        notes: g.notes,
        isCheckedIn: g.isCheckedIn,
        checkedInAt: g.checkedInAt,
        qrCode: g.qrCode,
      })),
      organizers: organizers.map((o) => ({
        id: o.id,
        name: o.name,
        username: o.username,
      })),
    };
  }

  async getAuditReport(startDate?: Date, endDate?: Date, userId?: string, eventId?: string): Promise<any> {
    let logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));

    if (userId) {
      logs = logs.filter((l) => l.userId === userId);
    }
    if (eventId) {
      logs = logs.filter((l) => l.eventId === eventId);
    }
    if (startDate) {
      logs = logs.filter((l) => l.timestamp && new Date(l.timestamp) >= startDate);
    }
    if (endDate) {
      logs = logs.filter((l) => l.timestamp && new Date(l.timestamp) <= endDate);
    }

    const allUsers = await db.select().from(users);
    const allEvents = await db.select().from(events);

    return {
      summary: {
        totalActions: logs.length,
        actionTypes: {
          check_in: logs.filter((l) => l.action === "check_in").length,
          create_event: logs.filter((l) => l.action === "create_event").length,
          update_event: logs.filter((l) => l.action === "update_event").length,
          create_guest: logs.filter((l) => l.action === "create_guest").length,
          upload_guests: logs.filter((l) => l.action === "upload_guests").length,
        },
      },
      logs: logs.map((l) => {
        const user = allUsers.find((u) => u.id === l.userId);
        const event = allEvents.find((e) => e.id === l.eventId);
        return {
          id: l.id,
          action: l.action,
          details: l.details,
          timestamp: l.timestamp,
          userName: user?.name || "غير معروف",
          eventName: event?.name || "غير معروف",
        };
      }),
    };
  }

  async getAllAuditLogs(startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    let logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));

    if (startDate) {
      logs = logs.filter((l) => l.timestamp && new Date(l.timestamp) >= startDate);
    }
    if (endDate) {
      logs = logs.filter((l) => l.timestamp && new Date(l.timestamp) <= endDate);
    }

    return logs;
  }

  // Site Settings
  async getSiteSettings(): Promise<SiteSettings | undefined> {
    const [settings] = await db.select().from(siteSettings).limit(1);
    return settings;
  }

  async updateSiteSettings(data: InsertSiteSettings): Promise<SiteSettings> {
    const existing = await this.getSiteSettings();
    if (existing) {
      const [updated] = await db
        .update(siteSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(siteSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(siteSettings).values(data).returning();
      return created;
    }
  }

  // Capacity Tiers
  async getCapacityTiers(): Promise<CapacityTier[]> {
    return db.select().from(capacityTiers).orderBy(capacityTiers.sortOrder);
  }

  async getCapacityTier(id: string): Promise<CapacityTier | undefined> {
    const [tier] = await db.select().from(capacityTiers).where(eq(capacityTiers.id, id));
    return tier || undefined;
  }

  async createCapacityTier(tier: InsertCapacityTier): Promise<CapacityTier> {
    const [created] = await db.insert(capacityTiers).values(tier).returning();
    return created;
  }

  async updateCapacityTier(id: string, data: Partial<InsertCapacityTier>): Promise<CapacityTier | undefined> {
    const [updated] = await db.update(capacityTiers).set(data).where(eq(capacityTiers.id, id)).returning();
    return updated || undefined;
  }

  async deleteCapacityTier(id: string): Promise<void> {
    await db.delete(capacityTiers).where(eq(capacityTiers.id, id));
  }

  async getEventCountByManager(managerId: string): Promise<number> {
    const managerEvents = await db.select().from(events).where(eq(events.eventManagerId, managerId));
    return managerEvents.length;
  }

  // User Tier Quotas
  async getUserTierQuotas(userId: string): Promise<UserTierQuota[]> {
    return db.select().from(userTierQuotas).where(eq(userTierQuotas.userId, userId));
  }

  async setUserTierQuota(userId: string, capacityTierId: string, quota: number): Promise<UserTierQuota> {
    // Try to update existing record first
    const existing = await db.select().from(userTierQuotas)
      .where(and(
        eq(userTierQuotas.userId, userId),
        eq(userTierQuotas.capacityTierId, capacityTierId)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db.update(userTierQuotas)
        .set({ quota, updatedAt: new Date() })
        .where(and(
          eq(userTierQuotas.userId, userId),
          eq(userTierQuotas.capacityTierId, capacityTierId)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userTierQuotas)
        .values({ userId, capacityTierId, quota })
        .returning();
      return created;
    }
  }

  async deleteUserTierQuotas(userId: string): Promise<void> {
    await db.delete(userTierQuotas).where(eq(userTierQuotas.userId, userId));
  }

  async getEventCountByManagerAndTier(managerId: string, capacityTierId: string): Promise<number> {
    const managerEvents = await db.select().from(events)
      .where(and(
        eq(events.eventManagerId, managerId),
        eq(events.capacityTierId, capacityTierId)
      ));
    return managerEvents.length;
  }
}

export const storage = new DatabaseStorage();
