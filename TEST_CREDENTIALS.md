# TEST CREDENTIALS DIRECTORY (DEVELOPMENT & DEMO)
## AI-Based Smart Timetable Generation System with NEP 2020

---

**Institution:** Dr. Ashok Gujar Technical Institute's Dr. Daulatrao Aher College of Engineering, Karad  
**Department:** Computer Science & Engineering (CSE)  
**Security Standard:** Bcrypt Password Hashing + JWT Token Authentication  
**Status:** **All Accounts Seeded & Verified**

> **Note:** These credentials are for local development, academic testing, and demonstration purposes. On the login screen (`http://localhost:5173/login`), quick one-click demo login buttons are provided for instant access across roles.

---

## 1. System Administrators & Academic Leadership

| Role | Name | Email Address | Password | Profile Linkage / Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | System Administrator | `admin@smarttimetable.com` | `Admin@123` | Full institutional access, user management, academic CRUD, generator |
| **HOD** | Prof. A. H. Renushe | `hod.cse@dacoe.ac.in` | `hod123` | Linked to Faculty Profile `FAC001`; department oversight, workload reports |
| **COORDINATOR** | Prof. S. P. Kakade | `coordinator.cse@dacoe.ac.in` | `coordinator123` | Linked to Faculty Profile `FAC003`; timetable generation & scheduling operations |

---

## 2. Computer Science & Engineering Faculty (16 Verified Accounts)

All faculty accounts use password: **`faculty123`**

| Employee ID | Faculty Name | Email Address | Designation | Official Workload Duties |
| :--- | :--- | :--- | :--- | :--- |
| **FAC001** | Prof. A. H. Renushe | `ahrenushe@dacoe.ac.in` | Associate Professor & HOD | Advanced Theory & Lab Practicals |
| **FAC002** | Prof. Mrs. P. S. Tanur | `pstanur@dacoe.ac.in` | Assistant Professor | Core Theory & Data Structures Lab |
| **FAC003** | Prof. S. P. Kakade | `spkakade@dacoe.ac.in` | Assistant Professor | Timetable Coordinator, Algorithms & Lab |
| **FAC004** | Prof. A. J. Shedge | `ajshedge@dacoe.ac.in` | Assistant Professor | Database Management Systems & Lab |
| **FAC005** | Prof. B. G. Mane | `bgmane@dacoe.ac.in` | Assistant Professor | Operating Systems, Computer Networks |
| **FAC006** | Prof. K. S. Shinde | `ksshinde@dacoe.ac.in` | Assistant Professor | Software Engineering & Project Lab |
| **FAC007** | Prof. Mrs. V. V. Patil | `vvpatil@dacoe.ac.in` | Assistant Professor | Theory of Computation, Web Dev Lab |
| **FAC008** | Prof. P. V. Desai | `pvdesai@dacoe.ac.in` | Assistant Professor | Artificial Intelligence, Machine Learning |
| **FAC009** | Prof. S. B. Thorat | `sbthorat@dacoe.ac.in` | Assistant Professor | Timetable In-Charge, Cloud Computing |
| **FAC010** | Prof. T. R. Shinde | `trshinde@dacoe.ac.in` | Assistant Professor | Information Security & Cryptography |
| **FAC011** | Prof. J. P. Sarawade | `jpsarawade@dacoe.ac.in` | Assistant Professor | Mobile Computing, Object Oriented Programming |
| **FAC012** | Prof. D. R. Kamble | `drkamble@dacoe.ac.in` | Assistant Professor | Academic In-Charge, Compiler Design |
| **FAC013** | Prof. S. A. Shikalgar | `sashikalgar@dacoe.ac.in` | Assistant Professor | Computer Graphics & Multimedia Lab |
| **FAC014** | Prof. A. A. Karande | `aakarande@dacoe.ac.in` | Assistant Professor | Python Programming & Data Science |
| **FAC015** | Prof. J. S. Salunkhe | `jssalunkhe@dacoe.ac.in` | Assistant Professor | Distributed Systems, Big Data Lab |
| **FAC016** | Dr. Pranali M. Sheth | `pmsheth@dacoe.ac.in` | Assistant Professor | AI Research Lead, Capstone Project-I |

---

## 3. Student Accounts Across All Practical Batches (15 Accounts)

All student accounts use password: **`student123`**

### Semester III (S.Y. B.Tech — Batches S1, S2, S3, S4)
| Batch | Roll No Range | Student Name | Email Address | Assigned Roll |
| :--- | :--- | :--- | :--- | :--- |
| **S1** | 1–17 | Rahul Jadhav | `student.sem3.s1@dacoe.ac.in` | 301 |
| **S2** | 18–33 | Pooja Patil | `student.sem3.s2@dacoe.ac.in` | 318 |
| **S3** | 34–49 | Kunal Deshmukh | `student.sem3.s3@dacoe.ac.in` | 334 |
| **S4** | 50–65 | Anjali Kadam | `student.sem3.s4@dacoe.ac.in` | 350 |
| **Alias** | 1–17 | Rahul Jadhav | `student.sem3@dacoe.ac.in` | 301 |

### Semester V (T.Y. B.Tech — Batches T1, T2, T3, T4)
| Batch | Roll No Range | Student Name | Email Address | Assigned Roll |
| :--- | :--- | :--- | :--- | :--- |
| **T1** | 1–17 | Sneha Patil | `student.sem5.t1@dacoe.ac.in` | 501 |
| **T2** | 18–33 | Vikram Mane | `student.sem5.t2@dacoe.ac.in` | 518 |
| **T3** | 34–49 | Rutuja Chavan | `student.sem5.t3@dacoe.ac.in` | 534 |
| **T4** | 50–65 | Siddharth Shinde | `student.sem5.t4@dacoe.ac.in` | 550 |
| **Alias** | 1–17 | Sneha Patil | `student.sem5@dacoe.ac.in` | 501 |

### Semester VII (Final Year B.Tech — Batches B1, B2, B3, B4)
| Batch | Roll No Range | Student Name | Email Address | Assigned Roll |
| :--- | :--- | :--- | :--- | :--- |
| **B1** | 1–17 | Amit Shinde | `student.sem7.b1@dacoe.ac.in` | 701 |
| **B2** | 18–33 | Divya Salunkhe | `student.sem7.b2@dacoe.ac.in` | 718 |
| **B3** | 34–49 | Omkar Ghadge | `student.sem7.b3@dacoe.ac.in` | 734 |
| **B4** | 50–65 | Priya Pawar | `student.sem7.b4@dacoe.ac.in` | 750 |
| **Alias** | 1–17 | Amit Shinde | `student.sem7@dacoe.ac.in` | 701 |

---

## 4. Verification Check

To test authentication and role authorization for any account:
```powershell
node server/testEndToEnd.js
```
All credentials will be validated against active bcrypt hashes in the MongoDB database.
