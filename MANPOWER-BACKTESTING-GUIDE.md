# SaudiChat Pro — Manpower Section A to Z Backtesting Guide

> **Roman Urdu + English** — yeh file real backtesting ke liye hai. Kuch miss na ho is liye har page, har role, har connection, aur test step likha gaya hai.

---

## 1. System ka big picture (sab kuch kaise jura hai)

Manpower agency app ka flow yeh hai:

```
OWNER / MANAGER (Office)
        │
        ├── Client Company banata hai (SABIC, Aramco...)
        │         │
        │         └── Project banata hai (site, headcount, manager)
        │                   │
        │                   ├── Worker Profile (labour database)
        │                   │         │
        │                   │         └── Placement (worker ↔ project assign)
        │                   │                   │
        │                   │                   ├── Daily Attendance (Present/Absent)
        │                   │                   └── Timesheet (hours + OT)
        │                   │                             │
        │                   │                             └── Approval → Billed
        │                   │
        │                   ├── Project Access (kis manager ko kya permission)
        │                   └── Equipment (tools PPE site par)
        │
        ├── Staff / Team (login wale users — Manager, Office, Field)
        └── CMMS (maintenance side — assets, work orders, spares)
```

**Zaroori samjho:**
- **Worker Profile** = labour/worker (iqama, rate, category) — yeh **login user nahi** hota (generally)
- **BusinessMember / Staff** = team jo **app login** karte hain (Owner, Manager, Office, Field)
- **Client** → **Project** → **Placement** → **Timesheet** = core money flow
- **CMMS** = alag maintenance module lekin same dashboard mein (equipment, work orders, etc.)

---

## 2. Char roles — kon kya kar sakta hai

| Role | Urdu mein | Sidebar mein kya dikhega | Kya NAHI kar sakta |
|------|-----------|-------------------------|-------------------|
| **OWNER** | Malik / Agency owner | **Sab kuch** | — |
| **MANAGER** | Site/Project manager | Almost sab — billing, project access, policy **nahi** | Project Access, Manpower Policy, Billing |
| **OFFICE_STStaff** | Office staff / HR admin | Projects, Timesheets, CMMS office modules, Equipment | Approve timesheets (generally), create clients, delete projects |
| **FIELD_WORKER** | Field / site worker | My Work, Work Requests/Orders, Equipment, Projects (view), Timesheets | Zyada tar create/edit — sirf apna kaam |

### Demo login accounts (Load Demo ke baad)

| Role | Phone | Password |
|------|-------|----------|
| Manager | +966552000001 | Welcome123! |
| Office Staff | +966552000002 | Welcome123! |
| Field Worker | +966552000003 | Welcome123! |

**Owner** = jo signup kiya (apna phone + password).

### Sidebar 3 sections

1. **Command** — Overview, Command Center, My Work  
2. **Manpower** — Clients, Projects, Workers, Placements, Timesheets, Live, Attendance, HR, Project Access, Policy  
3. **CMMS** — Hub, Equipment, Assets, Locations, Work Requests, Work Orders, Planner, PM, Spares, Procurement, Finance, AI, Notifications, Security  

**Note:** `Staff`, `Schedule`, `Inbox`, `Tasks` OWNER ke liye **allowed** hain lekin manpower sidebar sections mein **link nahi** — direct URL se kholo:
- `/dashboard/{businessId}/staff`
- `/dashboard/{businessId}/schedule`
- `/dashboard/{businessId}/inbox`
- `/dashboard/{businessId}/tasks`

---

## 3. Pehle demo data load karo (backtesting start)

| Step | Kahan | Kya karo |
|------|-------|----------|
| 1 | **Help & Support** (`/help`) | **Load All Demo Data** button |
| 2 | Ya **Projects** page | **Load Demo Data** banner |
| 3 | Wait | Toast: "5 projects, 8 workers, CMMS..." |

Demo load ke baad milta hai:
- 5 clients/projects (SABIC, Aramco, NEOM, Red Sea, Ma'aden)
- 8 workers + placements + timesheets + aaj ki attendance
- CMMS data (locations, assets, work orders, spares)
- Equipment board items
- 3 demo login accounts (upar table)

---

## 4. Har page A to Z — kya hai, kis ka sath link, kon use karega

---

### SECTION A — COMMAND (Leadership)

#### A1. Overview / Dashboard
- **URL:** `/dashboard/{businessId}`
- **Kya hai:** Owner/Manager ko KPI cards — active projects, workers, pending timesheets, utilization
- **Kon:** OWNER, MANAGER (Staff/Field yahan se redirect → My Work)
- **Link hai:** Analytics data → Projects, Timesheets, CMMS summary
- **API:** `GET /manpower/analytics`, `GET /dashboard`, `GET /workforce/stats`
- **Backtest:**
  - [ ] Owner login → numbers dikhen (0 nahi after demo)
  - [ ] Manager login → same overview
  - [ ] Office Staff login → redirect `/my-work` ho

#### A2. Command Center
- **URL:** `/command-center`
- **Kya hai:** "AI Chief of Staff" — risk score, morning brief, attention items (iqama expiry, pending TS), Ask Company question, company reminders, CEO PDF download
- **Kon:** OWNER, MANAGER
- **Link hai:** Attention items click → Projects/Timesheets/Workers pages; reminders → company settings
- **API:** `GET /executive/command-center`, `POST /executive/ask-company`, `GET /manpower/reports/ceo-pdf`
- **Backtest:**
  - [ ] Attention list mein items hon (demo: iqama expiry, pending timesheets)
  - [ ] Ask Company: "Aramco contract rate?" type question → answer aaye
  - [ ] CEO PDF download ho
  - [ ] Add reminder → save ho

#### A3. My Work
- **URL:** `/my-work`
- **Kya hai:**  
  - **Field/Office:** apna shift, tasks, check-in/out, current project  
  - **Owner/Manager:** Team Pulse — kaun present, pending approvals
- **Kon:** **Sab roles**
- **Link hai:** Projects, Tasks, Attendance check-in
- **API:** `GET /workforce/my-work`, `GET /manpower/team-pulse`, `POST /workforce/attendance/check-in|check-out`
- **Backtest:**
  - [ ] Field worker → apna dashboard
  - [ ] Owner → Team Pulse dikhe
  - [ ] Check-in / Check-out kaam kare

---

### SECTION B — MANPOWER CORE (Agency business)

#### B1. Clients (Client Companies)
- **URL:** `/clients` aur `/clients/{clientId}`
- **Kya hai:** Jinhain agency workers supply karti hai — SABIC, Aramco, etc. Har client ke projects count, hours summary
- **Kon:** OWNER, MANAGER
- **Link hai:** Client → us ke **Projects**; detail page par worker/hours summary
- **API:** `GET/POST /manpower/clients`, `GET /manpower/clients/:id`
- **Zaroori kyun:** Bina client ke project nahi banta — yeh billing/customer side hai
- **Backtest:**
  - [ ] List mein 5 demo clients
  - [ ] Naya client create → Projects page par select ho
  - [ ] Client detail → linked projects dikhen

#### B2. Projects
- **URL:** `/projects` aur `/projects/{projectId}`
- **Kya hai:** **Sab se important hub.** Har site/job: name, code, client, location (geo), headcount, status, manager
- **Kon:** Sab dekh sakte; create/edit → OWNER, MANAGER; delete → **OWNER only**
- **Link hai:**
  - Client (kis company ka kaam)
  - Workers on site (placements)
  - Daily attendance mark
  - Timesheet entries + Excel export
  - Add worker directly to project
- **API:** `GET/POST/PATCH/DELETE /manpower/projects`, `POST .../workers`, `GET/PUT .../attendance`, timesheet APIs
- **Zaroori kyun:** Poori agency isi ke around ghoomti hai — site, labour, hours
- **Backtest:**
  - [ ] 5 demo projects list
  - [ ] Project open → workers, attendance, timesheets tabs
  - [ ] Mark attendance Present/Absent
  - [ ] Add timesheet entry for a worker
  - [ ] Download timesheet Excel (single worker + all workers)
  - [ ] Edit project status (ACTIVE → ON_HOLD)
  - [ ] Office Staff: sirf jis project par permission ho woh dikhe (Project Access test)

#### B3. Workers (Worker Profiles)
- **URL:** `/workers`
- **Kya hai:** Labour database — name, phone, iqama, nationality, category (Welder, Electrician...), hourly rate, status
- **Kon:** OWNER, MANAGER
- **Link hai:** Worker → **Placements** (kahan assign hai); Project detail se bhi add hota hai
- **API:** `GET/POST /manpower/workers`, `GET /manpower/worker-categories`
- **Zaroori kyun:** Bina worker ke placement/timesheet nahi
- **Backtest:**
  - [ ] 8 demo workers list
  - [ ] Category filter (Oil & Gas groups)
  - [ ] Iqama expiry warning (demo: Muhammad Ali — 12 days)
  - [ ] Naya worker create

#### B4. Placements
- **URL:** `/placements`
- **Kya hai:** Worker ko Client/Project par **assign** karna — start date, site, status ACTIVE/ENDED
- **Kon:** OWNER, MANAGER
- **Link hai:** Worker + Client + Project → Timesheets isi placement se link
- **API:** `GET/POST/PATCH/DELETE /manpower/placements`
- **Zaroori kyun:** Kaun kaun se site par hai — headcount tracking
- **Backtest:**
  - [ ] Demo placements dikhen
  - [ ] Naya placement: worker + project select
  - [ ] End placement → status ENDED
  - [ ] Delete: agar timesheets hain to soft-end

#### B5. Timesheets
- **URL:** `/timesheets`
- **Kya hai:** Hours entry + **multi-level approval** workflow
- **Kon:**  
  - **Entry:** OFFICE_STAFF (+ project permission `workers.timesheet`)  
  - **Approve:** MANAGER, OWNER  
  - **View:** sab (scoped)
- **Status flow:**
  ```
  PENDING → (Manager approve) → PENDING_ADMIN → (Owner approve) → PENDING_PAYROLL → APPROVED → BILLED
                ↓ reject anywhere
             REJECTED
  ```
- **Link hai:** Worker, Placement, Project; Policy se OT rules; Live dashboard pending count
- **API:** `GET/POST /manpower/timesheets`, `PATCH .../status`, `POST .../bulk-action`, export/import Excel
- **Zaroori kyun:** Paisa/your billing — client ko hours bill karte ho
- **Backtest:**
  - [ ] Pending queue badge sidebar par
  - [ ] Manager approve → status change
  - [ ] Owner final approve
  - [ ] Reject with reason
  - [ ] Bulk approve
  - [ ] Excel export + import template download
  - [ ] OT hours policy ke mutabiq calculate (Manpower Policy dekho)

#### B6. Manpower Live
- **URL:** `/manpower-live`
- **Kya hai:** Real-time ops — aaj kitne present/absent, pending approvals, labor cost trend, fatigue/OT risk
- **Kon:** OWNER, MANAGER, OFFICE_STAFF
- **Link hai:** Timesheets pending, today's attendance
- **API:** `GET /manpower/live-dashboard`
- **Backtest:**
  - [ ] Present/absent counts demo ke baad > 0
  - [ ] Pending timesheet count match kare Timesheets page se
  - [ ] Fatigue risk indicator (policy threshold se)

#### B7. Attendance (Staff attendance)
- **URL:** `/attendance`
- **Kya hai:** **Team members** (login users) ki check-in/out — alag hai worker daily attendance se
- **Kon:** OWNER, MANAGER (view team); sab apna check-in My Work se
- **Link hai:** My Work check-in; Schedule shifts
- **API:** `GET /workforce/attendance`, check-in/out
- **Note:** **Worker site attendance** = Project detail page par (`WorkerDailyAttendance`) ya QR scan
- **Backtest:**
  - [ ] Staff attendance list
  - [ ] My Work se check-in → yahan record aaye

#### B8. HR Integration
- **URL:** `/hr`
- **Kya hai:** Worker certifications, training records, HR/ERP sync config
- **Kon:** View → MANAGER; Config/Sync → **OWNER**
- **API:** `GET/PATCH /manpower/hr/config`, `POST /manpower/hr/sync`
- **Backtest:**
  - [ ] HR summary load
  - [ ] Demo seed HR data (button)
  - [ ] Owner config save

#### B9. Project Access (Manager permissions)
- **URL:** `/project-access`
- **Kya hai:** **OWNER** har project par kisi manager ko granular permissions deta hai
- **Kon:** **OWNER ONLY**
- **Permissions list:**
  | Key | Matlab |
  |-----|--------|
  | project.view | Project dekhna |
  | project.edit | Project edit |
  | workers.view | Workers list |
  | workers.add | Site par worker add |
  | workers.attendance | Present/Absent mark |
  | workers.timesheet | Daily hours enter |
  | workers.export | Excel download |
  | timesheets.view | Timesheets dekhna |
  | timesheets.approve | Approve karna |
  | analytics.view | Analytics dekhna |
- **Link hai:** Phone se naya manager invite → `/join/{token}` link; Projects filtering strict mode
- **API:** `GET/PUT/DELETE /manpower/projects/:id/access`, `GET /manpower/my-project-access`
- **Backtest:**
  - [ ] Project select → permissions drag between Available/Granted
  - [ ] Phone se naya user → invite card (link + password)
  - [ ] Us user se login → sirf granted project dikhe
  - [ ] Permission hatao → access band

#### B10. Manpower Policy
- **URL:** `/manpower-policy`
- **Kya hai:** Labour rules — max hours/day, OT multiplier, approval levels, fatigue threshold
- **Kon:** **OWNER ONLY**
- **Link hai:** Timesheet OT calculation, Live dashboard fatigue, approval queue levels
- **API:** `GET/PATCH /manpower/policy`
- **Backtest:**
  - [ ] Policy change → nayi timesheet par OT reflect ho
  - [ ] Approval levels badlo → queue behavior change

---

### SECTION C — TEAM & INVITE (Login users)

#### C1. Staff / Team
- **URL:** `/dashboard/{businessId}/staff` *(sidebar link nahi — direct URL)*
- **Kya hai:** Team members invite — Manager, Office Staff, Field Worker roles
- **Kon:** OWNER, MANAGER
- **Link hai:** Invite → SMS/Email/WhatsApp link → `/join/{token}` → user password set karke login
- **API:** `POST /workforce/members/invite`, `PATCH /workforce/members/:id`
- **Default temp password:** `Welcome123!`
- **Backtest:**
  - [ ] Invite form → green card with link
  - [ ] Copy link → incognito → join page → phone confirm → password → auto login
  - [ ] Deactivate member

#### C2. Join Invite (public)
- **URL:** `/join/{token}`
- **Kya hai:** Naye member ka activation page
- **Kon:** Invited user (no login yet)
- **API:** `GET /auth/invite/:token`, `POST /auth/invite/:token/accept`
- **Backtest:**
  - [ ] Valid link → business name dikhe
  - [ ] Galat phone → error
  - [ ] Success → dashboard redirect by role

#### C3. Schedule
- **URL:** `/schedule`
- **Kya hai:** Team shifts schedule karna
- **Kon:** OWNER (mainly); MANAGER apni team ke shifts
- **API:** `GET/POST /workforce/shifts`
- **Backtest:**
  - [ ] Shift create → My Work par dikhe

#### C4. Login
- **URL:** `/login`
- **Kya hai:** Phone + password — **sab roles yahi se**
- **Backtest:**
  - [ ] Har demo account se login
  - [ ] Galat password → error
  - [ ] Role ke mutabiq sidebar different ho

---

### SECTION D — CMMS (Maintenance Management)

> CMMS = site maintenance side. Manpower agency ke clients (refineries, plants) par maintenance bhi track hoti hai.

#### D1. CMMS Hub
- **URL:** `/cmms`
- **Kya hai:** CMMS dashboard — open WOs, overdue PM, KPIs, quick links
- **Kon:** OWNER, MANAGER, OFFICE_STAFF (full); FIELD_WORKER (limited)
- **API:** `GET /cmms/dashboard`, `POST /cmms/seed-demo`
- **Backtest:**
  - [ ] KPI cards load
  - [ ] Demo seed (auto on empty pages)

#### D2. Equipment Board
- **URL:** `/equipment`
- **Kya hai:** Kanban — Stock / Issued / Inspection / Maintenance — PPE, tools assign to project/worker
- **Kon:** Sab roles (view); move/create → MANAGER+
- **Link hai:** Project, Worker profile
- **API:** `GET/POST/PATCH /manpower/equipment`, move, reorder
- **Backtest:**
  - [ ] Demo equipment cards
  - [ ] Drag column change
  - [ ] Add/Edit equipment modal
  - [ ] Assign to project + worker

#### D3. Assets
- **URL:** `/assets`
- **Kya hai:** Asset registry tree (pumps, compressors) — hierarchy under locations
- **Kon:** OWNER, MANAGER, OFFICE_STAFF
- **Link hai:** Locations, Work Orders
- **API:** `GET /cmms/assets`, create/update/delete

#### D4. Locations
- **URL:** `/locations`
- **Kya hai:** Functional location tree (plant → unit → equipment area)
- **Kon:** OWNER, MANAGER, OFFICE_STAFF
- **Link hai:** Assets attach yahan

#### D5. Work Requests
- **URL:** `/work-requests`
- **Kya hai:** Site se maintenance request — "leak found", "motor noise"
- **Kon:** **Field worker** create; Office approve → Work Order
- **Link hai:** Work Orders (approve ke baad WO banta hai)
- **API:** `GET/POST/PATCH /cmms/work-requests`
- **Backtest:**
  - [ ] Field worker: naya WR submit
  - [ ] Sidebar badge (SUBMITTED count)
  - [ ] Office: approve → WO generate

#### D6. Work Orders
- **URL:** `/work-orders`
- **Kya hai:** Approved maintenance jobs — kanban: Open / In Progress / Done
- **Kon:** Office create/assign; Field execute
- **Link hai:** Work Requests, Planner, Assets
- **Backtest:**
  - [ ] Drag-drop status change
  - [ ] Assign technician

#### D7. Planner
- **URL:** `/planner`
- **Kya hai:** Weekly schedule — konsa WO kab, kis par
- **Kon:** OWNER, MANAGER, OFFICE_STAFF
- **Backtest:**
  - [ ] Drag WO to different day
  - [ ] Workload view

#### D8. Preventive Maintenance (PM)
- **URL:** `/maintenance`
- **Kya hai:** PM plans — har 30 days service; Run Due → auto WO
- **Kon:** OWNER, MANAGER, OFFICE_STAFF
- **Backtest:**
  - [ ] PM plan list
  - [ ] Run due → new WO create

#### D9. Spares / Inventory
- **URL:** `/spares`
- **Kya hai:** Spare parts stock, issue/return transactions
- **Kon:** OWNER, MANAGER, OFFICE_STAFF
- **Link hai:** Procurement, Work Orders (parts use)

#### D10. Procurement
- **URL:** `/procurement`
- **Kya hai:** Purchase requisitions — parts order, approval
- **Kon:** OWNER, MANAGER

#### D11. CMMS Finance
- **URL:** `/finance`
- **Kya hai:** Maintenance budget, cost tracking, ERP sync
- **Kon:** mainly **OWNER**

#### D12. CMMS AI Engine
- **URL:** `/ai-engine`
- **Kya hai:** Failure prediction, spare forecast, downtime analysis
- **Kon:** OWNER, MANAGER, OFFICE_STAFF

#### D13. Notification Center
- **URL:** `/notifications`
- **Kya hai:** Email/SMS/WhatsApp channels, event rules, test send
- **Kon:** OWNER, MANAGER, OFFICE_STAFF

#### D14. CMMS Security
- **URL:** `/security`
- **Kya hai:** CMMS-specific roles matrix (7 roles × permissions)
- **Kon:** OWNER, MANAGER, OFFICE_STAFF

---

### SECTION E — SHARED PAGES

| Page | URL | Kya hai | Kon |
|------|-----|---------|-----|
| **Help & Support** | `/help` | Help bot, live CS, FAQ, **Load Demo Data**, testing checklist | Sab |
| **Settings** | `/settings` | Business profile, channels, AI, compliance | OWNER, MANAGER |
| **Billing** | `/billing` | Subscription plan | OWNER only |
| **Inbox** | `/inbox` | Unified messages | Office (URL direct) |
| **Tasks** | `/tasks` | Team tasks (Command Center tasks bhi yahan) | Sab |
| **Analytics** | `/analytics` | General analytics | OWNER |

---

## 5. Data models — database mein kya store hota hai

| Model | Urdu mein | Example |
|-------|-----------|---------|
| `ClientCompany` | Client company | SABIC |
| `AgencyProject` | Site/project job | Jubail Refinery Q2 |
| `WorkerProfile` | Labour worker | Ahmed Hassan, Welder |
| `Placement` | Worker on project | Ahmed → SABIC project ACTIVE |
| `Timesheet` | Daily hours | 8h regular + 2h OT, PENDING |
| `WorkerDailyAttendance` | Site present/absent | PRESENT, QR/MANUAL |
| `BusinessMember` | Login team member | Khalid = MANAGER |
| `ProjectMemberAccess` | Project permissions | timesheets.approve granted |
| `MemberInvite` | Invite link token | /join/abc123 |
| `AgencyEquipment` | Tools/PPE board item | Safety helmet → Issued |
| `WorkShift` | Scheduled shift | Office staff 9-5 |
| `AttendanceRecord` | Staff check-in | Member level attendance |

---

## 6. Poori lifecycle — ek project start se bill tak

```
Step 1  OWNER creates Client (SABIC)
Step 2  OWNER creates Project (Jubail Maintenance, headcount 25, geo location)
Step 3  OWNER invites Manager (Staff page) OR Project Access se phone add
Step 4  MANAGER adds Workers (Workers page OR Project → Add Worker)
Step 5  MANAGER creates Placement (worker assigned to project)
Step 6  OFFICE marks Daily Attendance (Project detail) OR worker QR scan
Step 7  OFFICE enters Timesheet (hours + OT)
Step 8  MANAGER approves (PENDING → PENDING_ADMIN)
Step 9  OWNER final approve → APPROVED → BILLED
Step 10 OWNER exports Excel / CEO PDF for client billing
```

**Parallel CMMS flow (site par):**
```
Field Worker → Work Request → Office approves → Work Order → Planner schedule → Done
PM Plan due → Auto Work Order → Spares issued from inventory
```

---

## 7. Complete backtesting checklist (print kar ke tick karo)

### Phase 0 — Setup
- [ ] Owner account se login
- [ ] Help → Load All Demo Data
- [ ] Green success message + 5 projects confirm

### Phase 1 — Owner full flow
- [ ] Overview KPIs populated
- [ ] Command Center → attention items + Ask Company + CEO PDF
- [ ] Clients → 5 clients → open one detail
- [ ] Projects → open SABIC project → workers + attendance + timesheet
- [ ] Workers → 8 workers → categories
- [ ] Placements → list + filter by project
- [ ] Timesheets → pending → approve one → reject one
- [ ] Manpower Live → numbers match
- [ ] Project Access → grant permissions to demo manager phone
- [ ] Manpower Policy → view/change OT rule
- [ ] Staff → invite new member → copy link
- [ ] Equipment → kanban drag + add/edit
- [ ] CMMS Hub → all modules open
- [ ] Work Requests → approve one
- [ ] Work Orders → kanban drag
- [ ] Planner → schedule drag
- [ ] Help bot → question pucho

### Phase 2 — Manager (+966552000001)
- [ ] Login successful
- [ ] Project Access page **NAHI** dikhna chahiye
- [ ] Manpower Policy **NAHI**
- [ ] Billing **NAHI**
- [ ] Projects create/edit kar sake
- [ ] Timesheet approve kar sake
- [ ] Agar Project Access diya → sirf woh project dikhe

### Phase 3 — Office Staff (+966552000002)
- [ ] My Work landing page
- [ ] Projects view (permission ke sath)
- [ ] Timesheet entry kar sake
- [ ] Approve **NAHI** kar sakta (generally)
- [ ] CMMS office pages (Assets, Locations, Planner)

### Phase 4 — Field Worker (+966552000003)
- [ ] My Work landing
- [ ] Work Request submit
- [ ] Work Order view/update (site level)
- [ ] Equipment view
- [ ] Clients/Placements **NAHI** (sidebar mein nahi)

### Phase 5 — Invite flow
- [ ] Staff invite → link copy
- [ ] Incognito → /join/{token}
- [ ] Phone match → password set → login → correct role dashboard

### Phase 6 — Excel / Import / Export
- [ ] Project → Download all workers timesheet
- [ ] Timesheets → Export Excel
- [ ] Import template download + upload test file

### Phase 7 — QR Attendance (optional)
- [ ] Workers → QR generate
- [ ] Public check-in URL open (mobile)
- [ ] Geo fence test (project location ke qareeb)

---

## 8. Backend files reference (developer backtesting)

| File | Kaam |
|------|------|
| `backend/src/controllers/workforceController.ts` | Manpower + workforce sab endpoints |
| `backend/src/services/manpowerDemoSeed.ts` | Demo data loader |
| `backend/src/services/projectAccessService.ts` | Project permissions logic |
| `backend/src/services/timesheetApprovalService.ts` | Approve/reject/bill workflow |
| `backend/src/services/manpowerPolicyService.ts` | OT + approval policy |
| `backend/src/services/manpowerDashboardService.ts` | Live dashboard KPIs |
| `backend/src/services/memberInviteService.ts` | Invite link + SMS/email |
| `backend/src/constants/projectPermissions.ts` | Permission keys list |
| `backend/prisma/schema.prisma` | All database models |

---

## 9. Common errors aur fix

| Error | Wajah | Fix |
|-------|-------|-----|
| Projects empty | Demo load nahi hua | Help → Load Demo |
| "Schema not ready" | DB table missing | Projects → Sync Schema button |
| 403 on approve | Role ya project permission | Project Access check karo |
| Invite link invalid | Expired (7 days) ya used | Dobara invite bhejo |
| Sidebar item missing | Role restricted | Sahi role se login |
| Staff page nahi dikhta | Manpower sidebar gap | Direct URL `/staff` |

---

## 10. Testing tips (best practice)

1. **Har role ke liye alag browser Incognito window** — cache mix na ho  
2. **Pehle Owner, phir Manager, phir Office, phir Field** — order matter karta hai  
3. **Demo reload:** Help → Load All Demo Data → Reload (force=true)  
4. **Real backtesting:** Apna khud ka client/project banao demo ke sath mix karke  
5. **Mobile test:** Field worker flows phone par (QR, My Work, WR)  
6. **Railway/Vercel par test:** Backend deploy hona chahiye latest code ke sath  

---

*Last updated: June 2026 — SaudiChat Pro Manpower Module*
