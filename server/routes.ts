import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmployeeSchema, insertAttendanceSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Employee Routes ===
  app.get("/api/employees", async (_req, res) => {
    const employees = await storage.getEmployees();
    res.json(employees);
  });

  app.get("/api/employees/:id", async (req, res) => {
    const employee = await storage.getEmployee(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  });

  app.post("/api/employees", async (req, res) => {
    const parsed = insertEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const employee = await storage.createEmployee(parsed.data);
    res.status(201).json(employee);
  });

  app.patch("/api/employees/:id", async (req, res) => {
    const partial = insertEmployeeSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ message: partial.error.message });
    const employee = await storage.updateEmployee(req.params.id, partial.data);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  });

  app.delete("/api/employees/:id", async (req, res) => {
    await storage.deleteEmployee(req.params.id);
    res.status(204).send();
  });

  // === Attendance Routes ===
  app.get("/api/attendance", async (req, res) => {
    const filters: { employeeId?: string; date?: string } = {};
    if (req.query.employeeId) filters.employeeId = req.query.employeeId as string;
    if (req.query.date) filters.date = req.query.date as string;
    const records = await storage.getAttendanceRecords(filters);
    res.json(records);
  });

  app.post("/api/attendance/check-in", async (req, res) => {
    const { employeeId, method } = req.body;
    if (!employeeId || !method) return res.status(400).json({ message: "employeeId and method required" });

    const employee = await storage.getEmployee(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const existing = await storage.getTodayAttendance(employeeId);
    if (existing && existing.checkIn) {
      return res.status(400).json({ message: "Already checked in today" });
    }

    const now = new Date();
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
      notes: null,
    });

    res.status(201).json({ ...record, employee });
  });

  app.post("/api/attendance/check-out", async (req, res) => {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ message: "employeeId required" });

    const existing = await storage.getTodayAttendance(employeeId);
    if (!existing) return res.status(400).json({ message: "No check-in found for today" });
    if (existing.checkOut) return res.status(400).json({ message: "Already checked out today" });

    const updated = await storage.updateAttendance(existing.id, { checkOut: new Date() });
    const employee = await storage.getEmployee(employeeId);
    res.json({ ...updated, employee });
  });

  // === Dashboard Stats ===
  app.get("/api/dashboard/stats", async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // === Settings Routes ===
  app.get("/api/settings", async (_req, res) => {
    const allSettings = await storage.getAllSettings();
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => { settingsMap[s.key] = s.value; });
    res.json(settingsMap);
  });

  app.post("/api/settings", async (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ message: "key and value required" });
    await storage.setSetting(key, value);
    res.json({ key, value });
  });

  // === CompreFace Proxy ===
  app.post("/api/compreface/recognize", async (req, res) => {
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file: image }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: `CompreFace error: ${error.message}` });
    }
  });

  app.post("/api/compreface/register", async (req, res) => {
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file: image, subject }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: `CompreFace error: ${error.message}` });
    }
  });

  app.post("/api/compreface/test", async (req, res) => {
    const { url, apiKey } = req.body;
    try {
      const response = await fetch(`${url}/api/v1/recognition/subjects`, {
        headers: { "x-api-key": apiKey },
      });
      if (response.ok) {
        res.json({ connected: true });
      } else {
        res.json({ connected: false, message: "Invalid API key or URL" });
      }
    } catch (error: any) {
      res.json({ connected: false, message: error.message });
    }
  });

  // === Seed data ===
  app.post("/api/seed", async (_req, res) => {
    const existing = await storage.getEmployees();
    if (existing.length > 0) {
      return res.json({ message: "Data already seeded" });
    }

    const seedEmployees = [
      { employeeCode: "EMP-001", firstName: "Carlos", lastName: "García", email: "carlos.garcia@empresa.com", department: "Ingeniería", position: "Desarrollador Senior", phone: "+52 55 1234 5678", photoUrl: null, faceRegistered: false, fingerprintRegistered: false, active: true },
      { employeeCode: "EMP-002", firstName: "María", lastName: "López", email: "maria.lopez@empresa.com", department: "Recursos Humanos", position: "Gerente de RRHH", phone: "+52 55 2345 6789", photoUrl: null, faceRegistered: true, fingerprintRegistered: false, active: true },
      { employeeCode: "EMP-003", firstName: "Juan", lastName: "Martínez", email: "juan.martinez@empresa.com", department: "Finanzas", position: "Contador", phone: "+52 55 3456 7890", photoUrl: null, faceRegistered: false, fingerprintRegistered: true, active: true },
      { employeeCode: "EMP-004", firstName: "Ana", lastName: "Hernández", email: "ana.hernandez@empresa.com", department: "Ingeniería", position: "QA Engineer", phone: "+52 55 4567 8901", photoUrl: null, faceRegistered: true, fingerprintRegistered: true, active: true },
      { employeeCode: "EMP-005", firstName: "Roberto", lastName: "Sánchez", email: "roberto.sanchez@empresa.com", department: "Operaciones", position: "Director de Operaciones", phone: "+52 55 5678 9012", photoUrl: null, faceRegistered: false, fingerprintRegistered: false, active: true },
    ];

    for (const emp of seedEmployees) {
      await storage.createEmployee(emp);
    }

    const allEmployees = await storage.getEmployees();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

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
        notes: null,
      });
    }

    res.json({ message: "Seed data created", employees: allEmployees.length });
  });

  return httpServer;
}
