import {
  type Employee, type InsertEmployee,
  type AttendanceRecord, type InsertAttendance,
  type Setting, type InsertSetting,
} from "@shared/schema";
import { db } from "./db";
import {
  Timestamp,
} from "firebase-admin/firestore";

const EMPLOYEES_COLLECTION = "employees";
const ATTENDANCE_COLLECTION = "attendanceRecords";
const SETTINGS_COLLECTION = "settings";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value !== null && "seconds" in value && typeof (value as { seconds: unknown }).seconds === "number") {
    return Timestamp.fromMillis(((value as { seconds: number }).seconds * 1000)).toDate();
  }
  return null;
}

function toTimestamp(value: Date | string | null | undefined): Timestamp | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

function employeeFromDoc(id: string, data: Record<string, any>): Employee {
  return {
    id,
    employeeCode: data.employeeCode,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    department: data.department,
    position: data.position,
    phone: data.phone ?? null,
    photoUrl: data.photoUrl ?? null,
    faceRegistered: Boolean(data.faceRegistered),
    fingerprintRegistered: Boolean(data.fingerprintRegistered),
    active: data.active ?? true,
    createdAt: toDate(data.createdAt),
  };
}

function attendanceFromDoc(id: string, data: Record<string, any>): AttendanceRecord {
  return {
    id,
    employeeId: data.employeeId,
    date: data.date,
    checkIn: toDate(data.checkIn),
    checkOut: toDate(data.checkOut),
    method: data.method,
    status: data.status,
    notes: data.notes ?? null,
  };
}

function settingFromDoc(id: string, data: Record<string, any>): Setting {
  return {
    id,
    key: data.key,
    value: data.value,
  };
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export interface IStorage {
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByCode(code: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<void>;

  getAttendanceRecords(filters?: { employeeId?: string; date?: string }): Promise<AttendanceRecord[]>;
  getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined>;
  getTodayAttendance(employeeId: string): Promise<AttendanceRecord | undefined>;
  createAttendance(record: InsertAttendance): Promise<AttendanceRecord>;
  updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<AttendanceRecord | undefined>;

  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<Setting[]>;

  getDashboardStats(): Promise<{
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getEmployees(): Promise<Employee[]> {
    const snapshot = await db.collection(EMPLOYEES_COLLECTION).orderBy("firstName").get();
    return snapshot.docs.map((item) => employeeFromDoc(item.id, item.data()));
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const snapshot = await db.collection(EMPLOYEES_COLLECTION).doc(id).get();
    if (!snapshot.exists) return undefined;
    return employeeFromDoc(snapshot.id, snapshot.data()!);
  }

  async getEmployeeByCode(code: string): Promise<Employee | undefined> {
    const employees = await this.getEmployees();
    return employees.find((employee) => employee.employeeCode === code);
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = crypto.randomUUID();
    const created: Employee = {
      id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      phone: employee.phone ?? null,
      photoUrl: employee.photoUrl ?? null,
      faceRegistered: employee.faceRegistered ?? false,
      fingerprintRegistered: employee.fingerprintRegistered ?? false,
      active: employee.active ?? true,
      createdAt: new Date(),
    };

    await db.collection(EMPLOYEES_COLLECTION).doc(id).set({
      ...created,
      createdAt: toTimestamp(created.createdAt),
    });

    return created;
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const existing = await this.getEmployee(id);
    if (!existing) return undefined;

    await db.collection(EMPLOYEES_COLLECTION).doc(id).update(compact(data));

    return {
      ...existing,
      ...data,
      phone: data.phone ?? existing.phone,
      photoUrl: data.photoUrl ?? existing.photoUrl,
      faceRegistered: data.faceRegistered ?? existing.faceRegistered,
      fingerprintRegistered: data.fingerprintRegistered ?? existing.fingerprintRegistered,
      active: data.active ?? existing.active,
    };
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.collection(EMPLOYEES_COLLECTION).doc(id).delete();
  }

  async getAttendanceRecords(filters?: { employeeId?: string; date?: string }): Promise<AttendanceRecord[]> {
    const snapshot = await db.collection(ATTENDANCE_COLLECTION).get();
    const records = snapshot.docs.map((item) => attendanceFromDoc(item.id, item.data()));

    return records
      .filter((record) => !filters?.employeeId || record.employeeId === filters.employeeId)
      .filter((record) => !filters?.date || record.date === filters.date)
      .sort((left, right) => {
        const leftTime = left.checkIn ? new Date(left.checkIn).getTime() : 0;
        const rightTime = right.checkIn ? new Date(right.checkIn).getTime() : 0;
        return rightTime - leftTime;
      });
  }

  async getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined> {
    const snapshot = await db.collection(ATTENDANCE_COLLECTION).doc(id).get();
    if (!snapshot.exists) return undefined;
    return attendanceFromDoc(snapshot.id, snapshot.data()!);
  }

  async getTodayAttendance(employeeId: string): Promise<AttendanceRecord | undefined> {
    const today = new Date().toISOString().split("T")[0];
    const records = await this.getAttendanceRecords({ employeeId, date: today });
    return records[0];
  }

  async createAttendance(record: InsertAttendance): Promise<AttendanceRecord> {
    const id = crypto.randomUUID();
    const created: AttendanceRecord = {
      id,
      employeeId: record.employeeId,
      date: record.date,
      checkIn: toDate(record.checkIn),
      checkOut: toDate(record.checkOut),
      method: record.method,
      status: record.status ?? "present",
      notes: record.notes ?? null,
    };

    await db.collection(ATTENDANCE_COLLECTION).doc(id).set({
      ...created,
      checkIn: toTimestamp(created.checkIn),
      checkOut: toTimestamp(created.checkOut),
    });

    return created;
  }

  async updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<AttendanceRecord | undefined> {
    const existing = await this.getAttendanceRecord(id);
    if (!existing) return undefined;

    await db.collection(ATTENDANCE_COLLECTION).doc(id).update(compact({
      ...data,
      checkIn: data.checkIn === undefined ? undefined : toTimestamp(data.checkIn),
      checkOut: data.checkOut === undefined ? undefined : toTimestamp(data.checkOut),
    }));

    return {
      ...existing,
      ...data,
      checkIn: data.checkIn === undefined ? existing.checkIn : toDate(data.checkIn),
      checkOut: data.checkOut === undefined ? existing.checkOut : toDate(data.checkOut),
      notes: data.notes === undefined ? existing.notes : data.notes,
      status: data.status ?? existing.status,
    };
  }

  async getSetting(key: string): Promise<string | undefined> {
    const snapshot = await db.collection(SETTINGS_COLLECTION).doc(key).get();
    return snapshot.exists ? snapshot.data()!.value : undefined;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.collection(SETTINGS_COLLECTION).doc(key).set({ key, value });
  }

  async getAllSettings(): Promise<Setting[]> {
    const snapshot = await db.collection(SETTINGS_COLLECTION).get();
    return snapshot.docs.map((item) => settingFromDoc(item.id, item.data()));
  }

  async getDashboardStats() {
    const today = new Date().toISOString().split("T")[0];

    const allEmployees = await this.getEmployees();
    const totalEmployees = allEmployees.filter((employee) => employee.active).length;

    const todayRecords = await this.getAttendanceRecords({ date: today });

    const presentToday = todayRecords.filter(r => r.status === "present" || r.status === "late").length;
    const lateToday = todayRecords.filter(r => r.status === "late").length;
    const absentToday = totalEmployees - presentToday;

    return { totalEmployees, presentToday, absentToday, lateToday };
  }
}

export const storage = new DatabaseStorage();
