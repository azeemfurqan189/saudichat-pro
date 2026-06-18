-- Critical schema sync for production (Neon / Supabase SQL editor OR prisma db execute)
-- Run once if prisma db push fails on Railway.

-- 1) MANPOWER business type
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'MANPOWER';

-- 2) MemberRole enum
DO $$ BEGIN
  CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MANAGER', 'OFFICE_STAFF', 'FIELD_WORKER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) BusinessMember table
CREATE TABLE IF NOT EXISTS "BusinessMember" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "MemberRole" NOT NULL DEFAULT 'OFFICE_STAFF',
  "managerId" TEXT,
  "department" TEXT,
  "title" TEXT,
  "permissions" JSONB NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "joinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessMember_businessId_userId_key"
  ON "BusinessMember"("businessId", "userId");
CREATE INDEX IF NOT EXISTS "BusinessMember_businessId_idx" ON "BusinessMember"("businessId");
CREATE INDEX IF NOT EXISTS "BusinessMember_userId_idx" ON "BusinessMember"("userId");
CREATE INDEX IF NOT EXISTS "BusinessMember_managerId_idx" ON "BusinessMember"("managerId");
CREATE INDEX IF NOT EXISTS "BusinessMember_role_idx" ON "BusinessMember"("role");

DO $$ BEGIN
  ALTER TABLE "BusinessMember"
    ADD CONSTRAINT "BusinessMember_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BusinessMember"
    ADD CONSTRAINT "BusinessMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BusinessMember"
    ADD CONSTRAINT "BusinessMember_managerId_fkey"
    FOREIGN KEY ("managerId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) Staff link column (optional)
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "businessMemberId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Staff_businessMemberId_key" ON "Staff"("businessMemberId");

DO $$ BEGIN
  ALTER TABLE "Staff"
    ADD CONSTRAINT "Staff_businessMemberId_fkey"
    FOREIGN KEY ("businessMemberId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5) Manpower base tables (must exist before AgencyProject)

CREATE TABLE IF NOT EXISTS "ClientCompany" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientCompany_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ClientCompany_businessId_idx" ON "ClientCompany"("businessId");
DO $$ BEGIN
  ALTER TABLE "ClientCompany"
    ADD CONSTRAINT "ClientCompany_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WorkerProfile" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "memberId" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "nationality" TEXT,
  "iqamaNumber" TEXT,
  "iqamaExpiry" TIMESTAMP(3),
  "skills" JSONB NOT NULL DEFAULT '[]',
  "hourlyRate" DOUBLE PRECISION,
  "contractType" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkerProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WorkerProfile_businessId_idx" ON "WorkerProfile"("businessId");
CREATE INDEX IF NOT EXISTS "WorkerProfile_status_idx" ON "WorkerProfile"("status");
CREATE INDEX IF NOT EXISTS "WorkerProfile_memberId_idx" ON "WorkerProfile"("memberId");
DO $$ BEGIN
  ALTER TABLE "WorkerProfile"
    ADD CONSTRAINT "WorkerProfile_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Placement" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "workerProfileId" TEXT NOT NULL,
  "clientCompanyId" TEXT NOT NULL,
  "projectId" TEXT,
  "siteName" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Placement_businessId_idx" ON "Placement"("businessId");
CREATE INDEX IF NOT EXISTS "Placement_workerProfileId_idx" ON "Placement"("workerProfileId");
CREATE INDEX IF NOT EXISTS "Placement_clientCompanyId_idx" ON "Placement"("clientCompanyId");
DO $$ BEGIN
  ALTER TABLE "Placement" ADD CONSTRAINT "Placement_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Placement" ADD CONSTRAINT "Placement_workerProfileId_fkey"
    FOREIGN KEY ("workerProfileId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Placement" ADD CONSTRAINT "Placement_clientCompanyId_fkey"
    FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Timesheet" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "workerProfileId" TEXT NOT NULL,
  "clientCompanyId" TEXT,
  "projectId" TEXT,
  "placementId" TEXT,
  "workDate" TIMESTAMP(3) NOT NULL,
  "hoursWorked" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Timesheet_businessId_idx" ON "Timesheet"("businessId");
CREATE INDEX IF NOT EXISTS "Timesheet_workerProfileId_idx" ON "Timesheet"("workerProfileId");
CREATE INDEX IF NOT EXISTS "Timesheet_workDate_idx" ON "Timesheet"("workDate");
DO $$ BEGIN
  ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_workerProfileId_fkey"
    FOREIGN KEY ("workerProfileId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_clientCompanyId_fkey"
    FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_placementId_fkey"
    FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6) AgencyProject table (manpower projects)
CREATE TABLE IF NOT EXISTS "AgencyProject" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "clientCompanyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "siteName" TEXT,
  "siteAddress" TEXT,
  "city" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "industryTag" TEXT,
  "contractRef" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "headcount" INTEGER,
  "managerMemberId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgencyProject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgencyProject_businessId_idx" ON "AgencyProject"("businessId");
CREATE INDEX IF NOT EXISTS "AgencyProject_clientCompanyId_idx" ON "AgencyProject"("clientCompanyId");
CREATE INDEX IF NOT EXISTS "AgencyProject_status_idx" ON "AgencyProject"("status");
CREATE INDEX IF NOT EXISTS "AgencyProject_managerMemberId_idx" ON "AgencyProject"("managerMemberId");

DO $$ BEGIN
  ALTER TABLE "AgencyProject"
    ADD CONSTRAINT "AgencyProject_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AgencyProject"
    ADD CONSTRAINT "AgencyProject_clientCompanyId_fkey"
    FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AgencyProject"
    ADD CONSTRAINT "AgencyProject_managerMemberId_fkey"
    FOREIGN KEY ("managerMemberId") REFERENCES "BusinessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7) Link placements and timesheets to projects (if tables existed before AgencyProject)
ALTER TABLE "Placement" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
CREATE INDEX IF NOT EXISTS "Placement_projectId_idx" ON "Placement"("projectId");

DO $$ BEGIN
  ALTER TABLE "Placement"
    ADD CONSTRAINT "Placement_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "AgencyProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
CREATE INDEX IF NOT EXISTS "Timesheet_projectId_idx" ON "Timesheet"("projectId");

DO $$ BEGIN
  ALTER TABLE "Timesheet"
    ADD CONSTRAINT "Timesheet_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "AgencyProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8) Extra columns on existing tables
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "iqamaExpiry" TIMESTAMP(3);
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "loginPassword" TEXT;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "defaultHours" DOUBLE PRECISION DEFAULT 8;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "managerMemberId" TEXT;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "siteName" TEXT;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "siteAddress" TEXT;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "industryTag" TEXT;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "contractRef" TEXT;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "headcount" INTEGER;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "regularHours" DOUBLE PRECISION;
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "overtimeHours" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "WorkerProfile_category_idx" ON "WorkerProfile"("category");

-- 9) Worker daily attendance (project workers — present / absent)
CREATE TABLE IF NOT EXISTS "WorkerDailyAttendance" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "workerProfileId" TEXT NOT NULL,
  "projectId" TEXT,
  "workDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PRESENT',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkerDailyAttendance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkerDailyAttendance_businessId_idx" ON "WorkerDailyAttendance"("businessId");
CREATE INDEX IF NOT EXISTS "WorkerDailyAttendance_projectId_idx" ON "WorkerDailyAttendance"("projectId");
CREATE INDEX IF NOT EXISTS "WorkerDailyAttendance_workDate_idx" ON "WorkerDailyAttendance"("workDate");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkerDailyAttendance_workerProfileId_projectId_workDate_key"
  ON "WorkerDailyAttendance"("workerProfileId", "projectId", "workDate");

DO $$ BEGIN
  ALTER TABLE "WorkerDailyAttendance"
    ADD CONSTRAINT "WorkerDailyAttendance_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkerDailyAttendance"
    ADD CONSTRAINT "WorkerDailyAttendance_workerProfileId_fkey"
    FOREIGN KEY ("workerProfileId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkerDailyAttendance"
    ADD CONSTRAINT "WorkerDailyAttendance_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "AgencyProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 10) Project manager access (owner assigns permissions per project)
CREATE TABLE IF NOT EXISTS "ProjectMemberAccess" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "permissions" JSONB NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMemberAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMemberAccess_projectId_memberId_key"
  ON "ProjectMemberAccess"("projectId", "memberId");
CREATE INDEX IF NOT EXISTS "ProjectMemberAccess_businessId_idx" ON "ProjectMemberAccess"("businessId");
CREATE INDEX IF NOT EXISTS "ProjectMemberAccess_memberId_idx" ON "ProjectMemberAccess"("memberId");
CREATE INDEX IF NOT EXISTS "ProjectMemberAccess_projectId_idx" ON "ProjectMemberAccess"("projectId");

DO $$ BEGIN
  ALTER TABLE "ProjectMemberAccess"
    ADD CONSTRAINT "ProjectMemberAccess_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectMemberAccess"
    ADD CONSTRAINT "ProjectMemberAccess_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "AgencyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectMemberAccess"
    ADD CONSTRAINT "ProjectMemberAccess_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "BusinessMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 11) Timesheet approval workflow columns
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "rejectReason" TEXT;
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "submittedByMemberId" TEXT;
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "approvedByMemberId" TEXT;
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "rejectedByMemberId" TEXT;
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "overtimePay" DOUBLE PRECISION;
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "Timesheet_status_idx" ON "Timesheet"("status");

-- 12) QR attendance + GPS check-in
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "attendanceQrToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "WorkerProfile_attendanceQrToken_key"
  ON "WorkerProfile"("attendanceQrToken") WHERE "attendanceQrToken" IS NOT NULL;

ALTER TABLE "WorkerDailyAttendance" ADD COLUMN IF NOT EXISTS "checkInMethod" TEXT DEFAULT 'MANUAL';
ALTER TABLE "WorkerDailyAttendance" ADD COLUMN IF NOT EXISTS "checkInLat" DOUBLE PRECISION;
ALTER TABLE "WorkerDailyAttendance" ADD COLUMN IF NOT EXISTS "checkInLng" DOUBLE PRECISION;

-- 13) Agency equipment board (drag-drop kanban)
CREATE TABLE IF NOT EXISTS "AgencyEquipment" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "serialNumber" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "boardColumn" TEXT NOT NULL DEFAULT 'STOCK',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "projectId" TEXT,
  "workerProfileId" TEXT,
  "issuedAt" TIMESTAMP(3),
  "expectedReturnAt" TIMESTAMP(3),
  "lastInspectionAt" TIMESTAMP(3),
  "nextInspectionAt" TIMESTAMP(3),
  "condition" TEXT NOT NULL DEFAULT 'GOOD',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgencyEquipment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgencyEquipment_businessId_idx" ON "AgencyEquipment"("businessId");
CREATE INDEX IF NOT EXISTS "AgencyEquipment_boardColumn_idx" ON "AgencyEquipment"("boardColumn");
CREATE INDEX IF NOT EXISTS "AgencyEquipment_projectId_idx" ON "AgencyEquipment"("projectId");
CREATE INDEX IF NOT EXISTS "AgencyEquipment_workerProfileId_idx" ON "AgencyEquipment"("workerProfileId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AgencyEquipment_businessId_fkey') THEN
    ALTER TABLE "AgencyEquipment" ADD CONSTRAINT "AgencyEquipment_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AgencyEquipment_projectId_fkey') THEN
    ALTER TABLE "AgencyEquipment" ADD CONSTRAINT "AgencyEquipment_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "AgencyProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AgencyEquipment_workerProfileId_fkey') THEN
    ALTER TABLE "AgencyEquipment" ADD CONSTRAINT "AgencyEquipment_workerProfileId_fkey"
      FOREIGN KEY ("workerProfileId") REFERENCES "WorkerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 14) CMMS: extend assets + functional locations, work requests/orders, PM, spares, procurement
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "assetTag" TEXT;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "functionalLocationId" TEXT;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "criticality" TEXT DEFAULT 'MEDIUM';
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "assetStatus" TEXT DEFAULT 'ACTIVE';
CREATE INDEX IF NOT EXISTS "AgencyEquipment_functionalLocationId_idx" ON "AgencyEquipment"("functionalLocationId");
CREATE INDEX IF NOT EXISTS "AgencyEquipment_assetTag_idx" ON "AgencyEquipment"("assetTag");

ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "assetNumber" TEXT;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "installationDate" TIMESTAMP(3);
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "purchaseCost" DOUBLE PRECISION;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "replacementCost" DOUBLE PRECISION;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "warrantyExpiry" TIMESTAMP(3);
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "drawingUrl" TEXT;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "documentUrls" JSONB;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "photoUrls" JSONB;
CREATE INDEX IF NOT EXISTS "AgencyEquipment_assetNumber_idx" ON "AgencyEquipment"("assetNumber");

CREATE TABLE IF NOT EXISTS "FunctionalLocation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "projectId" TEXT,
  "parentId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'SITE',
  "address" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FunctionalLocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FunctionalLocation_businessId_code_key" ON "FunctionalLocation"("businessId", "code");
CREATE INDEX IF NOT EXISTS "FunctionalLocation_businessId_idx" ON "FunctionalLocation"("businessId");
CREATE INDEX IF NOT EXISTS "FunctionalLocation_parentId_idx" ON "FunctionalLocation"("parentId");
ALTER TABLE "FunctionalLocation" ADD COLUMN IF NOT EXISTS "description" TEXT;

CREATE TABLE IF NOT EXISTS "LocationHierarchy" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "ancestorId" TEXT NOT NULL,
  "descendantId" TEXT NOT NULL,
  "depth" INTEGER NOT NULL,
  CONSTRAINT "LocationHierarchy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LocationHierarchy_ancestorId_descendantId_key" ON "LocationHierarchy"("ancestorId", "descendantId");
CREATE INDEX IF NOT EXISTS "LocationHierarchy_businessId_idx" ON "LocationHierarchy"("businessId");
CREATE INDEX IF NOT EXISTS "LocationHierarchy_descendantId_idx" ON "LocationHierarchy"("descendantId");
CREATE INDEX IF NOT EXISTS "LocationHierarchy_ancestorId_depth_idx" ON "LocationHierarchy"("ancestorId", "depth");

CREATE TABLE IF NOT EXISTS "WorkRequest" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "equipmentId" TEXT,
  "functionalLocationId" TEXT,
  "projectId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "requestedByMemberId" TEXT,
  "approvedByMemberId" TEXT,
  "rejectedReason" TEXT,
  "workOrderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkRequest_businessId_number_key" ON "WorkRequest"("businessId", "number");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkRequest_workOrderId_key" ON "WorkRequest"("workOrderId") WHERE "workOrderId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "WorkOrder" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'CORRECTIVE',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "equipmentId" TEXT,
  "functionalLocationId" TEXT,
  "projectId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assignedMemberId" TEXT,
  "scheduledStart" TIMESTAMP(3),
  "scheduledEnd" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "downtimeMinutes" INTEGER,
  "laborCost" DOUBLE PRECISION,
  "partsCost" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrder_businessId_number_key" ON "WorkOrder"("businessId", "number");

CREATE TABLE IF NOT EXISTS "MaintenancePlan" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "equipmentId" TEXT,
  "functionalLocationId" TEXT,
  "name" TEXT NOT NULL,
  "intervalDays" INTEGER,
  "nextDueAt" TIMESTAMP(3),
  "lastGeneratedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);
ALTER TABLE IF EXISTS "MaintenancePlan" RENAME TO "pm_plans";

CREATE TABLE IF NOT EXISTS "pm_plans" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "equipmentId" TEXT,
  "functionalLocationId" TEXT,
  "name" TEXT NOT NULL,
  "pmType" TEXT NOT NULL DEFAULT 'INSPECTION',
  "triggerType" TEXT NOT NULL DEFAULT 'TIME',
  "preset" TEXT,
  "intervalDays" INTEGER,
  "intervalHours" INTEGER,
  "meterBaseline" DOUBLE PRECISION,
  "nextDueAt" TIMESTAMP(3),
  "lastGeneratedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pm_plans_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "pm_plans" ADD COLUMN IF NOT EXISTS "pmType" TEXT NOT NULL DEFAULT 'INSPECTION';
ALTER TABLE "pm_plans" ADD COLUMN IF NOT EXISTS "triggerType" TEXT NOT NULL DEFAULT 'TIME';
ALTER TABLE "pm_plans" ADD COLUMN IF NOT EXISTS "preset" TEXT;
ALTER TABLE "pm_plans" ADD COLUMN IF NOT EXISTS "intervalHours" INTEGER;
ALTER TABLE "pm_plans" ADD COLUMN IF NOT EXISTS "meterBaseline" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "pm_plans_businessId_idx" ON "pm_plans"("businessId");
CREATE INDEX IF NOT EXISTS "pm_plans_nextDueAt_idx" ON "pm_plans"("nextDueAt");

CREATE TABLE IF NOT EXISTS "pm_schedules" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "dueAtHours" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "generatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pm_schedules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "pm_schedules_businessId_idx" ON "pm_schedules"("businessId");
CREATE INDEX IF NOT EXISTS "pm_schedules_planId_idx" ON "pm_schedules"("planId");
CREATE INDEX IF NOT EXISTS "pm_schedules_dueAt_idx" ON "pm_schedules"("dueAt");
CREATE INDEX IF NOT EXISTS "pm_schedules_status_idx" ON "pm_schedules"("status");

CREATE TABLE IF NOT EXISTS "pm_history" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "workOrderId" TEXT,
  "pmType" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'GENERATED',
  "workOrderNumber" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pm_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "pm_history_businessId_idx" ON "pm_history"("businessId");
CREATE INDEX IF NOT EXISTS "pm_history_planId_idx" ON "pm_history"("planId");
CREATE INDEX IF NOT EXISTS "pm_history_generatedAt_idx" ON "pm_history"("generatedAt");

CREATE TABLE IF NOT EXISTS "SparePart" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'EA',
  "stockQty" INTEGER NOT NULL DEFAULT 0,
  "reorderPoint" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DOUBLE PRECISION,
  "supplierId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SparePart_businessId_sku_key" ON "SparePart"("businessId", "sku");
ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "storeLocation" TEXT;
ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "binCode" TEXT;
CREATE INDEX IF NOT EXISTS "SparePart_category_idx" ON "SparePart"("category");

CREATE TABLE IF NOT EXISTS "inventory_transactions" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "sparePartId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "qty" DOUBLE PRECISION NOT NULL,
  "unitCost" DOUBLE PRECISION,
  "reference" TEXT,
  "workOrderId" TEXT,
  "fromLocation" TEXT,
  "toLocation" TEXT,
  "notes" TEXT,
  "performedByMemberId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_transactions_businessId_idx" ON "inventory_transactions"("businessId");
CREATE INDEX IF NOT EXISTS "inventory_transactions_sparePartId_idx" ON "inventory_transactions"("sparePartId");
CREATE INDEX IF NOT EXISTS "inventory_transactions_type_idx" ON "inventory_transactions"("type");
CREATE INDEX IF NOT EXISTS "inventory_transactions_createdAt_idx" ON "inventory_transactions"("createdAt");

CREATE TABLE IF NOT EXISTS "WorkOrderPart" (
  "id" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "sparePartId" TEXT NOT NULL,
  "qtyPlanned" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "qtyIssued" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unitCost" DOUBLE PRECISION,
  CONSTRAINT "WorkOrderPart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseRequisition" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "workOrderId" TEXT,
  "supplierId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "lines" JSONB NOT NULL DEFAULT '[]',
  "totalCost" DOUBLE PRECISION,
  "requestedByMemberId" TEXT,
  "approvedByMemberId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseRequisition_businessId_number_key" ON "PurchaseRequisition"("businessId", "number");
ALTER TABLE IF EXISTS "PurchaseRequisition" RENAME TO "purchase_requests";
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "sparePartId" TEXT;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT;
CREATE INDEX IF NOT EXISTS "purchase_requests_sparePartId_idx" ON "purchase_requests"("sparePartId");
CREATE INDEX IF NOT EXISTS "purchase_requests_status_idx" ON "purchase_requests"("status");

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "requisitionId" TEXT NOT NULL,
  "supplierId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "lines" JSONB NOT NULL DEFAULT '[]',
  "totalCost" DOUBLE PRECISION,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentToVendorAt" TIMESTAMP(3),
  "inTransitAt" TIMESTAMP(3),
  "expectedDeliveryAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_requisitionId_key" ON "purchase_orders"("requisitionId");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_businessId_number_key" ON "purchase_orders"("businessId", "number");
CREATE INDEX IF NOT EXISTS "purchase_orders_businessId_idx" ON "purchase_orders"("businessId");
CREATE INDEX IF NOT EXISTS "purchase_orders_status_idx" ON "purchase_orders"("status");

CREATE TABLE IF NOT EXISTS "cmms_finance_config" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "erpSystem" TEXT NOT NULL DEFAULT 'SAP',
  "erpEndpoint" TEXT,
  "companyCode" TEXT,
  "clientId" TEXT,
  "apiKey" TEXT,
  "glAccount" TEXT NOT NULL DEFAULT '6100-MAINT',
  "costCenter" TEXT NOT NULL DEFAULT 'MAINT-001',
  "isConnected" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "lastSyncMessage" TEXT,
  "annualBudget" DOUBLE PRECISION NOT NULL DEFAULT 600000,
  "laborHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 85,
  "monthlyBudgets" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cmms_finance_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cmms_finance_config_businessId_key" ON "cmms_finance_config"("businessId");
CREATE INDEX IF NOT EXISTS "cmms_finance_config_businessId_idx" ON "cmms_finance_config"("businessId");

CREATE TABLE IF NOT EXISTS "cmms_hr_config" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "hrSystem" TEXT NOT NULL DEFAULT 'SAP_SUCCESSFACTORS',
  "hrEndpoint" TEXT,
  "companyCode" TEXT,
  "apiKey" TEXT,
  "isConnected" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "lastSyncMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cmms_hr_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cmms_hr_config_businessId_key" ON "cmms_hr_config"("businessId");
CREATE INDEX IF NOT EXISTS "cmms_hr_config_businessId_idx" ON "cmms_hr_config"("businessId");

CREATE TABLE IF NOT EXISTS "worker_certifications" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "workerProfileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "issuer" TEXT,
  "certNumber" TEXT,
  "issuedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'VALID',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_certifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "worker_certifications_businessId_idx" ON "worker_certifications"("businessId");
CREATE INDEX IF NOT EXISTS "worker_certifications_workerProfileId_idx" ON "worker_certifications"("workerProfileId");
CREATE INDEX IF NOT EXISTS "worker_certifications_expiresAt_idx" ON "worker_certifications"("expiresAt");
CREATE INDEX IF NOT EXISTS "worker_certifications_status_idx" ON "worker_certifications"("status");

CREATE TABLE IF NOT EXISTS "worker_training" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "workerProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "trainingType" TEXT NOT NULL DEFAULT 'SAFETY',
  "provider" TEXT,
  "completedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "hours" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_training_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "worker_training_businessId_idx" ON "worker_training"("businessId");
CREATE INDEX IF NOT EXISTS "worker_training_workerProfileId_idx" ON "worker_training"("workerProfileId");
CREATE INDEX IF NOT EXISTS "worker_training_status_idx" ON "worker_training"("status");

CREATE TABLE IF NOT EXISTS "cmms_notification_config" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "eventRules" JSONB NOT NULL DEFAULT '{}',
  "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cmms_notification_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cmms_notification_config_businessId_key" ON "cmms_notification_config"("businessId");
CREATE INDEX IF NOT EXISTS "cmms_notification_config_businessId_idx" ON "cmms_notification_config"("businessId");

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "recipient" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notification_deliveries_businessId_idx" ON "notification_deliveries"("businessId");
CREATE INDEX IF NOT EXISTS "notification_deliveries_channel_idx" ON "notification_deliveries"("channel");
CREATE INDEX IF NOT EXISTS "notification_deliveries_createdAt_idx" ON "notification_deliveries"("createdAt");

CREATE TABLE IF NOT EXISTS "cmms_security_config" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "roleMatrix" JSONB NOT NULL DEFAULT '{}',
  "memberAssignments" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cmms_security_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cmms_security_config_businessId_key" ON "cmms_security_config"("businessId");
CREATE INDEX IF NOT EXISTS "cmms_security_config_businessId_idx" ON "cmms_security_config"("businessId");

CREATE TABLE IF NOT EXISTS "MemberInvite" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MemberInvite_token_key" ON "MemberInvite"("token");
CREATE INDEX IF NOT EXISTS "MemberInvite_businessId_idx" ON "MemberInvite"("businessId");
CREATE INDEX IF NOT EXISTS "MemberInvite_userId_idx" ON "MemberInvite"("userId");
CREATE INDEX IF NOT EXISTS "MemberInvite_memberId_idx" ON "MemberInvite"("memberId");
CREATE INDEX IF NOT EXISTS "MemberInvite_expiresAt_idx" ON "MemberInvite"("expiresAt");

-- Project Planning (Primavera-style)
CREATE TABLE IF NOT EXISTS "programs" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "programs_businessId_idx" ON "programs"("businessId");

CREATE TABLE IF NOT EXISTS "schedule_projects" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "programId" TEXT,
  "agencyProjectId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "plannedStart" TIMESTAMP(3),
  "plannedFinish" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PLANNING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "schedule_projects_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "schedule_projects_businessId_idx" ON "schedule_projects"("businessId");
CREATE INDEX IF NOT EXISTS "schedule_projects_programId_idx" ON "schedule_projects"("programId");
CREATE INDEX IF NOT EXISTS "schedule_projects_agencyProjectId_idx" ON "schedule_projects"("agencyProjectId");

CREATE TABLE IF NOT EXISTS "wbs_nodes" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "parentId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wbs_nodes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "wbs_nodes_businessId_idx" ON "wbs_nodes"("businessId");
CREATE INDEX IF NOT EXISTS "wbs_nodes_projectId_idx" ON "wbs_nodes"("projectId");
CREATE INDEX IF NOT EXISTS "wbs_nodes_parentId_idx" ON "wbs_nodes"("parentId");

CREATE TABLE IF NOT EXISTS "schedule_activities" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "wbsNodeId" TEXT,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "durationDays" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "plannedStart" TIMESTAMP(3),
  "plannedFinish" TIMESTAMP(3),
  "percentComplete" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "totalFloat" DOUBLE PRECISION,
  "earlyStart" TIMESTAMP(3),
  "earlyFinish" TIMESTAMP(3),
  "lateStart" TIMESTAMP(3),
  "lateFinish" TIMESTAMP(3),
  "laborCost" DOUBLE PRECISION,
  "materialCost" DOUBLE PRECISION,
  "workOrderId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "schedule_activities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "schedule_activities_workOrderId_key" ON "schedule_activities"("workOrderId");
CREATE INDEX IF NOT EXISTS "schedule_activities_businessId_idx" ON "schedule_activities"("businessId");
CREATE INDEX IF NOT EXISTS "schedule_activities_projectId_idx" ON "schedule_activities"("projectId");
CREATE INDEX IF NOT EXISTS "schedule_activities_wbsNodeId_idx" ON "schedule_activities"("wbsNodeId");

CREATE TABLE IF NOT EXISTS "activity_dependencies" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "predecessorId" TEXT NOT NULL,
  "successorId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'FS',
  "lagDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "activity_dependencies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "activity_dependencies_predecessorId_successorId_key" ON "activity_dependencies"("predecessorId", "successorId");
CREATE INDEX IF NOT EXISTS "activity_dependencies_businessId_idx" ON "activity_dependencies"("businessId");
CREATE INDEX IF NOT EXISTS "activity_dependencies_projectId_idx" ON "activity_dependencies"("projectId");

CREATE TABLE IF NOT EXISTS "activity_resources" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "workerProfileId" TEXT,
  "tradeRole" TEXT,
  "units" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "hours" DOUBLE PRECISION,
  CONSTRAINT "activity_resources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "activity_resources_businessId_idx" ON "activity_resources"("businessId");
CREATE INDEX IF NOT EXISTS "activity_resources_activityId_idx" ON "activity_resources"("activityId");

CREATE TABLE IF NOT EXISTS "activity_materials" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "sparePartId" TEXT,
  "description" TEXT,
  "plannedQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitCost" DOUBLE PRECISION,
  CONSTRAINT "activity_materials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "activity_materials_businessId_idx" ON "activity_materials"("businessId");
CREATE INDEX IF NOT EXISTS "activity_materials_activityId_idx" ON "activity_materials"("activityId");

CREATE TABLE IF NOT EXISTS "schedule_baselines" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Baseline 1',
  "snapshot" JSONB NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "schedule_baselines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "schedule_baselines_businessId_idx" ON "schedule_baselines"("businessId");
CREATE INDEX IF NOT EXISTS "schedule_baselines_projectId_idx" ON "schedule_baselines"("projectId");

ALTER TABLE "schedule_projects" ADD COLUMN IF NOT EXISTS "calendarConfig" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "schedule_projects" ADD COLUMN IF NOT EXISTS "penaltyPerDay" DOUBLE PRECISION NOT NULL DEFAULT 15000;
ALTER TABLE "schedule_projects" ADD COLUMN IF NOT EXISTS "shiftHours" DOUBLE PRECISION NOT NULL DEFAULT 8;
ALTER TABLE "schedule_activities" ADD COLUMN IF NOT EXISTS "startOverrideDays" DOUBLE PRECISION;
ALTER TABLE "schedule_activities" ADD COLUMN IF NOT EXISTS "equipmentTag" TEXT;

CREATE TABLE IF NOT EXISTS "schedule_change_orders" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "scopeChange" TEXT,
  "costImpactSar" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "scheduleImpactDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "affectsBaseline" BOOLEAN NOT NULL DEFAULT true,
  "requestedByMemberId" TEXT,
  "approvedByMemberId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "changeLog" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "schedule_change_orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "schedule_change_orders_businessId_idx" ON "schedule_change_orders"("businessId");
CREATE INDEX IF NOT EXISTS "schedule_change_orders_projectId_idx" ON "schedule_change_orders"("projectId");
CREATE INDEX IF NOT EXISTS "schedule_change_orders_status_idx" ON "schedule_change_orders"("status");
