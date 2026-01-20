# نظام إدارة المناسبات - Event Access Management System

## Overview
A comprehensive Arabic RTL Event Access Management Web Application (SaaS) designed for event organizers. Features Glassmorphism design with deep purple theme and offline-first PWA capabilities.

## Tech Stack
- **Frontend:** React, TypeScript, TailwindCSS, Framer Motion, Lucide React Icons
- **Backend:** Node.js (Express), PostgreSQL with Drizzle ORM
- **State Management:** TanStack Query

## User Roles (Hierarchical)
1. **مالك النظام (Super Admin):** Full system control, manage all users including admins
2. **مدير النظام (Admin):** Full access to all features - can manage event managers, organizers, all events, guests, check-in, reports, exports (same as super_admin except cannot manage other admins)
3. **مدير المناسبة (Event Manager):** Create events, upload guests, manage their own organizers (limited to their own events)
4. **المنظم (Organizer):** Mobile-optimized check-in for assigned events, offline-capable

### Role Permissions Matrix
| Feature | Super Admin | Admin | Event Manager | Organizer |
|---------|-------------|-------|---------------|-----------|
| Manage Admins | ✅ | ❌ | ❌ | ❌ |
| Manage Event Managers | ✅ | ✅ | ❌ | ❌ |
| Manage Organizers | ✅ | ✅ | ✅ (own) | ❌ |
| View All Events | ✅ | ✅ | ❌ | ❌ |
| Create/Edit Events | ✅ | ✅ | ✅ (own) | ❌ |
| Manage Guests | ✅ | ✅ | ✅ (own) | ❌ |
| Check-in Guests | ✅ | ✅ | ✅ (own) | ✅ (assigned) |
| Export Reports | ✅ | ✅ | ✅ (own) | ❌ |
| View Audit Logs | ✅ | ✅ | ✅ (own) | ❌ |

## Key Features
- Arabic RTL layout with Cairo font
- Glassmorphism purple theme (#5B21B6 to #7C3AED)
- Excel file parsing for guest upload (الاسم, الجوال, الفئة, عدد المرافقين, ملاحظات)
- QR code generation for guests
- Check-in system with duplicate detection
- Audit logging for all actions
- Offline capability for organizers (PWA)
- Comprehensive statistics dashboard for super_admin with detailed analytics
- Full admin management (create, edit, toggle, delete) for super_admin
- Lockout protection: Users cannot disable/delete their own accounts
- Advanced reporting system with 5 report types (super_admin only):
  - Admin reports: Managed users and events overview
  - Event Manager reports: Events and guests statistics
  - Events reports: All events with check-in metrics
  - Guests reports: Detailed guest lists with category breakdown
  - Audit logs: Activity tracking with action type analysis
- Date range filtering for all reports
- Excel export with RTL Arabic formatting
- Site settings page for super_admin to manage social media links
- Social media icons on login page (WhatsApp, Instagram, Facebook, X, LinkedIn)
- Per-Tier Quota/Subscription System:
  - Super admin manages capacity tiers (باقات السعة) with guest limits
  - **Per-tier quotas**: Super admin assigns specific quotas per capacity tier to each event manager (e.g., 3 small tier events, 5 medium tier events)
  - `user_tier_quotas` junction table stores userId, capacityTierId, and quota
  - Event creation validates against tier-specific quotas (blocks if tier quota exhausted or 0)
  - Dashboard shows tier-specific quota breakdown with usage progress
  - Subscriptions page allows editing per-tier quotas with inline UI

## Capacity Tiers (Default)
- باقة صغيرة (0-50 guests)
- باقة متوسطة (51-100 guests)
- باقة كبيرة (101-150 guests)
- باقة ضخمة (151-300 guests)
- باقة مفتوحة (unlimited)

## Default Credentials
- **Super Admin:** username: `admin`, password: `admin123`
- **Event Manager:** username: `manager`, password: `manager123`

## Database Schema
- `users` - System users with role-based access (includes eventQuota for managers)
- `events` - Event information (includes capacityTierId)
- `guests` - Guest list with QR codes
- `event_organizers` - Event-organizer assignments
- `audit_logs` - Action tracking
- `capacity_tiers` - Capacity tier definitions for events
- `user_tier_quotas` - Per-tier quotas for event managers (junction table: userId, capacityTierId, quota)

## API Endpoints
- `/api/auth/*` - Authentication (login, logout, me)
- `/api/users/*` - User management (CRUD, toggle-active)
- `/api/events/*` - Event CRUD
- `/api/events/:id/guests` - Guest management
- `/api/events/:id/upload-guests` - Excel upload
- `/api/guests/:id/check-in` - Check-in endpoint
- `/api/stats/comprehensive` - Detailed statistics for super_admin
- `/api/stats/*` - Dashboard statistics by role

## Running the Application
1. Database is auto-provisioned via PostgreSQL
2. Run `npm run db:push` to sync schema
3. Run `npx tsx server/seed.ts` to create default users
4. Application starts on port 5000

## Project Structure
```
├── client/src/
│   ├── components/    # Reusable UI components
│   ├── pages/         # Route pages
│   ├── lib/           # Utilities and hooks
│   └── App.tsx        # Main app with routing
├── server/
│   ├── routes.ts      # API endpoints
│   ├── storage.ts     # Database operations
│   └── db.ts          # Database connection
└── shared/
    └── schema.ts      # Drizzle schema & types
```

## Security Implementation
- Password hashing: SHA-256 for secure password storage
- Session-based authentication with HTTP-only cookies
- Role-based access control (RBAC) on all API endpoints
- Ownership validation: Event managers can only access their own events
- Organizers can only access events they are assigned to
- Passwords never returned in API responses

## Design Preferences
- Direction: RTL (Arabic)
- Font: Cairo (Google Fonts)
- Theme: Purple Glassmorphism
- Animations: Smooth Framer Motion transitions
- Border radius: xl (rounded corners)
