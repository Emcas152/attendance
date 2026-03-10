import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, timestamp, boolean, int, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = mysqlTable("employees", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),

  employeeCode: text("employee_code").notNull(),

  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),

  email: text("email").notNull(),

  department: text("department").notNull(),
  position: text("position").notNull(),

  phone: text("phone"),
  photoUrl: text("photo_url"),

  faceRegistered: boolean("face_registered").default(false),
  fingerprintRegistered: boolean("fingerprint_registered").default(false),

  active: boolean("active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
});

export const attendanceRecords = mysqlTable("attendance_records", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),

  employeeId: varchar("employee_id", { length: 36 }).notNull(),

  date: text("date").notNull(),

  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),

  method: text("method").notNull(),

  status: text("status").notNull().default("present"),

  notes: text("notes"),
});

export const settings = mysqlTable("settings", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),

  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingsSchema>;