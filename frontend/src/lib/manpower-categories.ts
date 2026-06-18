export type CategoryGroup = { label: string; labelAr: string; items: string[] };

export const OIL_GAS_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Welding & Fabrication",
    labelAr: "اللحام والتصنيع",
    items: [
      "Welder", "Welder 6G", "Welder TIG", "Welder MIG", "Welder SMAW", "Welding Foreman",
      "Welding Inspector", "Pipe Welder", "Structural Welder", "Boilermaker", "Pipe Fitter",
      "Pipe Fabricator", "Plate Fitter", "Structural Fitter", "Sheet Metal Worker", "HSC",
      "Highly Skilled Craftsman",
    ],
  },
  {
    label: "Electrical & Instrumentation",
    labelAr: "الكهرباء والأجهزة",
    items: [
      "Electrician", "Industrial Electrician", "MV Electrician", "HV Electrician", "Cable Puller",
      "Cable Terminator", "Instrument Technician", "Instrument Fitter", "Instrument Hook-up",
      "PLC Technician", "DCS Technician", "Fire & Gas Technician", "Telecom Technician",
      "Calibration Technician",
    ],
  },
  {
    label: "Mechanical & Rotating",
    labelAr: "الميكانيكا والمعدات",
    items: [
      "Mechanical Fitter", "Millwright", "Mechanical Technician", "Rotating Equipment Mechanic",
      "Static Equipment Mechanic", "Pump Mechanic", "Compressor Mechanic", "Turbine Mechanic",
      "Gearbox Mechanic", "HVAC Technician", "Chiller Mechanic", "Refrigeration Technician",
      "Alignment Technician",
    ],
  },
  {
    label: "Rigging & Heavy Lift",
    labelAr: "ال rigging والرفع",
    items: [
      "Rigger", "Advanced Rigger", "Rigging Foreman", "Crane Operator", "Mobile Crane Operator",
      "Tower Crane Operator", "EOT Crane Operator", "Overhead Crane Operator", "Forklift Operator",
      "Telehandler Operator", "Heavy Equipment Operator", "Excavator Operator", "Loader Operator",
      "Banksman", "Signalman", "Slinger",
    ],
  },
  {
    label: "Scaffolding & Access",
    labelAr: "السقالات",
    items: [
      "Scaffolder", "Scaffolding Supervisor", "Scaffolding Inspector", "Rope Access Technician",
      "IRATA Level 1", "IRATA Level 2", "IRATA Level 3",
    ],
  },
  {
    label: "Coating & Insulation",
    labelAr: "العزل والطلاء",
    items: [
      "Insulator", "Industrial Insulator", "Painter", "Blaster", "Blaster-Painter", "Sand Blaster",
      "Coating Applicator", "Coating Inspector", "Refractory Worker",
    ],
  },
  {
    label: "Process & Operations",
    labelAr: "التشغيل والعمليات",
    items: [
      "Process Operator", "Plant Operator", "Field Operator", "Panel Operator", "DCS Operator",
      "Console Operator", "Control Room Operator", "Utilities Operator", "Commissioning Operator",
    ],
  },
  {
    label: "Quality & Inspection",
    labelAr: "الجودة والفحص",
    items: [
      "QC Inspector", "QC Coordinator", "QA/QC Engineer", "NDT Technician", "NDT Level II RT",
      "NDT Level II UT", "NDT Level II MT", "NDT Level II PT", "Dimensional Inspector",
      "Material Controller", "Storekeeper",
    ],
  },
  {
    label: "HSE & Safety",
    labelAr: "السلامة",
    items: [
      "HSE Officer", "HSE Supervisor", "Safety Officer", "Safety Watch", "Fire Watch",
      "Permit Receiver", "Permit Issuer", "Confined Space Attendant", "Gas Tester", "Medic / First Aider",
    ],
  },
  {
    label: "Supervision & Engineering",
    labelAr: "الإشراف والهندسة",
    items: [
      "Helper", "General Worker", "Laborer", "Foreman", "General Foreman", "Supervisor", "Chargehand",
      "Lead Hand", "Site Engineer", "Planning Engineer", "Construction Manager", "Project Engineer",
      "Surveyor", "Surveyor Helper",
    ],
  },
  {
    label: "Civil & Construction",
    labelAr: "المدني والإنشاءات",
    items: [
      "Civil Worker", "Mason", "Carpenter", "Steel Fixer", "Concrete Finisher", "Concrete Pump Operator",
      "Bar Bender", "Formwork Carpenter", "Road Worker",
    ],
  },
  {
    label: "Support & Logistics",
    labelAr: "الدعم واللوجستيات",
    items: [
      "Driver", "Light Driver", "Heavy Driver", "Bus Driver", "Office Boy", "Camp Boss", "Cook",
      "Kitchen Helper", "Cleaner", "Housekeeping", "Security Guard", "Timekeeper", "Document Controller",
    ],
  },
];

export const ALL_OIL_GAS_CATEGORIES = Array.from(
  new Set(OIL_GAS_CATEGORY_GROUPS.flatMap((g) => g.items))
).sort((a, b) => a.localeCompare(b));

export function mergeCategories(custom: string[] = []): string[] {
  return Array.from(new Set([...ALL_OIL_GAS_CATEGORIES, ...custom.filter(Boolean)])).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function searchCategories(query: string, custom: string[] = []): CategoryGroup[] {
  const q = query.trim().toLowerCase();
  const all = mergeCategories(custom);
  if (!q) {
    return OIL_GAS_CATEGORY_GROUPS.map((g) => ({
      ...g,
      items: [...g.items, ...custom.filter((c) => !g.items.includes(c))].filter(
        (v, i, arr) => arr.indexOf(v) === i
      ),
    }));
  }
  const matched = all.filter((c) => c.toLowerCase().includes(q));
  if (matched.length === 0) return [];
  return [{ label: "Search Results", labelAr: "نتائج البحث", items: matched }];
}

export function categoryColor(name?: string | null): string {
  if (!name) return "bg-muted text-muted-foreground";
  const n = name.toLowerCase();
  if (n.includes("welder") || n.includes("weld") || n.includes("fitter") || n.includes("hsc"))
    return "bg-orange-500/15 text-orange-700 dark:text-orange-400";
  if (n.includes("electric") || n.includes("instrument") || n.includes("plc"))
    return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
  if (n.includes("rigger") || n.includes("crane") || n.includes("operator"))
    return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
  if (n.includes("hse") || n.includes("safety") || n.includes("fire watch"))
    return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (n.includes("foreman") || n.includes("supervisor") || n.includes("engineer"))
    return "bg-purple-500/15 text-purple-700 dark:text-purple-400";
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
}
