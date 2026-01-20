import { db } from "./db";
import { users } from "@shared/schema";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  // Check if users exist
  const existingUsers = await db.select().from(users).limit(1);
  
  if (existingUsers.length === 0) {
    await db.insert(users).values([
      {
        username: "admin",
        password: hashPassword("admin123"),
        name: "مالك النظام",
        role: "super_admin",
        isActive: true,
      },
      {
        username: "manager",
        password: hashPassword("manager123"),
        name: "مدير المناسبات",
        role: "event_manager",
        eventQuota: 10,
        isActive: true,
      },
    ]);
    console.log("Default users created:");
    console.log("  - Super Admin: admin / admin123");
    console.log("  - Event Manager: manager / manager123");
  } else {
    console.log("Database already has users, skipping seed.");
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
