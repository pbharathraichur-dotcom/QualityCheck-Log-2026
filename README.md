# QualityCheck Log – Small Batch Quality Inspection System (QCL)

**QualityCheck Log (QCL)** is a professional, industrial-grade quality control web application specifically designed for small-batch and high-mix precision manufacturing (aerospace fittings, medical devices, robotics, electronic PCB assemblies, and boutique CNC fabrication).

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, React Router v6
- **Backend**: Node.js, Express.js (ES Modules), Morgan, CORS
- **Database**: MongoDB with Mongoose
  - **Option 1 (Cloud)**: MongoDB Atlas cluster support (`mongodb+srv://...`).
  - **Option 2 (Local)**: Local MongoDB service (`mongodb://127.0.0.1:27017/qcl_inspection_db`).
  - **Option 3 (Persistent Local Disk)**: Built-in disk-backed database at `server/data/db` using the WiredTiger storage engine. All batches, inspections, sign-offs, and certificates are permanently saved to disk across restarts even without external MongoDB installed.
  - **Conditional Seeding**: Demo data is seeded strictly when the database is empty. Existing data is NEVER wiped or re-seeded on server restart.
- **Language**: JavaScript

---

## 📦 System Architecture & Folder Structure

```
QCL_Project_2026/
├── client/                     # Frontend Application (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Industrial UI: Badge, StatCard, Navbar, Sidebar, Modal
│   │   ├── pages/              # The 6 core modules (Dashboard, Batches, Inspect, Compare, History, Reports)
│   │   ├── services/api.js     # Unified API Client for backend communications
│   │   ├── App.jsx             # Layout & Routing configuration
│   │   ├── index.css           # Industrial dark aesthetic & print stylesheets
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                     # Backend Application (Node.js + Express.js)
│   ├── src/
│   │   ├── config/db.js        # Mongoose connector + auto-fallback Embedded MongoDB
│   │   ├── controllers/        # Batch, Inspection, Analytics & Report controllers
│   │   ├── models/             # Mongoose Schemas (Batch, Inspection, Checkpoints, Defects)
│   │   ├── routes/             # RESTful API endpoints
│   │   ├── seed.js             # Realistic industrial demo seed data
│   │   └── server.js           # Express app server entry point
│   ├── test/api.test.js        # Automated verification test suite
│   ├── .env                    # Environment configuration
│   └── package.json
│
├── package.json                # Root helper scripts
└── README.md
```

---

## 🚀 The 6 Functional Modules

### 1. Dashboard
- **Executive Quality KPIs**: Total Batches, Pass Rate (%), First Pass Yield (FPY %), Active Quarantined count, Total Defects.
- **Defect Pareto Analysis (80/20)**: Visual category distribution with cumulative percentage calculations.
- **7-Day Inspection Activity Trend**: Daily pass vs fail visualization.
- **Recent Inspections Table**: Direct access to past runs and Certificate of Analysis links.

### 2. Manage Batches
- **Batch Registry**: Full listing with status badges (`Pending`, `In Progress`, `Passed`, `Quarantined`, `Reworked`, `Rejected`).
- **Create Batch Modal**: Define Lot Size, Sample Size, Station, Priority, and dynamic tolerance checkpoints (Nominal, LSL, USL, Units, Pass/Fail, and Critical gate flags).
- **Material Review Board (MRB) Disposition**: Authorize `Rework`, `Scrap`, `Concession (Use As-Is)`, or `Release` for quarantined lots.
- **Search & Filters**: Instant multi-parameter filtering by Status, Priority, SKU, or Batch number.

### 3. New Inspection
- **Interactive Multi-Sample Runner**: Rapid data entry across sample items (Sample 1 to N).
- **Live Tolerance Math**: Real-time evaluation of quantitative measurements ($LSL \le \text{Value} \le USL$) showing instant green/red badges and exact deviation ($\Delta$).
- **Defect & NCR Logger**: Tag anomalies with severity (`Minor`, `Major`, `Critical`) and trigger automatic quarantine gates on critical breaches.
- **Digital Sign-Off**: Automated certificate serial generation upon inspection completion.

### 4. Batch Comparison
- **Side-by-Side Analysis**: Compare 2 to 4 batches simultaneously.
- **Process Capability Comparison**: Cross-batch variance table comparing nominal spec targets against actual measured averages, min/max ranges, and defect rates.
- **Quality Index**: Algorithmic scoring (0–100) identifying the lot with superior quality consistency.

### 5. Inspection History
- **Traceability Audit Trail**: Comprehensive searchable archive of every quality check executed.
- **Audit Detail Modal**: Granular inspection record with individual sample measurements, deviations, and logged defects.
- **QA Sign-Off Workflow**: Quality Director digital authorization button.

### 6. Quality Reports (Certificate of Analysis - CoA)
- **Official Conformance Certificate**: Compliant with ISO 9001 Clause 8.6 standards.
- **Detailed Specification Table**: Technical checkpoints, tolerance limits, actual values, and defect logs.
- **Digital Signatures**: Inspector digital signature stamp and QA Director approval block.
- **Print / PDF Export Ready**: Clean `@media print` styling that formats the certificate directly for printing or saving to PDF with 1-click.

---

## 🗄️ Database Configuration (Persistence Guaranteed)

QCL supports three persistent storage tiers configured in `server/.env`:

### Option A: MongoDB Atlas (Recommended for Cloud / Team Production)
1. Sign in to [MongoDB Atlas](https://cloud.mongodb.com/) and create a free Shared Cluster.
2. Under **Security → Database Access**, create a database user (username and password).
3. Under **Security → Network Access**, add an IP entry (add `0.0.0.0/0` for development access).
4. Go to **Clusters → Connect → Drivers** and copy your connection string.
5. In `server/.env`, set:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/qcl_inspection_db?retryWrites=true&w=majority
   ```

### Option B: Persistent Local MongoDB (Community Server)
If you have MongoDB Community Server installed locally:
1. Ensure the Windows MongoDB service is running (or run `mongod` in a terminal).
2. In `server/.env`, set:
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/qcl_inspection_db
   ```

### Option C: Built-in Persistent Disk Storage (Zero-Config Offline Mode)
If `MONGO_URI` is omitted or local MongoDB port 27017 is offline, QCL automatically activates a **disk-persisted WiredTiger database** at `server/data/db/`.
- All batches, measurements, QA sign-offs, and certificates are saved to disk files.
- **Restarting the server reopens the existing database without wiping or re-seeding data.**

---

## 🧪 Testing Data Persistence

To verify that your data, QA approvals, and certificates survive process restarts without being re-seeded or lost:

```bash
cd server
npm run test:persistence
```

This automated test:
1. Starts the backend server process.
2. Creates a custom batch, executes an inspection with tolerances, and records a QA Director sign-off.
3. Kills the server process completely (simulating a crash or restart).
4. Boots a brand new server process.
5. Verifies that the batch, inspection record, QA Director signature, and Certificate of Analysis (CoA) are 100% intact, and that demo data was NOT re-seeded.
6. Cleans up test artifacts.

---

## ⚙️ How to Run the Project

### 1. Start the Backend API Server
```bash
cd server
npm start
```
The backend will connect to your configured database and start on port `5000`.  
Health check with live persistence diagnostics: `http://localhost:5000/api/health`

### 2. Run the Verification Tests
```bash
# Run API endpoint tests
npm run test:server

# Run persistence crash/restart tests
npm run test:persistence
```

### 3. Start the Frontend Application
In a second terminal:
```bash
cd client
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/batches` | List batches with query filters (`status`, `priority`, `search`) |
| `POST` | `/api/batches` | Create a new batch with custom checkpoints |
| `GET` | `/api/batches/:id` | Fetch batch details with inspections |
| `PUT` | `/api/batches/:id` | Update batch specification |
| `DELETE` | `/api/batches/:id` | Delete batch and associated inspections |
| `PATCH` | `/api/batches/:id/disposition`| Record MRB quarantine disposition (Rework/Scrap/Concession) |
| `GET` | `/api/inspections` | Filterable list of all completed inspections |
| `POST` | `/api/inspections` | Submit sample measurements, evaluate tolerances & update batch status |
| `GET` | `/api/inspections/:id` | Detailed inspection audit data |
| `PATCH` | `/api/inspections/:id/sign-off` | Quality Director digital sign-off |
| `GET` | `/api/analytics/dashboard` | Dashboard KPIs, Pareto defect distribution, 7-day trend |
| `POST` | `/api/analytics/compare` | Cross-batch comparative metrics & variance analysis |
| `GET` | `/api/reports/:batchId` | Certificate of Analysis (CoA) complete report document |

