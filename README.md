# MediTrack — Smart Hospital & Patient Management System

MediTrack is an enterprise-grade full-stack Hospital & Appointment Management web application built with **React**, **Node.js**, **Express.js**, and **MongoDB**. Designed for a computer science internship/placement portfolio, it demonstrates clean architecture, RESTful API design, robust role-based authentication, real-time schedule slot calculation, conflict prevention, and a modern healthcare UI.

---

## 1. Core Modules Implemented

### 1. Authentication & Security
- **Role-Based Authorization**: Separate access controls for **Admin** and **Patient** (plus Doctor and Receptionist).
- **Secure Password Hashing**: Utilizes `bcryptjs` with salt rounds for one-way password hashing.
- **JWT Authentication**: Stateless, signed tokens passed via `Authorization: Bearer <token>`.
- **Quick Demo Login Buttons**: Single-click demo authentication on the login page for rapid review.
- **Patient Self-Registration**: Full registration flow automatically creating a unique Medical Record Number (`PT-2026-XXXX`).

### 2. Operational & Clinical Dashboards
- **Admin Dashboard**:
  - Live KPI cards: Total Patients, Active Doctors, Today's Appointments, Completed Consultations.
  - Interactive **Recharts** visualizations: 7-day appointment volume trends and department doctor distribution.
  - Quick action shortcuts to register patients and book consultations.
- **Patient Dashboard**:
  - Prominent upcoming consultation countdown with doctor name, time, and department.
  - Personal demographic and blood group summary card.

### 3. Patient & Doctor Management (Full CRUD)
- **Patient Directory**:
  - Live search by Name, Medical ID (`PT-...`), or Phone number.
  - Filter by Blood Group and Gender.
  - **Add Patient Modal**: Validates demographics, allergies, chronic conditions, and emergency contacts.
  - **View Comprehensive Profile**: Detailed view of clinical background, contact info, and medical notes.
  - **Edit Patient**: Update contact, address, or allergy profiles in real time.
  - **Delete Patient**: Safely removes patient records and cascaded appointments with confirmation modal.
- **Doctor Directory**:
  - Filter by clinical department (Cardiology, Neurology, Orthopedics, General Medicine, Pediatrics, etc.).
  - Search by doctor name or specialization.
  - **Add Specialist Doctor**: Admin form configuring consultation fee, experience, qualifications, and available working days.
  - **Edit & Delete Doctor**: Complete administrative lifecycle control.

### 4. Appointment Management & Conflict Prevention
- **Dynamic Slot Generation**:
  - Real-time slot calculation based on the doctor's working days, daily shifts, and slot duration.
  - Automatic past-date and past-time prevention.
- **Zero Double-Booking Guarantee**:
  - Backend validation prevents duplicate bookings on the same time slot for a doctor (returns HTTP 409 Conflict).
- **Appointment Lifecycle**:
  - New bookings start as `Pending`; the assigned doctor confirms or declines the request from their dashboard.
  - Confirmed appointments can be checked in, completed, rescheduled, or cancelled; declined requests release their time slot.
  - **Reschedule Modal**: Live dynamic slot picker for alternate dates.
  - **Cancellation**: Reason tracking and appointment history retention.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router DOM, Tailwind CSS, Lucide React, Recharts, Axios |
| **Backend** | Node.js, Express.js, JWT, bcryptjs, Mongoose, Express Validator, Morgan |
| **Database** | MongoDB (Seamlessly supports local MongoDB daemon, MongoDB Atlas URI, or embedded zero-config fallback) |
| **Testing** | Automated End-to-End QA Test Suite (`backend/test-modules.js`) |

---

## 3. Seeded Demo Accounts

The system automatically initializes demo clinical data on first launch. You can log in using these accounts:

| Role | Email | Password | Access / Scope |
|---|---|---|---|
| **Hospital Admin** | `admin@meditrack.com` | `AdminPassword123!` | Full administrative access, doctor/patient CRUD, metrics |
| **Patient** | `patient@meditrack.com` | `PatientPassword123!` | Book appointments, view upcoming visits, profile |
| **Doctor** | `doctor@meditrack.com` | `DoctorPassword123!` | Clinical view, schedule, consultation workflow |
| **Doctor — Priya Sharma** | `priya.sharma@meditrack.com` | `DoctorPassword123!` | Clinical dashboard and General Medicine appointments |
| **Doctor — Robert Chen** | `robert.chen@meditrack.com` | `DoctorPassword123!` | Clinical dashboard and Orthopedics appointments |
| **Doctor — Ananya Iyer** | `ananya.iyer@meditrack.com` | `DoctorPassword123!` | Clinical dashboard and Pediatrics appointments |
| **Receptionist** | `reception@meditrack.com` | `ReceptionPassword123!` | Front desk check-ins, patient registration |

*(Tip: The login page includes convenient 1-click preset buttons to test each role instantly).*

---

## 4. Exact Windows Execution Instructions

### Option A: One-Click Startup (Recommended)

1. Open File Explorer and navigate to:
   ```
   C:\Users\Adarsh\.gemini\antigravity\scratch\meditrack
   ```
2. Double-click **`start-meditrack.bat`**.
   - This launches the backend server on port 5000 and the Vite frontend on port 5173 in two terminal windows.
3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

### Option B: PowerShell / Terminal Execution

#### 1. Start the Backend API Server
Open PowerShell and run:
```powershell
$env:PATH = "C:\Users\Adarsh\.gemini\antigravity\scratch\nodejs;$env:PATH"
cd "C:\Users\Adarsh\.gemini\antigravity\scratch\meditrack\backend"
node src/server.js
```
*The server will start on `http://localhost:5000`, auto-seed demo accounts, and connect to MongoDB.*

#### 2. Start the Frontend UI
Open a second PowerShell window and run:
```powershell
$env:PATH = "C:\Users\Adarsh\.gemini\antigravity\scratch\nodejs;$env:PATH"
cd "C:\Users\Adarsh\.gemini\antigravity\scratch\meditrack\frontend"
node node_modules\vite\bin\vite.js
```
*Open `http://localhost:5173` in your browser.*

---

## 5. Verification & Automated Testing

An automated end-to-end integration test is provided in `backend/test-modules.js`.

To run the verification suite:
```powershell
$env:PATH = "C:\Users\Adarsh\.gemini\antigravity\scratch\nodejs;$env:PATH"
cd "C:\Users\Adarsh\.gemini\antigravity\scratch\meditrack\backend"
node test-modules.js
```

### Test Suite Results:
```text
====================================================
MEDITRACK END-TO-END QA TEST SUITE
====================================================
[TEST 1.1] Admin Login                         PASS
[TEST 1.2] Patient Login                       PASS
[TEST 1.3] Patient Self-Registration           PASS
[TEST 2.1] Fetch Admin Dashboard Metrics       PASS
[TEST 2.2] Fetch Patient Dashboard             PASS
[TEST 3.1] Search and Filter Patients          PASS
[TEST 3.2] Admin Register New Patient          PASS
[TEST 3.3] Edit Patient Information            PASS
[TEST 3.4] Delete Test Patient                 PASS
[TEST 3.5] Fetch Doctors List                  PASS
[TEST 3.6] Admin Create & Delete Doctor        PASS
[TEST 4.1] Query Dynamic Available Slots       PASS
[TEST 4.2] Book Appointment Pending Approval    PASS
[TEST 4.3] Conflict Prevention (Double-Booking)PASS (Rejected with 409 Conflict)
[TEST 4.4] Doctor Approval Queue & Role Check  PASS
[TEST 4.5] Doctor Confirms Appointment         PASS
[TEST 4.6] Check-in Approved Appointment        PASS
[TEST 4.7] Complete Appointment                PASS
====================================================
ALL 4 MODULE TESTS PASSED WITH 100% SUCCESS!
====================================================
```

---

## 6. REST API Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate user & retrieve JWT |
| `POST` | `/api/auth/register` | Public | Register new patient account |
| `GET` | `/api/auth/me` | Private | Retrieve current user profile |
| `GET` | `/api/dashboard/admin` | Admin | Fetch metrics, 7-day trends, department stats |
| `GET` | `/api/dashboard/patient`| Patient | Fetch upcoming visits and profile |
| `GET` | `/api/patients` | Staff | List & search patients with filters |
| `POST` | `/api/patients` | Staff | Register new patient record |
| `PUT` | `/api/patients/:id` | Staff | Update patient medical record |
| `DELETE`| `/api/patients/:id` | Admin | Delete patient record |
| `GET` | `/api/doctors` | Public | Doctor directory with department filtering |
| `GET` | `/api/doctors/:id/available-slots` | Public | Dynamic slot availability by date |
| `POST` | `/api/doctors` | Admin | Create doctor profile |
| `PUT` | `/api/doctors/:id` | Admin | Update doctor details & schedule |
| `DELETE`| `/api/doctors/:id` | Admin | Delete doctor profile |
| `GET` | `/api/appointments` | Private | List appointments with filters |
| `POST` | `/api/appointments` | Private | Book appointment with conflict validation |
| `PUT` | `/api/appointments/:id/reschedule`| Private | Reschedule appointment slot |
| `PUT` | `/api/appointments/:id/check-in` | Staff | Patient waiting room check-in |
| `PUT` | `/api/appointments/:id/status` | Staff/Doc | Update consultation status |
| `PUT` | `/api/appointments/:id/cancel` | Private | Cancel appointment with reason |
