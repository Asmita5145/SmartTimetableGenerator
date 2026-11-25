# DATABASE MIGRATION AND SCHEMA INTEGRITY REPORT
## AI-Based Smart Timetable Generation System with NEP 2020

---

**Institution:** Dr. Ashok Gujar Technical Institute's Dr. Daulatrao Aher College of Engineering, Karad  
**Department:** Computer Science & Engineering (CSE)  
**Database:** MongoDB Atlas / Local MongoDB (`mongodb://127.0.0.1:27017/SmartTimetableDB`)  
**ODM:** Mongoose v8.x  
**Report Date:** November 24, 2026  

---

## 1. Schema Evolution & Enhancements

To support institution-level multi-tenancy, NEP 2020 course categorization, and parent-child practical batch structures, several schemas were created or extended:

### A. `Institution` Model (`server/models/Institution.js`)
- **Purpose:** Enables multi-tenant institutional isolation so other colleges or universities can run alongside DACOE Karad.
- **Fields:**
  - `name`: Full legal college name (e.g., Dr. Ashok Gujar Technical Institute's Dr. Daulatrao Aher College of Engineering, Karad).
  - `code`: Short code (e.g., `DACOE`).
  - `tagline`: Institutional motto.
  - `address`: Full postal address.
  - `programmes`: Array of supported academic streams (`["B.Tech", "M.Tech", "Diploma"]`).
  - `defaultProgramme`: Default program label (`B.Tech` — replaces legacy "BE").
  - `academicYear`: Active academic year (`2026-27`).

### B. `Batch` Model (`server/models/Batch.js`)
- **Purpose:** Represents laboratory practical batches independently of divisions.
- **Fields:**
  - `name`: Human-readable label (`Batch S1`, `Batch T1`, `Batch B1`).
  - `code`: Standardized code (`S1`, `S2`, `S3`, `S4` for Sem 3; `T1`, `T2`, `T3`, `T4` for Sem 5; `B1`, `B2`, `B3`, `B4` for Sem 7).
  - `semester`: ObjectId reference to `Semester`.
  - `studentCount`: Number of students in batch (16–17).
  - `startRoll` & `endRoll`: Roll number range (e.g. 1–17, 18–33, 34–49, 50–65).
  - `isActive`: Boolean flag.
  - `institution`: ObjectId reference to `Institution`.
  - `department`: ObjectId reference to `Department`.
- **Index:** Compound unique index `{ semester: 1, code: 1 }` prevents duplicate batch codes within the same semester.

### C. `Subject` Model (`server/models/Subject.js`)
- **NEP 2020 Additions:**
  - `courseCategory`: Enum (`CORE`, `ELECTIVE`, `MDM`, `SKILL`, `ABILITY`, `PROJECT`, `AUDIT`).
  - `credits`: Academic credits according to NEP guidelines.
  - `electiveGroup`: Elective basket code (e.g., `PE-I`, `OE-I`) for parallel elective scheduling.
  - `multidisciplinary`: Boolean flag for cross-departmental sharing.

### D. `Semester` Model (`server/models/Semester.js`)
- **Designated Resource Fields:**
  - `designatedRoom`: ObjectId reference to `Room` (CR18 for Sem 3, CR56 for Sem 5, CR57 for Sem 7).
  - `preferredPracticalSlot`: String preferred window (`15:00-17:00`, `12:45-14:45`, `10:00-12:00`).
  - `practicalBatches`: String array of active batch codes (`["S1", "S2", "S3", "S4"]`).
  - `programme`: Default `B.Tech`.

### E. `Timetable` & `MasterTimetable` Models (`server/models/Timetable.js`, `MasterTimetable.js`)
- **Parent-Child Practical Schema:**
  - `entries.entryType`: Enum (`LECTURE`, `PRACTICAL`, `TUTORIAL`, `PROJECT`, `LIBRARY`, `ACTIVITY`).
  - `entries.durationSlots`: Number of continuous slots (1 for lectures, 2 for practicals/projects).
  - `entries.childBatches`: Array of child batch subdocuments:
    - `batch`: String batch code (`S1`, `T1`, `B1`).
    - `subject`: ObjectId reference to `Subject`.
    - `faculty`: ObjectId reference to `Faculty`.
    - `room`: ObjectId reference to `Room` (Laboratory).
    - `durationHours`: Number of teaching hours (2).

---

## 2. Relationship Integrity & Index Matrix

| Collection | Key References | Unique & Compound Indexes |
| :--- | :--- | :--- |
| **`institutions`** | None | `{ code: 1 }` (unique) |
| **`departments`** | `institution` | `{ institution: 1, code: 1 }` (unique) |
| **`semesters`** | `department`, `institution`, `designatedRoom` | `{ department: 1, number: 1 }` (unique) |
| **`batches`** | `semester`, `department`, `institution` | `{ semester: 1, code: 1 }` (unique) |
| **`users`** | `institution`, `department`, `semester`, `division`, `facultyProfile` | `{ email: 1 }` (unique) |
| **`faculty`** | `institution`, `department`, `user` | `{ employeeId: 1 }` (unique), `{ email: 1 }` (unique) |
| **`subjects`** | `institution`, `department`, `semester`, `faculty` | `{ department: 1, code: 1 }` (unique) |
| **`rooms`** | `institution`, `department` | `{ roomNumber: 1 }` (unique) |
| **`timeslots`** | `institution` | `{ day: 1, slotNumber: 1 }` (unique) |
| **`availabilities`** | `resourceId` | `{ resourceType: 1, resourceId: 1, day: 1 }` (unique) |
| **`timetables`** | `institution`, `department`, `semester`, `division` | `{ department: 1, semester: 1, academicYear: 1, division: 1 }` |
| **`mastertimetables`**| `institution`, `department`, `semesters` | `{ department: 1, academicYear: 1 }` |

---

## 3. Database Migration & Seed Verification

The database migration and seeding workflow is automated via `server/seedCSEDepartment.js`.

### Seeding Command
```powershell
node server/seedCSEDepartment.js
```

### Verified Seed Output
1. **Institution:** DACOE Karad (`B.Tech` default).
2. **Department:** Computer Science & Engineering (Code: `CSE`).
3. **Classrooms & Labs:**
   - Classrooms: `CR18` (S.Y. Designated), `CR56` (T.Y. Designated), `CR57` (B.Tech Designated), `CR19` (Tutorial).
   - Computer Labs: `L41` through `L49`.
4. **Semesters & Batches:**
   - Semester 3: Batches `S1`, `S2`, `S3`, `S4` (studentCount 16–17 each, rolls 1–65).
   - Semester 5: Batches `T1`, `T2`, `T3`, `T4` (studentCount 16–17 each, rolls 1–65).
   - Semester 7: Batches `B1`, `B2`, `B3`, `B4` (studentCount 16–17 each, rolls 1–65).
5. **Faculty Roster:** 16 teaching faculty accounts seeded with designations and qualifications.
6. **Student Accounts:** 15 student accounts seeded across all batches with secure passwords (`student123`).
7. **TimeSlots:** 40 weekly slots (Monday to Friday, 10:00 AM – 5:00 PM, 45-min Lunch Break, 15-min Recess).

---

## 4. Data Safety Strategy

- **Idempotency:** `findOneAndUpdate` with `upsert: true` ensures the seeding script can be safely re-run without creating duplicate records.
- **Regeneration Cleanup:** The timetable generator removes only the active timetables matching the current `department`, `academicYear`, and `semesterNumbers` before persisting newly generated schedules. Stale division entries are safely cleared.
