import Dexie, { type Table } from "dexie";
import type { AttendanceStatus } from "@/types/database";

export interface CachedStudent {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  gender: string;
  photoUrl: string | null;
}

export interface CachedClassRoster {
  classId: string;
  schoolId: string;
  className: string;
  academicYearId: string;
  updatedAt: string;
  students: CachedStudent[];
}

export interface OutboxAttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  arrivalTime?: string | null;
  reason?: string | null;
  updatedAt: string;
}

export interface AttendanceOutboxItem {
  id?: number;
  localId: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  date: string;
  timetableSlotId?: string | null;
  records: OutboxAttendanceRecord[];
  createdAt: string;
  syncStatus: "pending" | "syncing" | "failed";
  errorMessage?: string | null;
  retryCount: number;
}

export class SukuluOfflineDatabase extends Dexie {
  cachedRosters!: Table<CachedClassRoster, string>;
  attendanceOutbox!: Table<AttendanceOutboxItem, number>;

  constructor() {
    super("sukulu_offline_db");
    this.version(1).stores({
      cachedRosters: "classId, schoolId, updatedAt",
      attendanceOutbox: "++id, localId, classId, date, syncStatus, createdAt",
    });
  }
}

// Singleton avec protection SSR
let dbInstance: SukuluOfflineDatabase | null = null;

export function getOfflineDb(): SukuluOfflineDatabase | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!dbInstance) {
    dbInstance = new SukuluOfflineDatabase();
  }
  return dbInstance;
}

/**
 * Met en cache local la liste des élèves d'une classe pour consultation offline.
 */
export async function cacheClassRoster(roster: CachedClassRoster): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  await db.cachedRosters.put(roster);
}

/**
 * Récupère depuis le stockage local IndexedDB la liste des élèves d'une classe.
 */
export async function getCachedClassRoster(
  classId: string
): Promise<CachedClassRoster | undefined> {
  const db = getOfflineDb();
  if (!db) return undefined;
  return await db.cachedRosters.get(classId);
}

/**
 * Enregistre un appel dans la file d'attente hors-ligne (outbox).
 */
export async function queueOfflineAttendance(
  item: Omit<AttendanceOutboxItem, "id" | "syncStatus" | "retryCount" | "createdAt">
): Promise<number | undefined> {
  const db = getOfflineDb();
  if (!db) return undefined;

  // Si un enregistrement pending existe déjà pour cette même classe et même date/créneau, on le met à jour
  const existing = await db.attendanceOutbox
    .where("classId")
    .equals(item.classId)
    .filter(
      (entry) =>
        entry.date === item.date &&
        entry.timetableSlotId === (item.timetableSlotId ?? null) &&
        entry.syncStatus !== "syncing"
    )
    .first();

  if (existing && existing.id) {
    await db.attendanceOutbox.update(existing.id, {
      records: item.records,
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
      errorMessage: null,
    } as unknown as Partial<AttendanceOutboxItem>);
    return existing.id;
  }

  const outboxItem: AttendanceOutboxItem = {
    ...item,
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
    retryCount: 0,
  };

  return await db.attendanceOutbox.add(outboxItem);
}

/**
 * Récupère tous les appels en attente de synchronisation.
 */
export async function getPendingAttendanceQueue(): Promise<AttendanceOutboxItem[]> {
  const db = getOfflineDb();
  if (!db) return [];
  return await db.attendanceOutbox
    .where("syncStatus")
    .anyOf(["pending", "failed"])
    .toArray();
}

/**
 * Compte le nombre d'appels en attente de synchronisation.
 */
export async function getPendingQueueCount(): Promise<number> {
  const db = getOfflineDb();
  if (!db) return 0;
  return await db.attendanceOutbox
    .where("syncStatus")
    .anyOf(["pending", "failed"])
    .count();
}

/**
 * Marque un élément comme en cours de synchronisation.
 */
export async function markOutboxItemSyncing(id: number): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  await db.attendanceOutbox.update(id, { syncStatus: "syncing" });
}

/**
 * Supprime de l'outbox un élément synchronisé avec succès.
 */
export async function markOutboxItemSynced(id: number): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  await db.attendanceOutbox.delete(id);
}

/**
 * Enregistre l'échec de synchronisation d'un élément avec le message d'erreur.
 */
export async function markOutboxItemFailed(id: number, error: string): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  const item = await db.attendanceOutbox.get(id);
  const currentRetries = item?.retryCount ?? 0;
  await db.attendanceOutbox.update(id, {
    syncStatus: "failed",
    errorMessage: error,
    retryCount: currentRetries + 1,
  });
}
