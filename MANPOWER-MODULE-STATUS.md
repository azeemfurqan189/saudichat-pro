# Manpower Agency Module — Poori List (A to Z)

> **Last updated:** June 10, 2026  
> **Industry type:** `MANPOWER` (Manpower Agency / وكالة عمال)  
> **Live app:** https://saudichat-pro.vercel.app  
> **Backend:** https://saudichat-pro-production.up.railway.app  

Ye file sirf **Manpower + CMMS** section ki hai — kya bana, kahan hai, kaun use karta hai, aur kya abhi baqi hai.

---

## Quick Start (pehli dafa test)

1. Login → Manpower business select karo  
2. **Settings** → **Fix Database** (schema sync)  
3. **Overview** ya **CMMS Hub** → **Load demo data**  
4. Sidebar se modules explore karo  

**Schema SQL file:** `backend/scripts/sync-schema.sql` (sections 1–14)

---

## 3-Level System (Owner → Office → Site)

| Level | Role in app | Kaam |
|-------|-------------|------|
| **OWNER** | `OWNER` | Summary, cost, downtime, approvals (procurement), policy, billing |
| **OFFICE** | `MANAGER`, `OFFICE_STAFF` | Approvals, planning, assets register, timesheets, CMMS control |
| **SITE** | `FIELD_WORKER` | Work requests, assigned work orders, attendance, timesheets |

**Master flow (CMMS):**  
Asset → Work Request → Office Approval → Work Order → Site Execute → Spares Used → Owner Report

---

## A — Agency Overview Dashboard

| Cheez | URL | Status |
|-------|-----|--------|
| Overview (stats + equipment preview + projects) | `/dashboard/[id]` | ✅ Done |
| Grouped quick nav (Command / CMMS / Field / Admin) | Overview + har page | ✅ Done |
| Demo auto-load (empty account) | Overview banner | ✅ Done |

**Kya dikhata hai:** Active projects, on-site today, issued equipment, overdue inspection.

---

## B — Backend API (Manpower)

Base path: `/api/businesses/:businessId/manpower/...`

| Feature | Endpoint | Status |
|---------|----------|--------|
| Client companies | `GET/POST .../clients` | ✅ |
| Projects (sites) | `GET/POST/PATCH/DELETE .../projects` | ✅ |
| Project detail + stats | `GET .../projects/:id` | ✅ |
| Workers pool | `GET/POST .../workers` | ✅ |
| Worker categories (Oil & Gas) | `GET .../worker-categories` | ✅ |
| Placements | `GET/POST .../placements` | ✅ |
| Timesheets | `GET/POST/PATCH .../timesheets` | ✅ |
| Timesheet export Excel | `GET .../timesheets/export` | ✅ |
| Timesheet bulk approve/reject | `POST .../timesheets/bulk-action` | ✅ |
| Timesheet import Excel | `POST .../timesheets/import` | ✅ |
| Pending timesheet queue | `GET .../timesheets/pending` | ✅ |
| OT & policy config | `GET/PATCH .../policy` | ✅ |
| Project attendance | `GET/PUT .../projects/:id/attendance` | ✅ |
| Manager project access | `GET/PUT/DELETE .../projects/:id/access` | ✅ |
| Team pulse (owner sees full team) | `GET .../team-pulse` | ✅ |
| Analytics | `GET .../analytics` | ✅ |
| Live dashboard | `GET .../live-dashboard` | ✅ |
| Demo seed | `POST .../seed-demo` | ✅ |
| DB schema sync | `POST .../sync-schema` | ✅ |
| Equipment board | `GET/POST/PATCH .../equipment` | ✅ |
| Worker QR attendance | `GET .../workers/:id/qr` | ✅ |
| CEO weekly PDF report | `GET .../reports/ceo-pdf` | ✅ |

---

## C — CMMS Backend API

Base path: `/api/businesses/:businessId/cmms/...`

| Module | Endpoint | Status |
|--------|----------|--------|
| Access level (Owner/Office/Site) | `GET .../access` | ✅ |
| Owner dashboard | `GET .../dashboard` | ✅ |
| CMMS demo seed | `POST .../seed-demo` | ✅ |
| Functional locations | `GET/POST .../locations` | ✅ |
| Asset register list | `GET .../assets` | ✅ |
| Work requests | `GET/POST/PATCH .../work-requests` | ✅ |
| Work orders | `GET/PATCH .../work-orders` | ✅ |
| Issue spare to WO | `POST .../work-orders/:id/issue-part` | ✅ |
| PM plans | `GET/POST .../maintenance-plans` | ✅ |
| Auto PM → work orders | `POST .../maintenance-plans/run-due` | ✅ |
| Spare parts | `GET/POST .../spare-parts` | ✅ |
| Procurement | `GET/POST/PATCH .../procurement` | ✅ |

---

## D — Database Models (Manpower + CMMS)

| Model | Kya store karta hai |
|-------|---------------------|
| `ClientCompany` | Aramco, SABIC jese clients |
| `AgencyProject` | Site / project (GPS, headcount, manager) |
| `WorkerProfile` | Worker pool, iqama, skills, QR token |
| `Placement` | Worker → client → project assignment |
| `Timesheet` | Hours, OT, approval workflow |
| `WorkerDailyAttendance` | Site attendance + GPS check-in |
| `ProjectMemberAccess` | Manager permissions per project |
| `AgencyEquipment` | Tools/assets + kanban + inspection dates |
| `FunctionalLocation` | HQ → Warehouse → Site A hierarchy |
| `WorkRequest` | Fault reports (AC not working, etc.) |
| `WorkOrder` | Corrective / preventive jobs |
| `MaintenancePlan` | PM schedule (every 30 days, etc.) |
| `SparePart` | MRO stock + reorder point |
| `WorkOrderPart` | Parts issued to work order |
| `PurchaseRequisition` | Low stock → purchase request |
| `Supplier` | Vendors (shared module) |

**Prisma:** `backend/prisma/schema.prisma`  
**SQL sync:** `backend/scripts/sync-schema.sql`

---

## E — Equipment & Assets

| Page | URL | Kya hai |
|------|-----|---------|
| Equipment board (drag-drop) | `/equipment` | STOCK → ISSUED → INSPECTION → MAINTENANCE columns |
| Compact board on Overview | `/dashboard/[id]` | Preview + link to full board |

**Track hota hai:** Kab di, kitne din site par, return date, last/next inspection.

---

## F — Executive / Owner Tools

| Page | URL | Kya hai |
|------|-----|---------|
| Command Center | `/command-center` | Morning briefing, risk, reminders, Ask Company Anything |
| CMMS Hub | `/cmms` | Owner summary: assets, open WR/WO, PM due, cost, downtime |
| Team Pulse | `/my-work` | Owner = full team; staff = own work |
| Project Access | `/project-access` | Drag-drop manager permissions |
| Manpower Policy | `/manpower-policy` | OT rules, approval stages |
| Manpower Live | `/manpower-live` | Live stats (page exists, nav se hata diya tha) |

---

## G — Frontend Pages (Sidebar — Owner)

Har page: `/dashboard/[businessId]/...`

| # | Nav name | Path | Role | Status |
|---|----------|------|------|--------|
| 1 | Overview | `/` | Owner+ | ✅ |
| 2 | Command Center | `/command-center` | Owner+ | ✅ |
| 3 | Team Pulse | `/my-work` | All | ✅ |
| 4 | Client Companies | `/clients` | Manager+ | ✅ |
| 5 | Projects | `/projects` | Office+ | ✅ |
| 6 | Project detail | `/projects/[id]` | Office+ | ✅ |
| 7 | Equipment & Tools | `/equipment` | Office+ | ✅ |
| 8 | CMMS Hub | `/cmms` | Manager+ | ✅ |
| 9 | Functional Locations | `/locations` | Manager+ | ✅ |
| 10 | Work Requests | `/work-requests` | All (create) | ✅ |
| 11 | Work Orders | `/work-orders` | Office+ | ✅ |
| 12 | Preventive Maintenance | `/maintenance` | Manager+ | ✅ |
| 13 | Spares & Stores | `/spares` | Office+ | ✅ |
| 14 | Procurement | `/procurement` | Manager+ | ✅ |
| 15 | Suppliers (Vendors) | `/suppliers` | Manager+ | ✅ |
| 16 | Worker Pool | `/workers` | Manager+ | ✅ |
| 17 | Placements | `/placements` | Manager+ | ✅ |
| 18 | Timesheets | `/timesheets` | Office+ | ✅ |
| 19 | Schedule & Shifts | `/schedule` | All | ✅ |
| 20 | Attendance | `/attendance` | All | ✅ |
| 21 | Manager Access | `/project-access` | Owner | ✅ |
| 22 | OT & Policies | `/manpower-policy` | Owner | ✅ |
| 23 | Unified Inbox | `/inbox` | All | ✅ |
| 24 | Tasks | `/tasks` | All | ✅ |
| 25 | Staff | `/staff` | Owner+ | ✅ |
| 26 | Settings | `/settings` | All | ✅ |
| 27 | Billing | `/billing` | Owner | 🟡 UI only |

---

## H — Key Frontend Files

| Area | File path |
|------|-----------|
| Nav config | `frontend/src/lib/industry-config.ts` |
| CMMS roles | `frontend/src/lib/cmms-config.ts` |
| API client | `frontend/src/lib/api.ts` |
| UI shell | `frontend/src/components/dashboard/manpower-shell.tsx` |
| Equipment board | `frontend/src/components/dashboard/manpower-equipment-board.tsx` |
| CMMS 3-level banner | `frontend/src/components/dashboard/cmms-structure-banner.tsx` |
| Team pulse | `frontend/src/components/dashboard/manpower-team-pulse.tsx` |
| Projects panel | `frontend/src/components/dashboard/manpower-projects-panel.tsx` |
| Demo banner | `frontend/src/components/dashboard/manpower-demo-banner.tsx` |
| Project access drag-drop | `frontend/src/components/dashboard/project-access-panel.tsx` |

---

## I — Backend Services

| Service | File |
|---------|------|
| Workforce / projects / timesheets | `backend/src/services/` + `workforceController.ts` |
| Executive / Command Center | `executiveBriefingService.ts`, `executiveController.ts` |
| QR attendance | `qrAttendanceService.ts` |
| Equipment | `equipmentService.ts` |
| CMMS | `cmmsService.ts` |
| Demo data | `manpowerDemoSeed.ts` |
| Timesheet approval | `timesheetApprovalService.ts` |
| CEO PDF | `manpowerReportService.ts` |

---

## J — Demo Data (test ke liye)

**Load kahan se:** Overview banner · Projects page · CMMS Hub → **Load demo**

**Demo mein kya aata hai:**
- 5+ client companies (SABIC, Aramco, etc.)
- Multiple projects (Jubail, Dhahran, etc.)
- 10+ workers with categories
- Placements + timesheets + today attendance
- Tasks + iqama expiry alerts
- Company reminders + contract doc (Ask Anything)
- 5 equipment items (kanban board)
- CMMS: 3 locations, work requests, work orders, PM plans, spares, procurement

---

## K — QR Site Attendance

| Cheez | Detail |
|-------|--------|
| Worker QR | Workers page → each worker QR |
| Public check-in | `/check-in/[token]` (GPS geo-fence optional) |
| Project attendance | Project detail → daily present/absent |

---

## L — Timesheet Workflow

```
Office submits → PENDING → Manager → PENDING_ADMIN → Payroll → APPROVED → BILLED
```

- Excel **export** + **import template**
- **Bulk approve/reject** on pending queue
- OT rules from **Manpower Policy**

---

## M — Module Map (aap ki CMMS spec)

| Aap ka module | Hamara page | Level |
|---------------|-------------|-------|
| Asset Management | `/equipment` + `/cmms/assets` | All |
| Functional Locations | `/locations` | Office defines |
| Work Requests | `/work-requests` | Site + Office |
| Work Orders | `/work-orders` | Office → Site |
| Preventive Maintenance | `/maintenance` | Office plans |
| Inventory & Stores | `/spares` | Site + Store |
| Procurement | `/procurement` | Office |
| Vendor Management | `/suppliers` | Office only |
| Condition Monitoring | — | ❌ Not built |
| Owner Dashboard | `/cmms` + `/command-center` | Owner |

---

## N — Git Commits (recent manpower work)

| Commit | Kya add hua |
|--------|-------------|
| `d1b336e` | Project manager access (drag-drop permissions) |
| `31caea6` | Multi-level timesheet approval, OT policy, live dashboard |
| `dd83a83` | Command Center, QR attendance, bulk timesheet import |
| `40796d7` | Demo data + nav cleanup |
| `772702c` | Team Pulse + unified manpower UI |
| `adf3b41` | Equipment drag-drop board |
| `a58968d` | Full 3-level CMMS structure |

---

## O — Deploy

```powershell
cd "saudichat-pro\frontend"
npm run build

cd "c:\...\cruser rojrct"
git push origin main
npx vercel deploy --prod --yes
```

Railway backend auto-deploy from GitHub push.

---

## P — Jo ABHI BANNA BAQI HAI (❌ / 🟡)

### ❌ Not built yet

| Feature | Notes |
|---------|-------|
| **Condition monitoring** | Sensors: temperature, vibration, pressure — no IoT integration |
| **Facial recognition attendance** | QR/manual only abhi |
| **SAP / ERP integration** | — |
| **Auto payroll export** | Timesheets approved hain, payroll system link nahi |
| **Native mobile app** | Web only |
| **Email OAuth** (office notifications) | — |
| **Full relationship graph** | — |
| **Time Machine / audit replay** | — |
| **Billing / Moyasar** | UI only |
| **Condition-based asset alerts** | Manual inspection dates only |

### 🟡 Partial / improve karna hai

| Feature | Gap |
|---------|-----|
| Work order assignment UI | API hai, technician pick list basic hai |
| Procurement PO to vendor | Requisition approve hoti hai, email/PO send nahi |
| Asset full register form | Equipment board strong hai; full asset CRUD form chota hai |
| Manpower Live | Page hai, sidebar se remove — Command Center prefer |
| Analytics for manpower | General analytics page, manpower-specific charts limited |
| Arabic PDF reports | CEO PDF English; full Arabic optional |
| Geo-fence per project | Field exists, admin UI basic |

---

## Q — Role → Kya dikhega (summary)

| Role | Main pages |
|------|------------|
| **OWNER** | Sab kuch + CMMS Hub + Command Center + Procurement approve + Policy |
| **MANAGER** | CMMS + projects + workers + timesheets approve + no billing |
| **OFFICE_STAFF** | Work requests, work orders, spares, timesheets, projects |
| **FIELD_WORKER** | My work, work requests, work orders, timesheets, tasks |

---

## R — Support / Fix Database

Agar error aaye **"schema not ready"** ya 500 on equipment/CMMS:

1. Dashboard → Settings → **Fix Database**  
2. Ya Railway PostgreSQL par `backend/scripts/sync-schema.sql` run karo  

---

*Is file ko kisi ko bhi de sakte ho — poora Manpower + CMMS module A to Z yahan hai.*
