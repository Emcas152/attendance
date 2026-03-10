# AttendPro - Sistema de Control de Asistencia

## Overview
Professional attendance tracking system with facial recognition (CompreFace integration) and fingerprint biometric support. Built with React + Express + PostgreSQL.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI
- **Backend**: Express.js + Drizzle ORM
- **Database**: PostgreSQL (Replit built-in)
- **Biometrics**: CompreFace (facial recognition), WebAuthn (fingerprint)

## Key Features
- Employee management (CRUD)
- Check-in/check-out with facial recognition or fingerprint
- Attendance history with filters
- Dashboard with real-time stats
- CompreFace integration settings
- Dark/light theme support

## Data Models
- `employees` - Employee records with biometric registration status
- `attendanceRecords` - Check-in/check-out records with method tracking
- `settings` - Key-value configuration store (CompreFace URL, API key, thresholds)

## File Structure
- `shared/schema.ts` - Drizzle schemas and TypeScript types
- `server/db.ts` - Database connection
- `server/storage.ts` - Storage layer with DatabaseStorage class
- `server/routes.ts` - API routes
- `client/src/pages/` - Dashboard, Employees, Check-in, Attendance, Settings
- `client/src/components/` - Sidebar, ThemeToggle

## API Routes
- `GET/POST /api/employees` - Employee CRUD
- `POST /api/attendance/check-in` - Register entry
- `POST /api/attendance/check-out` - Register exit
- `GET /api/attendance` - List records with filters
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/POST /api/settings` - Configuration management
- `POST /api/compreface/*` - CompreFace proxy endpoints
- `POST /api/seed` - Seed demo data
