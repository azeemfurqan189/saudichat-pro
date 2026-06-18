-- Minimal manpower migration — paste in Neon SQL Editor if Railway sync still fails
-- Fixes: "Database tables updating" when creating projects

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
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "managerMemberId" TEXT;
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
ALTER TABLE "AgencyProject" ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE INDEX IF NOT EXISTS "AgencyProject_businessId_idx" ON "AgencyProject"("businessId");
CREATE INDEX IF NOT EXISTS "AgencyProject_clientCompanyId_idx" ON "AgencyProject"("clientCompanyId");

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

-- Project Planning (Primavera-style) — required for /planning page
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

-- Planning v3 columns
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

-- Advanced features v4 (Planning S-curve, CMMS BOM, Finance, HR)
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "assetQrToken" TEXT;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "runningHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AgencyEquipment" ADD COLUMN IF NOT EXISTS "parentEquipmentId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "AgencyEquipment_assetQrToken_key" ON "AgencyEquipment"("assetQrToken");

ALTER TABLE "pm_plans" ADD COLUMN IF NOT EXISTS "conditionField" TEXT;
ALTER TABLE "pm_plans" ADD COLUMN IF NOT EXISTS "conditionThreshold" DOUBLE PRECISION;
ALTER TABLE "pm_plans" ADD COLUMN IF NOT EXISTS "conditionOperator" TEXT;

CREATE TABLE IF NOT EXISTS "asset_components" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "equipmentId" TEXT NOT NULL,
  "parentComponentId" TEXT, "name" TEXT NOT NULL, "partNumber" TEXT, "sparePartId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_components_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "asset_bom_items" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "equipmentId" TEXT NOT NULL,
  "componentId" TEXT, "sparePartId" TEXT NOT NULL, "qty" DOUBLE PRECISION NOT NULL DEFAULT 1, "notes" TEXT,
  CONSTRAINT "asset_bom_items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "equipment_meter_readings" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "equipmentId" TEXT NOT NULL,
  "readingType" TEXT NOT NULL DEFAULT 'HOURS', "value" DOUBLE PRECISION NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "source" TEXT NOT NULL DEFAULT 'MANUAL', "notes" TEXT,
  CONSTRAINT "equipment_meter_readings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "calibration_records" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "equipmentId" TEXT,
  "instrumentName" TEXT NOT NULL, "lastCalibratedAt" TIMESTAMP(3), "nextDueAt" TIMESTAMP(3),
  "certNumber" TEXT, "status" TEXT NOT NULL DEFAULT 'VALID', "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calibration_records_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "project_financial_entries" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "agencyProjectId" TEXT, "scheduleProjectId" TEXT,
  "category" TEXT NOT NULL, "amountSar" DOUBLE PRECISION NOT NULL, "reference" TEXT, "description" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_financial_entries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "project_milestones" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "agencyProjectId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "triggerPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "invoiceAmountSar" DOUBLE PRECISION NOT NULL, "retentionPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "invoicedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "subcontractors" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "name" TEXT NOT NULL, "trade" TEXT,
  "contactEmail" TEXT, "contactPhone" TEXT, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "subcontractor_pos" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "subcontractorId" TEXT NOT NULL, "projectId" TEXT,
  "number" TEXT NOT NULL, "amountSar" DOUBLE PRECISION NOT NULL, "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "description" TEXT, "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subcontractor_pos_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "subcontractor_timesheets" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "subcontractorId" TEXT NOT NULL, "projectId" TEXT,
  "workDate" TIMESTAMP(3) NOT NULL, "hours" DOUBLE PRECISION NOT NULL, "amountSar" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subcontractor_timesheets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "subcontractor_invoices" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "subcontractorId" TEXT NOT NULL,
  "number" TEXT NOT NULL, "amountSar" DOUBLE PRECISION NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3), "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subcontractor_invoices_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "worker_leave_balances" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "workerProfileId" TEXT NOT NULL,
  "leaveType" TEXT NOT NULL DEFAULT 'ANNUAL', "balanceDays" DOUBLE PRECISION NOT NULL DEFAULT 30, "usedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "worker_leave_balances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "worker_leave_balances_workerProfileId_leaveType_key" ON "worker_leave_balances"("workerProfileId", "leaveType");
CREATE TABLE IF NOT EXISTS "worker_leave_requests" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "workerProfileId" TEXT NOT NULL,
  "leaveType" TEXT NOT NULL DEFAULT 'ANNUAL', "startDate" TIMESTAMP(3) NOT NULL, "endDate" TIMESTAMP(3) NOT NULL,
  "days" DOUBLE PRECISION NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_leave_requests_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "worker_competencies" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "workerProfileId" TEXT NOT NULL,
  "skill" TEXT NOT NULL, "grade" TEXT NOT NULL DEFAULT 'B', "ratedByMemberId" TEXT, "ratedAt" TIMESTAMP(3), "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_competencies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "worker_competencies_workerProfileId_skill_key" ON "worker_competencies"("workerProfileId", "skill");
CREATE TABLE IF NOT EXISTS "worker_successions" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "workerProfileId" TEXT NOT NULL, "replacementWorkerId" TEXT NOT NULL,
  "role" TEXT, "priority" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_successions_pkey" PRIMARY KEY ("id")
);
