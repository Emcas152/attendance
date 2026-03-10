"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/index.ts
var index_exports = {};
__export(index_exports, {
  log: () => log
});
module.exports = __toCommonJS(index_exports);
var import_config = require("dotenv/config");
var import_express2 = __toESM(require("express"), 1);

// server/db.ts
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");
function getEnv(name) {
  return process.env[name]?.trim();
}
function getServiceAccountCredential() {
  const projectId = getEnv("FIREBASE_PROJECT_ID");
  const clientEmail = getEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = getEnv("FIREBASE_PRIVATE_KEY");
  if (!projectId || !clientEmail || !privateKey) {
    return (0, import_app.applicationDefault)();
  }
  return (0, import_app.cert)({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n")
  });
}
var firebaseApp = (0, import_app.getApps)().find((app2) => app2.name === "attendance-server") ?? (0, import_app.initializeApp)({
  credential: getServiceAccountCredential(),
  projectId: getEnv("FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("FIREBASE_STORAGE_BUCKET")
}, "attendance-server");
var db = (0, import_firestore.getFirestore)((0, import_app.getApps)().find((app2) => app2.name === "attendance-server") ?? (0, import_app.getApp)("attendance-server"));

// server/storage.ts
var import_firestore2 = require("firebase-admin/firestore");
var EMPLOYEES_COLLECTION = "employees";
var ATTENDANCE_COLLECTION = "attendanceRecords";
var SETTINGS_COLLECTION = "settings";
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof import_firestore2.Timestamp) return value.toDate();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value !== null && "seconds" in value && typeof value.seconds === "number") {
    return import_firestore2.Timestamp.fromMillis(value.seconds * 1e3).toDate();
  }
  return null;
}
function toTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : import_firestore2.Timestamp.fromDate(date);
}
function employeeFromDoc(id, data) {
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
    createdAt: toDate(data.createdAt)
  };
}
function attendanceFromDoc(id, data) {
  return {
    id,
    employeeId: data.employeeId,
    date: data.date,
    checkIn: toDate(data.checkIn),
    checkOut: toDate(data.checkOut),
    method: data.method,
    status: data.status,
    notes: data.notes ?? null
  };
}
function settingFromDoc(id, data) {
  return {
    id,
    key: data.key,
    value: data.value
  };
}
function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== void 0));
}
var DatabaseStorage = class {
  async getEmployees() {
    const snapshot = await db.collection(EMPLOYEES_COLLECTION).orderBy("firstName").get();
    return snapshot.docs.map((item) => employeeFromDoc(item.id, item.data()));
  }
  async getEmployee(id) {
    const snapshot = await db.collection(EMPLOYEES_COLLECTION).doc(id).get();
    if (!snapshot.exists) return void 0;
    return employeeFromDoc(snapshot.id, snapshot.data());
  }
  async getEmployeeByCode(code) {
    const employees2 = await this.getEmployees();
    return employees2.find((employee) => employee.employeeCode === code);
  }
  async createEmployee(employee) {
    const id = crypto.randomUUID();
    const created = {
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
      createdAt: /* @__PURE__ */ new Date()
    };
    await db.collection(EMPLOYEES_COLLECTION).doc(id).set({
      ...created,
      createdAt: toTimestamp(created.createdAt)
    });
    return created;
  }
  async updateEmployee(id, data) {
    const existing = await this.getEmployee(id);
    if (!existing) return void 0;
    await db.collection(EMPLOYEES_COLLECTION).doc(id).update(compact(data));
    return {
      ...existing,
      ...data,
      phone: data.phone ?? existing.phone,
      photoUrl: data.photoUrl ?? existing.photoUrl,
      faceRegistered: data.faceRegistered ?? existing.faceRegistered,
      fingerprintRegistered: data.fingerprintRegistered ?? existing.fingerprintRegistered,
      active: data.active ?? existing.active
    };
  }
  async deleteEmployee(id) {
    await db.collection(EMPLOYEES_COLLECTION).doc(id).delete();
  }
  async getAttendanceRecords(filters) {
    const snapshot = await db.collection(ATTENDANCE_COLLECTION).get();
    const records = snapshot.docs.map((item) => attendanceFromDoc(item.id, item.data()));
    return records.filter((record) => !filters?.employeeId || record.employeeId === filters.employeeId).filter((record) => !filters?.date || record.date === filters.date).sort((left, right) => {
      const leftTime = left.checkIn ? new Date(left.checkIn).getTime() : 0;
      const rightTime = right.checkIn ? new Date(right.checkIn).getTime() : 0;
      return rightTime - leftTime;
    });
  }
  async getAttendanceRecord(id) {
    const snapshot = await db.collection(ATTENDANCE_COLLECTION).doc(id).get();
    if (!snapshot.exists) return void 0;
    return attendanceFromDoc(snapshot.id, snapshot.data());
  }
  async getTodayAttendance(employeeId) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const records = await this.getAttendanceRecords({ employeeId, date: today });
    return records[0];
  }
  async createAttendance(record) {
    const id = crypto.randomUUID();
    const created = {
      id,
      employeeId: record.employeeId,
      date: record.date,
      checkIn: toDate(record.checkIn),
      checkOut: toDate(record.checkOut),
      method: record.method,
      status: record.status ?? "present",
      notes: record.notes ?? null
    };
    await db.collection(ATTENDANCE_COLLECTION).doc(id).set({
      ...created,
      checkIn: toTimestamp(created.checkIn),
      checkOut: toTimestamp(created.checkOut)
    });
    return created;
  }
  async updateAttendance(id, data) {
    const existing = await this.getAttendanceRecord(id);
    if (!existing) return void 0;
    await db.collection(ATTENDANCE_COLLECTION).doc(id).update(compact({
      ...data,
      checkIn: data.checkIn === void 0 ? void 0 : toTimestamp(data.checkIn),
      checkOut: data.checkOut === void 0 ? void 0 : toTimestamp(data.checkOut)
    }));
    return {
      ...existing,
      ...data,
      checkIn: data.checkIn === void 0 ? existing.checkIn : toDate(data.checkIn),
      checkOut: data.checkOut === void 0 ? existing.checkOut : toDate(data.checkOut),
      notes: data.notes === void 0 ? existing.notes : data.notes,
      status: data.status ?? existing.status
    };
  }
  async getSetting(key) {
    const snapshot = await db.collection(SETTINGS_COLLECTION).doc(key).get();
    return snapshot.exists ? snapshot.data().value : void 0;
  }
  async setSetting(key, value) {
    await db.collection(SETTINGS_COLLECTION).doc(key).set({ key, value });
  }
  async getAllSettings() {
    const snapshot = await db.collection(SETTINGS_COLLECTION).get();
    return snapshot.docs.map((item) => settingFromDoc(item.id, item.data()));
  }
  async getDashboardStats() {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const allEmployees = await this.getEmployees();
    const totalEmployees = allEmployees.filter((employee) => employee.active).length;
    const todayRecords = await this.getAttendanceRecords({ date: today });
    const presentToday = todayRecords.filter((r) => r.status === "present" || r.status === "late").length;
    const lateToday = todayRecords.filter((r) => r.status === "late").length;
    const absentToday = totalEmployees - presentToday;
    return { totalEmployees, presentToday, absentToday, lateToday };
  }
};
var storage = new DatabaseStorage();

// shared/schema.ts
var import_drizzle_orm = require("drizzle-orm");
var import_mysql_core = require("drizzle-orm/mysql-core");
var import_drizzle_zod = require("drizzle-zod");
var employees = (0, import_mysql_core.mysqlTable)("employees", {
  id: (0, import_mysql_core.varchar)("id", { length: 36 }).primaryKey().default(import_drizzle_orm.sql`(UUID())`),
  employeeCode: (0, import_mysql_core.text)("employee_code").notNull(),
  firstName: (0, import_mysql_core.text)("first_name").notNull(),
  lastName: (0, import_mysql_core.text)("last_name").notNull(),
  email: (0, import_mysql_core.text)("email").notNull(),
  department: (0, import_mysql_core.text)("department").notNull(),
  position: (0, import_mysql_core.text)("position").notNull(),
  phone: (0, import_mysql_core.text)("phone"),
  photoUrl: (0, import_mysql_core.text)("photo_url"),
  faceRegistered: (0, import_mysql_core.boolean)("face_registered").default(false),
  fingerprintRegistered: (0, import_mysql_core.boolean)("fingerprint_registered").default(false),
  active: (0, import_mysql_core.boolean)("active").default(true),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
});
var attendanceRecords = (0, import_mysql_core.mysqlTable)("attendance_records", {
  id: (0, import_mysql_core.varchar)("id", { length: 36 }).primaryKey().default(import_drizzle_orm.sql`(UUID())`),
  employeeId: (0, import_mysql_core.varchar)("employee_id", { length: 36 }).notNull(),
  date: (0, import_mysql_core.text)("date").notNull(),
  checkIn: (0, import_mysql_core.timestamp)("check_in"),
  checkOut: (0, import_mysql_core.timestamp)("check_out"),
  method: (0, import_mysql_core.text)("method").notNull(),
  status: (0, import_mysql_core.text)("status").notNull().default("present"),
  notes: (0, import_mysql_core.text)("notes")
});
var settings = (0, import_mysql_core.mysqlTable)("settings", {
  id: (0, import_mysql_core.varchar)("id", { length: 36 }).primaryKey().default(import_drizzle_orm.sql`(UUID())`),
  key: (0, import_mysql_core.text)("key").notNull(),
  value: (0, import_mysql_core.text)("value").notNull()
});
var insertEmployeeSchema = (0, import_drizzle_zod.createInsertSchema)(employees).omit({
  id: true,
  createdAt: true
});
var insertAttendanceSchema = (0, import_drizzle_zod.createInsertSchema)(attendanceRecords).omit({
  id: true
});
var insertSettingsSchema = (0, import_drizzle_zod.createInsertSchema)(settings).omit({
  id: true
});

// server/routes.ts
async function registerRoutes(httpServer2, app2) {
  app2.get("/api/employees", async (_req, res) => {
    const employees2 = await storage.getEmployees();
    res.json(employees2);
  });
  app2.get("/api/employees/:id", async (req, res) => {
    const employee = await storage.getEmployee(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  });
  app2.post("/api/employees", async (req, res) => {
    const parsed = insertEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const employee = await storage.createEmployee(parsed.data);
    res.status(201).json(employee);
  });
  app2.patch("/api/employees/:id", async (req, res) => {
    const partial = insertEmployeeSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ message: partial.error.message });
    const employee = await storage.updateEmployee(req.params.id, partial.data);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  });
  app2.delete("/api/employees/:id", async (req, res) => {
    await storage.deleteEmployee(req.params.id);
    res.status(204).send();
  });
  app2.get("/api/attendance", async (req, res) => {
    const filters = {};
    if (req.query.employeeId) filters.employeeId = req.query.employeeId;
    if (req.query.date) filters.date = req.query.date;
    const records = await storage.getAttendanceRecords(filters);
    res.json(records);
  });
  app2.post("/api/attendance/check-in", async (req, res) => {
    const { employeeId, method } = req.body;
    if (!employeeId || !method) return res.status(400).json({ message: "employeeId and method required" });
    const employee = await storage.getEmployee(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    const existing = await storage.getTodayAttendance(employeeId);
    if (existing && existing.checkIn) {
      return res.status(400).json({ message: "Already checked in today" });
    }
    const now = /* @__PURE__ */ new Date();
    const today = now.toISOString().split("T")[0];
    const lateThreshold = await storage.getSetting("late_threshold") || "09:00";
    const [thresholdHour, thresholdMin] = lateThreshold.split(":").map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const thresholdMinutes = thresholdHour * 60 + thresholdMin;
    const status = currentMinutes >= thresholdMinutes ? "late" : "present";
    const record = await storage.createAttendance({
      employeeId,
      date: today,
      checkIn: now,
      checkOut: null,
      method,
      status,
      notes: null
    });
    res.status(201).json({ ...record, employee });
  });
  app2.post("/api/attendance/check-out", async (req, res) => {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ message: "employeeId required" });
    const existing = await storage.getTodayAttendance(employeeId);
    if (!existing) return res.status(400).json({ message: "No check-in found for today" });
    if (existing.checkOut) return res.status(400).json({ message: "Already checked out today" });
    const updated = await storage.updateAttendance(existing.id, { checkOut: /* @__PURE__ */ new Date() });
    const employee = await storage.getEmployee(employeeId);
    res.json({ ...updated, employee });
  });
  app2.get("/api/dashboard/stats", async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });
  app2.get("/api/settings", async (_req, res) => {
    const allSettings = await storage.getAllSettings();
    const settingsMap = {};
    allSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    res.json(settingsMap);
  });
  app2.post("/api/settings", async (req, res) => {
    const { key, value } = req.body;
    if (!key || value === void 0) return res.status(400).json({ message: "key and value required" });
    await storage.setSetting(key, value);
    res.json({ key, value });
  });
  app2.post("/api/compreface/recognize", async (req, res) => {
    const apiUrl = await storage.getSetting("compreface_url");
    const apiKey = await storage.getSetting("compreface_api_key");
    if (!apiUrl || !apiKey) {
      return res.status(400).json({ message: "CompreFace not configured. Please set URL and API key in Settings." });
    }
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ message: "Image data required" });
      const response = await fetch(`${apiUrl}/api/v1/recognition/recognize`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ file: image })
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: `CompreFace error: ${error.message}` });
    }
  });
  app2.post("/api/compreface/register", async (req, res) => {
    const apiUrl = await storage.getSetting("compreface_url");
    const apiKey = await storage.getSetting("compreface_api_key");
    if (!apiUrl || !apiKey) {
      return res.status(400).json({ message: "CompreFace not configured" });
    }
    try {
      const { image, subject } = req.body;
      if (!image || !subject) return res.status(400).json({ message: "Image and subject required" });
      const response = await fetch(`${apiUrl}/api/v1/recognition/faces`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ file: image, subject })
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: `CompreFace error: ${error.message}` });
    }
  });
  app2.post("/api/compreface/test", async (req, res) => {
    const { url, apiKey } = req.body;
    try {
      const response = await fetch(`${url}/api/v1/recognition/subjects`, {
        headers: { "x-api-key": apiKey }
      });
      if (response.ok) {
        res.json({ connected: true });
      } else {
        res.json({ connected: false, message: "Invalid API key or URL" });
      }
    } catch (error) {
      res.json({ connected: false, message: error.message });
    }
  });
  app2.post("/api/seed", async (_req, res) => {
    const existing = await storage.getEmployees();
    if (existing.length > 0) {
      return res.json({ message: "Data already seeded" });
    }
    const seedEmployees = [
      { employeeCode: "EMP-001", firstName: "Carlos", lastName: "Garc\xEDa", email: "carlos.garcia@empresa.com", department: "Ingenier\xEDa", position: "Desarrollador Senior", phone: "+52 55 1234 5678", photoUrl: null, faceRegistered: false, fingerprintRegistered: false, active: true },
      { employeeCode: "EMP-002", firstName: "Mar\xEDa", lastName: "L\xF3pez", email: "maria.lopez@empresa.com", department: "Recursos Humanos", position: "Gerente de RRHH", phone: "+52 55 2345 6789", photoUrl: null, faceRegistered: true, fingerprintRegistered: false, active: true },
      { employeeCode: "EMP-003", firstName: "Juan", lastName: "Mart\xEDnez", email: "juan.martinez@empresa.com", department: "Finanzas", position: "Contador", phone: "+52 55 3456 7890", photoUrl: null, faceRegistered: false, fingerprintRegistered: true, active: true },
      { employeeCode: "EMP-004", firstName: "Ana", lastName: "Hern\xE1ndez", email: "ana.hernandez@empresa.com", department: "Ingenier\xEDa", position: "QA Engineer", phone: "+52 55 4567 8901", photoUrl: null, faceRegistered: true, fingerprintRegistered: true, active: true },
      { employeeCode: "EMP-005", firstName: "Roberto", lastName: "S\xE1nchez", email: "roberto.sanchez@empresa.com", department: "Operaciones", position: "Director de Operaciones", phone: "+52 55 5678 9012", photoUrl: null, faceRegistered: false, fingerprintRegistered: false, active: true }
    ];
    for (const emp of seedEmployees) {
      await storage.createEmployee(emp);
    }
    const allEmployees = await storage.getEmployees();
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const now = /* @__PURE__ */ new Date();
    for (let i = 0; i < 3; i++) {
      const emp = allEmployees[i];
      const checkInTime = new Date(now);
      checkInTime.setHours(7 + i, 30 + i * 15, 0);
      await storage.createAttendance({
        employeeId: emp.id,
        date: today,
        checkIn: checkInTime,
        checkOut: null,
        method: i === 0 ? "face" : i === 1 ? "fingerprint" : "manual",
        status: i === 2 ? "late" : "present",
        notes: null
      });
    }
    res.json({ message: "Seed data created", employees: allEmployees.length });
  });
  return httpServer2;
}

// server/static.ts
var import_express = __toESM(require("express"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
function serveStatic(app2) {
  const distPath = import_path.default.resolve(__dirname, "public");
  if (!import_fs.default.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(import_express.default.static(distPath));
  app2.use("/{*path}", (_req, res) => {
    res.sendFile(import_path.default.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var import_http = require("http");
function getAllowedOrigins() {
  const configured = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "";
  return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
}
var app = (0, import_express2.default)();
var httpServer = (0, import_http.createServer)(app);
var allowedOrigins = getAllowedOrigins();
var shouldServeStatic = process.env.SERVE_STATIC !== "false";
app.use(
  import_express2.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express2.default.urlencoded({ extended: false }));
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }
  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await registerRoutes(httpServer, app);
  app.use((err, _req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
  if (shouldServeStatic) {
    serveStatic(app);
  } else if (false) {
    const { setupVite } = await null;
    await setupVite(httpServer, app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  log
});
//# sourceMappingURL=index.cjs.map
