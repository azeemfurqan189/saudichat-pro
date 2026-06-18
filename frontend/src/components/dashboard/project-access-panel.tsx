"use client";

import { useMemo, useState } from "react";
import { GripVertical, Shield, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ALL_PROJECT_PERMISSION_KEYS,
  DEFAULT_MANAGER_PERMISSIONS,
  PERMISSION_GROUPS,
  PROJECT_PERMISSION_CATALOG,
  permissionLabel,
} from "@/lib/project-permissions";

export type ProjectAccessRow = {
  id: string;
  memberId: string;
  permissions: string[];
  isActive: boolean;
  user?: { id: string; name: string; phone?: string; email?: string };
};

function PermissionChip({
  permKey,
  isAr,
  dragging,
  onDragStart,
}: {
  permKey: string;
  isAr: boolean;
  dragging?: boolean;
  onDragStart: (e: React.DragEvent, key: string) => void;
}) {
  const def = PROJECT_PERMISSION_CATALOG.find((p) => p.key === permKey);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, permKey)}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium cursor-grab active:cursor-grabbing bg-background",
        dragging && "opacity-50",
        def?.group === "workers" && "border-amber-500/40 bg-amber-500/5",
        def?.group === "project" && "border-blue-500/40 bg-blue-500/5"
      )}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
      {permissionLabel(permKey, isAr)}
    </div>
  );
}

function DropZone({
  title,
  hint,
  items,
  isAr,
  zone,
  onDrop,
  onDragStart,
  emptyText,
}: {
  title: string;
  hint: string;
  items: string[];
  isAr: boolean;
  zone: "available" | "granted";
  onDrop: (zone: "available" | "granted", key: string) => void;
  onDragStart: (e: React.DragEvent, key: string) => void;
  emptyText: string;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const key = e.dataTransfer.getData("text/permission");
        if (key) onDrop(zone, key);
      }}
      className={cn(
        "rounded-lg border border-dashed p-2 min-h-[140px] transition-colors",
        over ? "border-primary bg-primary/5" : "border-border/70 bg-muted/20"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-[9px] text-muted-foreground mb-2">{hint}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-[10px] text-muted-foreground py-4 block w-full text-center">{emptyText}</span>
        ) : (
          items.map((key) => (
            <PermissionChip key={key} permKey={key} isAr={isAr} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}

export function ProjectPermissionDragPanel({
  granted,
  onChange,
  isAr,
}: {
  granted: string[];
  onChange: (next: string[]) => void;
  isAr: boolean;
}) {
  const available = useMemo(
    () => ALL_PROJECT_PERMISSION_KEYS.filter((k) => !granted.includes(k)),
    [granted]
  );

  const onDragStart = (e: React.DragEvent, key: string) => {
    e.dataTransfer.setData("text/permission", key);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (zone: "available" | "granted", key: string) => {
    if (zone === "granted") {
      if (!granted.includes(key)) onChange([...granted, key]);
    } else {
      onChange(granted.filter((k) => k !== key));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[10px]"
          onClick={() => onChange([...DEFAULT_MANAGER_PERMISSIONS])}
        >
          {isAr ? "صلاحيات المشرف" : "Manager preset"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[10px]"
          onClick={() => onChange([...ALL_PROJECT_PERMISSION_KEYS])}
        >
          {isAr ? "صلاحيات كاملة" : "Full access"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => onChange([])}>
          {isAr ? "مسح الكل" : "Clear all"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        <DropZone
          title={isAr ? "متاح" : "Available"}
          hint={isAr ? "اسحب إلى اليمين لمنح الصلاحية" : "Drag right to grant"}
          items={available}
          isAr={isAr}
          zone="available"
          onDrop={onDrop}
          onDragStart={onDragStart}
          emptyText={isAr ? "كل الصلاحيات ممنوحة" : "All permissions granted"}
        />
        <DropZone
          title={isAr ? "ممنوح" : "Granted"}
          hint={isAr ? "اسحب إلى اليسار لإزالة" : "Drag left to revoke"}
          items={granted}
          isAr={isAr}
          zone="granted"
          onDrop={onDrop}
          onDragStart={onDragStart}
          emptyText={isAr ? "اسحب الصلاحيات هنا" : "Drop permissions here"}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {PERMISSION_GROUPS.map((g) => (
          <span key={g.id} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {isAr ? g.labelAr : g.labelEn}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProjectAccessManager({
  accessRows,
  isAr,
  saving,
  onSavePhone,
  onSaveMember,
  onRemove,
}: {
  accessRows: ProjectAccessRow[];
  isAr: boolean;
  saving: boolean;
  onSavePhone: (data: { phone: string; name: string; permissions: string[] }) => void;
  onSaveMember: (data: { memberId: string; permissions: string[] }) => void;
  onRemove: (memberId: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [draftPerms, setDraftPerms] = useState<string[]>([...DEFAULT_MANAGER_PERMISSIONS]);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">{isAr ? "إضافة مشرف برقم الجوال" : "Add manager by phone"}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <Input
            className="h-8 text-xs"
            placeholder={isAr ? "اسم المشرف" : "Manager name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            className="h-8 text-xs"
            placeholder={isAr ? "رقم الجوال *" : "Phone number *"}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <ProjectPermissionDragPanel granted={draftPerms} onChange={setDraftPerms} isAr={isAr} />
        <Button
          size="sm"
          className="h-8 text-xs"
          loading={saving}
          disabled={!phone.trim() || draftPerms.length === 0}
          onClick={() => onSavePhone({ phone: phone.trim(), name: name.trim(), permissions: draftPerms })}
        >
          {isAr ? "حفظ ومنح الوصول" : "Save & grant access"}
        </Button>
        <p className="text-[9px] text-muted-foreground">
          {isAr
            ? "عند تسجيل الدخول بنفس الرقم، تفتح له أقسام المشروع حسب الصلاحيات."
            : "When they login with this phone, only permitted project sections open."}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{isAr ? "المشرفون المعيّنون" : "Assigned managers"}</p>
        </div>
        {accessRows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">
            {isAr ? "لم يُعيّن أحد بعد" : "No managers assigned yet"}
          </p>
        ) : (
          accessRows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border/60 p-3 space-y-2 bg-muted/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{row.user?.name || "Manager"}</p>
                  <p className="text-[10px] text-muted-foreground">{row.user?.phone} · {row.permissions.length} {isAr ? "صلاحية" : "permissions"}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    onClick={() => {
                      setEditMemberId(row.memberId);
                      setEditPerms([...row.permissions]);
                    }}
                  >
                    {isAr ? "تعديل" : "Edit"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] text-red-500"
                    onClick={() => onRemove(row.memberId)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {editMemberId === row.memberId && (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <ProjectPermissionDragPanel granted={editPerms} onChange={setEditPerms} isAr={isAr} />
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    loading={saving}
                    disabled={editPerms.length === 0}
                    onClick={() => {
                      onSaveMember({ memberId: row.memberId, permissions: editPerms });
                      setEditMemberId(null);
                    }}
                  >
                    {isAr ? "تحديث الصلاحيات" : "Update permissions"}
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
