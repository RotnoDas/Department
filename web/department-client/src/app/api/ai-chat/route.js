import { NextResponse } from "next/server";

// Comprehensive, 100% accurate knowledge base of the PUST CSE Department & Web Platform
const SYSTEM_INSTRUCTION = `You are the official Academic & Support AI Assistant of the Department of Computer Science & Engineering (CSE) at Pabna University of Science and Technology (PUST) (https://cse.pust.ac.bd).

CRITICAL DIRECTIVES:
1. STRICT ACCURACY: You must ONLY provide factual information that exactly matches this official PUST CSE platform. NEVER invent false courses, wrong credits, or fake procedures.
2. STRICT LANGUAGE MATCHING:
   - If the user asks in Bengali (বাংলায় প্রশ্ন করলে), you MUST answer FULLY, FLUENTLY, AND POLITELY IN BENGALI (সম্পূর্ণ উত্তর বাংলায় দিন).
   - If the user asks in English, answer in English.
3. STRICT LINKING WHITELIST - Only use these exact valid routes. NEVER invent links like /routine, /curriculum, /courses, /about, /contact:
   - Student Dashboard (Timetable, Face Attendance, Materials): [Student Portal](/dashboard/student)
   - Teacher Dashboard (Routine, Lecture Uploads, Assignments): [Teacher Portal](/dashboard/teacher)
   - Administrator Console (Approvals, Conflict-Free Routine Grid, Grievances): [Admin Portal](/dashboard/admin)
   - Official Notice Board with Audio Broadcasts: [Notice Board](/notices)
   - Support & Grievance Registry: [Support Desk](/#support)
   - Core Features & Biometrics: [Core Features](/#features)
   - Portal Highlights: [Portal Overview](/#overview)
   - Student Registration: [Register Account](/register)
   - Portal Login: [Sign In](/login)
   - Restricted Access Info: [Login Required Info](/login-required)

=======================================================
1. DEPARTMENT & UNIVERSITY PROFILE
=======================================================
- University: Pabna University of Science and Technology (PUST)
- Department: Department of Computer Science & Engineering (CSE)
- Degree: Bachelor of Science in Computer Science & Engineering (B.Sc. Engg. in CSE)
- Program Duration: 4 Years, 8 Semesters, 160 Total Credits.
- Location: PUST CSE Building, Pabna - 6600, Bangladesh (GPS: 24.01296° N, 89.280835° E).
- Office Hotline: +880 1712-345678 | Email: office@cse.pust.ac.bd
- Official Hours: Saturday to Wednesday, 09:00 AM – 05:00 PM (Thursday & Friday are official university weekend).

=======================================================
2. COMPLETE OFFICIAL CURRICULUM (SEMESTERS 1 TO 8)
=======================================================
Semester 1 (1st Year, 1st Term):
- CSE 1101: Computer Fundamentals (3.0 cr)
- CSE 1102: Computer Fundamentals Sessional (1.5 cr)
- CSE 1103: Structured Programming Language (3.0 cr)
- CSE 1104: Structured Programming Language Sessional (1.5 cr)
- MATH 1101: Differential Calculus and Co-ordinate Geometry (3.0 cr)
- PHY 1101: Physics (3.0 cr)
- HUM 1101: Communicative English (3.0 cr)
- HUM 1102: Communicative English Sessional (0.75 cr)
- CSE 1150: Viva Voce (0.75 cr)

Semester 2 (1st Year, 2nd Term):
- ME 1200: Engineering Drawing (1.0 cr)
- CSE 1200: Analytical Programming Sessional (0.75 cr)
- CSE 1201: Object Oriented Programming (3.0 cr)
- CSE 1202: Object Oriented Programming Sessional (1.5 cr)
- CSE 1203: Discrete Mathematics (3.0 cr)
- EEE 1201: Basic Electrical Engineering (3.0 cr)
- EEE 1202: Basic Electrical Engineering Sessional (1.5 cr)
- MATH 1201: Integral Calculus, Differential Equation and Series Solutions (3.0 cr)
- HUM 1201: Economics (2.0 cr)
- CSE 1250: Viva Voce (0.75 cr)

Semester 3 (2nd Year, 1st Term):
- CSE 2100: Mobile Application Development Project (1.5 cr)
- CSE 2101: Data Structures (3.0 cr)
- CSE 2102: Data Structures Sessional (1.5 cr)
- CSE 2103: Design Pattern and Java Programming (3.0 cr)
- CSE 2104: Design Pattern and Java Programming Sessional (0.75 cr)
- EEE 2101: Electronic Devices and Circuits (3.0 cr)
- EEE 2102: Electronic Devices and Circuits Sessional (0.75 cr)
- MATH 2101: Vector, Matrices and Linear Algebra (3.0 cr)
- STAT 2101: Elementary Statistics and Probability (3.0 cr)
- CSE 2150: Viva Voce (0.75 cr)

Semester 4 (2nd Year, 2nd Term):
- CSE 2200: Hardware Project (1.5 cr)
- CSE 2201: Algorithms (3.0 cr)
- CSE 2202: Algorithms Sessional (1.5 cr)
- CSE 2203: Theory of Computation (2.0 cr)
- CSE 2205: Digital Systems (3.0 cr)
- CSE 2206: Digital Systems Sessional (1.5 cr)
- MATH 2201: Complex analysis, Laplace and Fourier Transforms (3.0 cr)
- STAT 2201: Theory of Statistics (3.0 cr)
- CSE 2250: Viva Voce (0.75 cr)

Semester 5 (3rd Year, 1st Term):
- CSE 3100: Software Project I (1.5 cr)
- CSE 3101: Computer Architecture and Organization (3.0 cr)
- CSE 3103: Compiler Design (3.0 cr)
- CSE 3104: Compiler Design Sessional (0.75 cr)
- CSE 3105: Numerical Methods (3.0 cr)
- CSE 3106: Numerical Methods Sessional (0.75 cr)
- CSE 3107: Database Management Systems (3.0 cr)
- CSE 3108: Database Management Systems Sessional (1.5 cr)
- ECE 3101: Data Communication (3.0 cr)
- ECE 3102: Data Communication Sessional (0.75 cr)
- CSE 3150: Viva Voce (0.75 cr)

Semester 6 (3rd Year, 2nd Term):
- CSE 3200: Software Project II (1.5 cr)
- CSE 3201: System Analysis and Design (3.0 cr)
- CSE 3203: Operating Systems (3.0 cr)
- CSE 3204: Operating Systems Sessional (1.5 cr)
- CSE 3205: Web Engineering (3.0 cr)
- CSE 3206: Web Engineering Sessional (1.0 cr)
- CSE 3207: Digital Signal Processing (3.0 cr)
- CSE 3208: Digital Signal Processing Sessional (0.75 cr)
- CSE 3209: Microprocessors and Assembly Language (3.0 cr)
- CSE 3210: Microprocessors and Assembly Language Sessional (1.5 cr)
- CSE 3250: Viva Voce (0.75 cr)

Semester 7 (4th Year, 1st Term):
- CSE 4100: Thesis (1.5 cr)
- CSE 4101: Software Engineering (3.0 cr)
- CSE 4102: Software Project III (1.5 cr)
- CSE 4103: Artificial Intelligence (3.0 cr)
- CSE 4104: Artificial Intelligence Sessional (0.75 cr)
- CSE 4105: Digital Image Processing (3.0 cr)
- CSE 4106: Digital Image Processing Sessional (1.5 cr)
- CSE 4119: Machine Learning (3.0 cr)
- HUM 4101: Sociology and Bangladesh Studies (3.0 cr)
- CSE 4150: Viva Voce (0.75 cr)

Semester 8 (4th Year, 2nd Term):
- CSE 4200: Thesis (3.0 cr)
- CSE 4201: Computer Networks (3.0 cr)
- CSE 4202: Computer Networks Sessional (1.5 cr)
- CSE 4203: Computer Graphics (3.0 cr)
- CSE 4204: Computer Graphics Sessional (1.5 cr)
- CSE 4205: Interfacing and Micro Controllers (3.0 cr)
- CSE 4206: Interfacing and Micro Controllers Sessional (0.75 cr)
- CSE 4217: Human Computer Interaction (3.0 cr)
- HUM 4201: Industrial Management and Accounting (3.0 cr)
- CSE 4250: Viva Voce (0.75 cr)

=======================================================
3. SMART ATTENDANCE & BIOMETRIC LIVENESS
=======================================================
- Geofence Rule: Strict 10-meter radius around the PUST CSE Building (24.01296° N, 89.280835° E). The browser must share GPS location and be within 10 meters.
- Time Window: Check-in opens automatically at class start time and remains markable for exactly 10 minutes.
- Active AI Facial Liveness Microservice (OpenCV DNN):
  * YuNet ONNX: Ultra-fast face detection & 5 facial landmarks.
  * SFace ONNX: 128-dimensional identity embedding vector (cosine similarity threshold 0.42).
  * Facemark LBF: 68 landmarks measuring Eye Aspect Ratio (EAR) for natural blink detection (drops >= 22% over 5 frames).
  * 3 Active Challenges: Center (frontal anchor), Left/Right head yaw turn, and Blink. Prevents printed photo or screen spoofing attacks.
  * Enrolled reference faces are created in the student portal onboarding.

=======================================================
4. ACADEMIC ROUTINE & TIMETABLE
=======================================================
- Academic Days: Saturday, Sunday, Monday, Tuesday, Wednesday (Thursday & Friday are weekend).
- Daily Time Slots:
  * 09:00 - 10:00
  * 10:00 - 11:00
  * 11:00 - 12:00
  * 12:00 - 01:00
  * 01:00 - 02:00 (Prayer & Lunch Break)
  * 02:00 - 03:00
  * 03:00 - 04:00
  * 04:00 - 05:00
- Theory Rooms: Rooms 401, 402, 403, 404, 501, 502, 407, 408.
- Specialized Laboratories: Software Lab 1, Hardware & Electronics Lab, Mobile App & Web Lab, Algorithms & Systems Lab, Database & Compiler Lab, Networks & Security Lab, AI & Data Science Lab, Robotics & Embedded Systems Lab.
- Routine conflict engine in Admin Dashboard prevents teacher and room schedule overlap.

=======================================================
5. SUPPORT & COMPLAINTS DESK
=======================================================
- 24/7 transparent grievance & technical ticketing located on the homepage (/#support).
- Submission Types:
  * Confidential Grievances: Tracking format CMP-XXXX-XXXX. Supports 100% Anonymous mode (masked author identity).
  * Technical IT Support Tickets: Tracking format IT-XXXX-XXXX for portal/login errors.
  * General Inquiries: Tracking format INQ-XXXX-XXXX.
- Live Public Tracking: Users check progress (Submitted -> Under Review -> Investigating -> Resolved -> Closed) using their tracking code.
- Administrator Resolution: Only department administrators review, respond, and resolve complaints in /dashboard/admin. Admins cannot submit complaints on the homepage.

=======================================================
6. NOTICE BOARD & AUDIO BROADCASTS
=======================================================
- Notices Board (/notices) displays official circulars, exam schedules, and emergency alerts.
- Audio Voice Memos: Teachers and admins can record voice announcements with circulars; visitors can listen to audio memos directly on notice cards.
- Supports PDF, documents, and image attachments.

=======================================================
7. ASSIGNMENTS & COURSE MATERIALS
=======================================================
- Teachers upload lecture slides, PDF notes, and syllabus files by course code.
- Teachers create assignments with due dates; students submit coursework with attachments and notes.
- Teachers evaluate submissions and post grades in the Teacher Hub.

=======================================================
8. ROLES & REGISTRATION LIFECYCLE
=======================================================
1. Registration: New students sign up at /register.
2. Pending State: Account enters "pending" status (/pending).
3. Admin Verification: Administrator inspects credentials in /dashboard/admin and clicks "Approve" (or Bulk Approve All).
4. Portal Access: Once approved, students log in at /login to unlock the full Student Portal (/dashboard/student).
5. Role Panels:
   - Student: /dashboard/student
   - Teacher: /dashboard/teacher
   - Admin: /dashboard/admin
   - Staff/Employee: /dashboard/employee
`;

// Helper: check if text contains Bengali Unicode characters
function isBengaliText(str = "") {
  return /[\u0980-\u09FF]/.test(str);
}

// Built-in verified knowledge engine fallback (Bilingual: English & Bengali)
function getFallbackResponse(query) {
  const q = (query || "").toLowerCase();
  const isBangla = isBengaliText(query);

  // 1. Attendance & Face Verification
  if (q.includes("attendance") || q.includes("face") || q.includes("উপস্থিতি") || q.includes("হাজিরা") || q.includes("liveness") || q.includes("geofence")) {
    if (isBangla) {
      return `### স্মার্ট জিওফেন্স ও এআই ফেস হাজিরা পদ্ধতি

পাবনা বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (পবিপ্রবি) সিএসই বিভাগের হাজিরা ব্যবস্থা **জিপিএস জিওফেন্সিং** এবং **ওপেনসিভি এআই বায়োমেট্রিক ফেস ভেরিফিকেশন** প্রযুক্তিতে পরিচালিত:

1. **ক্লাসরুম জিওফেন্স (১০ মিটার ব্যাসার্ধ):**
   - ক্লাসে উপস্থিত থাকার জন্য ছাত্র-ছাত্রীকে অবশ্যই **পবিপ্রবি সিএসই ভবনের** ক্লাসরুমের ১০ মিটারের মধ্যে উপস্থিত থাকতে হবে।
   - ক্লাস শুরুর সাথে সাথে স্বয়ংক্রিয়ভাবে হাজিরা উইন্ডো চালু হয় এবং মাত্র **১০ মিনিট** খোলা থাকে।

2. **এক্টিভ লাইভনেস ফেস ভেরিফিকেশন (YuNet + SFace + Facemark LBF):**
   - **YuNet ONNX:** দ্রুত ও নির্ভুল ফেস ডিটেকশন ও ৫টি ল্যান্ডমার্ক পয়েন্ট শনাক্ত করে।
   - **SFace ONNX:** ১২৮-মাত্রিক আইডেন্টিটি ভেক্টর তৈরি করে আসল শিক্ষার্থীর সাথে মিল যাচাই করে।
   - **Facemark LBF:** চোখের পাতা পড়ার হার (Eye Aspect Ratio - EAR) মেপে জীবন্ত মানুষ নিশ্চিত করে।
   - ৩টি লাইভ স্টেপ: সোজা ক্যামেরার দিকে তাকানো, মাথা ডানে/বামে ঘোরানো এবং চোখের পলক ফেলা (ছবি বা স্ক্রিন প্রক্সি প্রতিরোধ করে)।

👉 ক্লাসের সময় শিক্ষার্থীরা [Student Portal](/dashboard/student)-এ গিয়ে সরাসরি হাজিরা দিতে পারবেন।`;
    }

    return `### Smart Geofence & AI Face Attendance

The PUST CSE Department attendance system combines **GPS Geofencing** and **Active OpenCV Biometric AI**:

1. **Classroom Geofence (10-Meter Radius):**
   - You must be physically inside the **PUST CSE Building** (within 10m of the classroom).
   - Check-in window opens at the scheduled class start time and remains markable for exactly **10 minutes**.

2. **Active Liveness Facial Verification:**
   - Powered by OpenCV **YuNet** (face detection), **SFace** (128-d biometric identity matching), and **Facemark LBF** (blink EAR measurement).
   - Quick 3-step active liveness challenge:
     * **Step 1 (Center):** Look straight at the camera.
     * **Step 2 (Head Turn):** Slowly turn head to the left/right.
     * **Step 3 (Blink):** Blink eyes naturally.
   - Completely defeats 2D printed photos or phone screen replay attacks.

👉 Students can mark attendance on the [Student Portal](/dashboard/student) during active class sessions.`;
  }

  // 2. Routine & Timetable
  if (q.includes("routine") || q.includes("schedule") || q.includes("ক্লাস") || q.includes("রুটিন") || q.includes("time") || q.includes("slot")) {
    if (isBangla) {
      return `### সাপ্তাহিক ক্লাস রুটিন ও সময়সূচি

পবিপ্রবি সিএসই বিভাগের ক্লাস শনিবার থেকে বুধবার পর্যন্ত পরিচালিত হয় (বৃহস্পতিবার ও শুক্রবার সাপ্তাহিক ছুটি):

- **দৈনিক ক্লাসের সময়সূচি:**
  * সকালের সেশন: \`09:00 - 10:00\`, \`10:00 - 11:00\`, \`11:00 - 12:00\`, \`12:00 - 01:00\`
  * মধ্যাহ্ন ও নামাজের বিরতি: \`01:00 - 02:00\`
  * বিকালের সেশন: \`02:00 - 03:00\`, \`03:00 - 04:00\`, \`04:00 - 05:00\`
- **ক্লাসরুম:** পবিপ্রবি সিএসই ভবনের রুম ৪০১–৪০৮ এবং ৫০১–৫০২।
- **ল্যাবরেটরি:** সফটওয়্যার ল্যাব ১, এআই ও ডেটা সায়েন্স ল্যাব, নেটওয়ার্ক ও সিকিউরিটি ল্যাব, হার্ডওয়্যার ল্যাব, ডেটাবেজ ও কম্পাইলার ল্যাব।

👉 সেমিস্টারভিত্তিক ব্যক্তিগত রুটিন দেখতে [Student Portal](/dashboard/student) অথবা শিক্ষকদের রুটিনের জন্য [Teacher Portal](/dashboard/teacher)-এ প্রবেশ করুন।`;
    }

    return `### Academic Class Routine & Schedule

The CSE Department operates on a weekly academic schedule:

- **Class Days:** Saturday to Wednesday (Thursday & Friday are official university weekend).
- **Daily Slots:**
  * Morning: \`09:00 - 10:00\`, \`10:00 - 11:00\`, \`11:00 - 12:00\`, \`12:00 - 01:00\`
  * Break: \`01:00 - 02:00\` (Prayer & Lunch Break)
  * Afternoon: \`02:00 - 03:00\`, \`03:00 - 04:00\`, \`04:00 - 05:00\`
- **Classrooms:** Rooms 401–408 & 501–502 in the PUST CSE Building.
- **Laboratories:** Software Lab 1, AI & Data Science Lab, Networks & Security Lab, Hardware & Electronics Lab, Database & Compiler Lab.

👉 View your active schedule on the [Student Portal](/dashboard/student) or [Teacher Portal](/dashboard/teacher).`;
  }

  // 3. Curriculum & Courses (Actual PUST CSE Curriculum)
  if (q.includes("course") || q.includes("curriculum") || q.includes("syllabus") || q.includes("credit") || q.includes("কোর্স") || q.includes("সেমিস্টার") || q.includes("সিলেবাস")) {
    if (isBangla) {
      return `### পবিপ্রবি সিএসই একাডেমিক পাঠ্যক্রম (সেমিস্টার ১ থেকে ৮)

বি.এসসি. ইঞ্জিনিয়ারিং ইন সিএসই প্রোগ্রামে মোট **১৬০ ক্রেডিট** সম্পন্ন করতে হয়:

- **১ম বর্ষ (সেমিস্টার ১ ও ২):** সি প্রোগ্রামিং, কম্পিউটার ফান্ডামেন্টালস, ওওপি (C++), ডিসক্রিট ম্যাথ, ইলেকট্রিক্যাল ইঞ্জিনিয়ারিং, ক্যালকুলাস, ফিজিক্স, ইংরেজি।
- **২য় বর্ষ (সেমিস্টার ৩ ও ৪):** ডেটা স্ট্রাকচার্স, জাভা ও ডিজাইন প্যাটার্নস, অ্যালগরিদমস, থিওরি অফ কম্পিউটেশন, ডিজিটাল সিস্টেমস, ইলেকট্রনিক্স, মোবাইল অ্যাপ প্রজেক্ট, হার্ডওয়্যার প্রজেক্ট।
- **৩য় বর্ষ (সেমিস্টার ৫ ও ৬):**
  * **সেমিস্টার ৫:** সফটওয়্যার প্রজেক্ট ১, কম্পিউটার আর্কিটেকচার, কম্পাইলার ডিজাইন, নিউমেরিক্যাল মেথডস, ডেটাবেজ ম্যানেজমেন্ট সিস্টেমস (DBMS), ডেটা কমিউনিকেশন।
  * **সেমিস্টার ৬:** সফটওয়্যার প্রজেক্ট ২, সিস্টেম অ্যানালাইসিস অ্যান্ড ডিজাইন, অপারেটিং সিস্টেমস, ওয়েব ইঞ্জিনিয়ারিং, ডিজিটাল সিগন্যাল প্রসেসিং (DSP), মাইক্রোপ্রসেসর ও অ্যাসেম্বলি ল্যাঙ্গুয়েজ।
- **৪র্থ বর্ষ (সেমিস্টার ৭ ও ৮):**
  * **সেমিস্টার ৭:** সফটওয়্যার ইঞ্জিনিয়ারিং, আর্টিফিশিয়াল ইন্টেলিজেন্স (AI), ডিজিটাল ইমেজ প্রসেসিং, মেশিন লার্নিং (CSE 4119), সমাজবিজ্ঞান ও বাংলাদেশ স্টাডিজ, থিসিস।
  * **সেমিস্টার ৮:** কম্পিউটার নেটওয়ার্কস (CSE 4201), কম্পিউটার গ্রাফিক্স, ইন্টারফেসিং ও মাইক্রোকন্ট্রোলার, হিউম্যান কম্পিউটার ইন্টারঅ্যাকশন (HCI), ইন্ডাস্ট্রিয়াল ম্যানেজমেন্ট ও অ্যাকাউন্টিং, ফাইনাল থিসিস।

👉 বিস্তারিত কোর্স আউটলাইন এবং লেকচার স্লাইড ডাউনলোড করতে [Student Portal](/dashboard/student)-এ যান।`;
    }

    return `### PUST CSE Academic Curriculum (Semesters 1 to 8)

The B.Sc. Engineering in CSE degree requires **160 total credits** across 8 semesters:

- **Year 1 (Sem 1 & 2):** C Programming, Computer Fundamentals, OOP (C++), Discrete Math, Electrical Engineering, Calculus, Physics, English.
- **Year 2 (Sem 3 & 4):** Data Structures, Java & Design Patterns, Algorithms, Theory of Computation, Digital Systems, Electronics, Mobile App & Hardware Projects.
- **Year 3 (Sem 5 & 6):**
  * **Semester 5:** Software Project I, Computer Architecture, Compiler Design, Numerical Methods, Database Management Systems (DBMS), Data Communication.
  * **Semester 6:** Software Project II, System Analysis & Design, Operating Systems, Web Engineering, Digital Signal Processing (DSP), Microprocessors & Assembly.
- **Year 4 (Sem 7 & 8):**
  * **Semester 7:** Software Engineering, Artificial Intelligence (AI), Digital Image Processing, Machine Learning (CSE 4119), Sociology, Thesis.
  * **Semester 8:** Computer Networks (CSE 4201), Computer Graphics, Interfacing & Microcontrollers, Human Computer Interaction (HCI), Industrial Management, Final Thesis.

👉 Download lecture notes and syllabus resources inside the [Student Portal](/dashboard/student).`;
  }

  // 4. Support, Complaints & Grievance Registry
  if (q.includes("complaint") || q.includes("grievance") || q.includes("support") || q.includes("অভিযোগ") || q.includes("ticket") || q.includes("inquiry")) {
    if (isBangla) {
      return `### সহায়তা ও অভিযোগ ডেস্ক (Support & Grievance Desk)

পবিপ্রবি সিএসই বিভাগের হোমপেজে ২৪/৭ স্বচ্ছ সহায়তা সেবা চালু রয়েছে:

1. **গোপন অভিযোগ (Confidential Grievance):**
   - একাডেমিক, আবাসন বা ল্যাব সংক্রান্ত যেকোনো সমস্যা নিরাপদে জানানো যায়।
   - **১০০% অ্যানোনিমাস (Anonymous Mode)** সুবিধা রয়েছে—আপনার পরিচয় সম্পূর্ণ গোপন থাকবে। ট্র্যাকিং কোড: \`CMP-XXXX-XXXX\`।
2. **আইটি ও টেকনিক্যাল হেল্পডেস্ক (IT Support):**
   - পোর্টাল লগইন সমস্যা, কোর্স রেজিস্ট্রেশন বা পাসওয়ার্ড সংক্রান্ত সহায়তার জন্য। ট্র্যাকিং কোড: \`IT-XXXX-XXXX\`।
3. **সাধারণ অনুসন্ধান (General Inquiry):**
   - ভর্তি, ট্রান্সক্রিপ্ট বা বিভাগীয় তথ্যের জন্য। ট্র্যাকিং কোড: \`INQ-XXXX-XXXX\`।
4. **ট্র্যাকিং পদ্ধতি:**
   - সাবমিট করার পর পাওয়া ট্র্যাকিং কোড দিয়ে [Support Desk](/#support)-এ সরাসরি স্ট্যাটাস দেখা যায়।

*(বিঃদ্রঃ বিভাগীয় অ্যাডমিনিস্ট্রেটরগণ অ্যাডমিন প্যানেল থেকে অভিযোগ যাচাই ও সমাধান করেন। অ্যাডমিন হোমপেজ থেকে অভিযোগ সাবমিট করতে পারেন না।)*`;
    }

    return `### Support & Complaints Desk

The department provides a 24/7 transparent assistance portal located right on the homepage:

1. **Confidential Grievances:** Submit academic or facility issues with a **100% Anonymous mode** option (Tracking format: \`CMP-XXXX-XXXX\`).
2. **IT Technical Helpdesk:** Assistance with portal access, password resets, or classroom tools (Tracking format: \`IT-XXXX-XXXX\`).
3. **General Inquiries:** Office inquiries regarding transcripts, admissions, or department queries (Tracking format: \`INQ-XXXX-XXXX\`).
4. **Live Ticket Tracking:** Enter your reference code on the [Support Desk](/#support) to monitor administration responses live.

*(Note: Department Administrators inspect and resolve grievances inside the Admin Hub; admins cannot file complaints on the homepage.)*`;
  }

  // 5. Account Registration & Approval Workflow
  if (q.includes("register") || q.includes("approval") || q.includes("pending") || q.includes("login") || q.includes("ভর্তি") || q.includes("রেজিস্ট্রেশন") || q.includes("sign")) {
    if (isBangla) {
      return `### একাউন্ট রেজিস্ট্রেশন ও অ্যাডমিন ভেরিফিকেশন

1. **রেজিস্ট্রেশন:**
   - নতুন শিক্ষার্থীরা [Register Account](/register) পেজে গিয়ে নাম, শিক্ষার্থী ইমেইল ও পাসওয়ার্ড দিয়ে একাউন্ট তৈরি করবেন।
2. **পেন্ডিং স্টেট (Pending Review):**
   - সাইবার নিরাপত্তার স্বার্থে নতুন একাউন্ট স্বয়ংক্রিয়ভাবে **Pending Approval** অবস্থায় থাকে।
3. **অ্যাডমিন অনুমোদন:**
   - বিভাগীয় অ্যাডমিনিস্ট্রেটর অ্যাডমিন প্যানেল ([Admin Portal](/dashboard/admin)) থেকে শিক্ষার্থীর তথ্য যাচাই করে অনুমোদন (Approve) প্রদান করেন।
4. **লগইন ও ব্যবহার:**
   - অনুমোদন সম্পন্ন হলে [Sign In](/login) পেজে লগইন করে [Student Portal](/dashboard/student)-এর সকল সেবা ব্যবহার করতে পারবেন।`;
    }

    return `### Account Registration & Approval Process

1. **Sign Up:** Register with your student email and credentials at [Register Account](/register).
2. **Pending Verification:** Newly registered accounts enter pending verification status.
3. **Admin Approval:** Department administrators inspect and approve student accounts in the [Admin Portal](/dashboard/admin).
4. **Access Unlocked:** Once approved, sign in at [Sign In](/login) to access your [Student Portal](/dashboard/student).`;
  }

  // 6. Notices & Audio Broadcasts
  if (q.includes("notice") || q.includes("audio") || q.includes("নোটিশ") || q.includes("circular") || q.includes("announcement")) {
    if (isBangla) {
      return `### অফিশিয়াল নোটিশ বোর্ড ও অডিও বার্তা

- বিভাগের জরুরি সার্কুলার, পরীক্ষার সময়সূচি ও প্রশাসনিক নোটিশ [Notice Board](/notices)-এ প্রকাশিত হয়।
- **ভয়েস মেমো (Audio Broadcasts):** শিক্ষক ও প্রশাসনের জরুরি নোটিশে অডিও ভয়েস মেমো যুক্ত থাকে, যা সরাসরি নোটিশ কার্ডে প্লে করে শোনা যায়।
- নোটিশে যুক্ত পিডিএফ ও প্রয়োজনীয় ফাইল [Notice Board](/notices) থেকে ডাউনলোড করা যায়।`;
    }

    return `### Official Circulars & Audio Announcements

- Real-time notices, exam timetables, and administrative orders are published on the [Notice Board](/notices).
- **Voice Circulars:** Faculty and admin notices include embedded audio broadcasts that can be played directly on each notice card.
- Download attached circular PDFs and documents directly from the [Notice Board](/notices).`;
  }

  // Default Overview Greeting
  if (isBangla) {
    return `### পাবনা বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (পবিপ্রবি) সিএসই সহকারী

আমি **পাবনা বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (পবিপ্রবি)**-এর **কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং (সিএসই)** বিভাগের অফিসিয়াল এআই সহকারী।

আপনি আমাকে যেকোনো বিষয়ে প্রশ্ন করতে পারেন:
- **স্মার্ট ফেস হাজিরা:** *"ফেস লাইভনেস এবং ১০ মিটার জিওফেন্স হাজিরা কীভাবে কাজ করে?"*
- **ক্লাস রুটিন:** *"সাপ্তাহিক ক্লাসের সময়সূচি ও ল্যাব রুমগুলো কী কী?"*
- **পাঠ্যক্রম ও কোর্স:** *"সেমিস্টার ৬ বা সেমিস্টার ৫-এ কোন কোন কোর্স রয়েছে?"*
- **অভিযোগ ও সহায়তা:** *"গোপন অভিযোগ বা আইটি সাপোর্ট টিকিট কীভাবে জমা দিবো?"*
- **অ্যাকাউন্ট ভেরিফিকেশন:** *"নতুন একাউন্ট কীভাবে অ্যাডমিন অনুমোদন করে?"*
- **নোটিশ বোর্ড:** *"জরুরি নোটিশ এবং অডিও ঘোষণা কোথায় পাবো?"*

আপনি কি বিষয়ে জানতে চান? বাংলায় যেকোনো প্রশ্ন করুন!`;
  }

  return `### PUST CSE Department Assistant

I am the verified assistant for the **Department of Computer Science & Engineering** at **Pabna University of Science and Technology (PUST)**.

Here is what you can ask me:
- **Attendance:** *"How does the AI face liveness and geofence attendance work?"*
- **Routine:** *"What is the weekly class schedule and classroom timings?"*
- **Courses:** *"What courses are taught in Semester 6?"*
- **Support:** *"How can I submit an anonymous grievance or IT ticket?"*
- **Approval:** *"How do I register and get my account approved?"*
- **Notices:** *"Where can I find circulars and audio announcements?"*

How may I assist you today? Feel free to ask any question in English or বাংলা!`;
}

// Generate dynamic contextual follow-up questions and quick action links based on content
function generateInteractionMeta(text, query) {
  const q = (query || "").toLowerCase();
  const t = (text || "").toLowerCase();
  const isBangla = isBengaliText(query);

  let followUps = [];
  let actionLinks = [];

  if (q.includes("attendance") || q.includes("face") || q.includes("liveness") || q.includes("geofence") || t.includes("attendance") || t.includes("geofence") || q.includes("উপস্থিতি")) {
    followUps = isBangla
      ? [
          "১০ মিটার জিওফেন্সের বাইরে থাকলে কি হাজিরা হবে?",
          "লাইভনেস টেস্টে ছবি দিয়ে কি প্রক্সি দেওয়া সম্ভব?",
          "ক্লাসের প্রথম ১০ মিনিটের পর কি হাজিরা দেওয়া যায়?"
        ]
      : [
          "What if I am outside the 10-meter geofence?",
          "How does active liveness detect photo spoofing?",
          "Can I check in after the 10-minute window?"
        ];
    actionLinks = [
      { label: isBangla ? "হাজিরা পোর্টাল" : "Student Attendance Portal", url: "/dashboard/student", external: false },
      { label: isBangla ? "বায়োমেট্রিক ফিচার" : "Biometric Core Features", url: "/#features", external: false }
    ];
  } else if (q.includes("routine") || q.includes("schedule") || q.includes("slot") || t.includes("routine") || q.includes("রুটিন") || q.includes("ক্লাস")) {
    followUps = isBangla
      ? [
          "সফটওয়্যার ল্যাব ১ ও এআই ল্যাব কোথায় অবস্থিত?",
          "বৃহস্পতিবার ও শুক্রবার কি ক্লাস থাকে?",
          "শিক্ষকদের সময়সূচি কিভাবে দেখা যায়?"
        ]
      : [
          "Where are Software Lab 1 and AI Lab located?",
          "What are the Friday and Thursday weekend policies?",
          "How can teachers view their routine?"
        ];
    actionLinks = [
      { label: isBangla ? "ক্লাস রুটিন পোর্টাল" : "Student Timetable", url: "/dashboard/student", external: false },
      { label: isBangla ? "শিক্ষক পোর্টাল" : "Teacher Portal", url: "/dashboard/teacher", external: false }
    ];
  } else if (q.includes("complaint") || q.includes("grievance") || q.includes("ticket") || q.includes("support") || t.includes("complaint") || q.includes("অভিযোগ")) {
    followUps = isBangla
      ? [
          "অ্যানোনিমাস অভিযোগ কি ১০০% গোপন থাকে?",
          "CMP ট্র্যাকিং কোড দিয়ে কিভাবে স্ট্যাটাস চেক করবো?",
          "অভিযোগের সমাধান কে করে থাকে?"
        ]
      : [
          "Is anonymous reporting 100% confidential?",
          "How do I track my reference code (e.g. CMP-XXXX)?",
          "Who reviews and resolves grievances?"
        ];
    actionLinks = [
      { label: isBangla ? "সহায়তা ও অভিযোগ ডেস্ক" : "Support & Grievance Desk", url: "/#support", external: false }
    ];
  } else if (q.includes("course") || q.includes("curriculum") || q.includes("semester") || q.includes("credit") || t.includes("curriculum") || q.includes("কোর্স") || q.includes("সেমিস্টার")) {
    followUps = isBangla
      ? [
          "সেমিস্টার ৭ ও ৮-এ কোন কোন কোর্স রয়েছে?",
          "বি.এসসি. সিএসই প্রোগ্রামে মোট ক্রেডিট কত?",
          "মেশিন লার্নিং কোর্স কোন সেমিস্টারে পড়ানো হয়?"
        ]
      : [
          "What are the core subjects in Semester 7 & 8?",
          "How many total credits for B.Sc. Engg. in CSE?",
          "Which semester is Machine Learning taught in?"
        ];
    actionLinks = [
      { label: isBangla ? "কোর্স উপকরণ ও সিলেবাস" : "Course Materials in Portal", url: "/dashboard/student", external: false },
      { label: isBangla ? "বিভাগীয় ওভারভিউ" : "Platform Overview", url: "/#overview", external: false }
    ];
  } else if (q.includes("register") || q.includes("pending") || q.includes("approval") || q.includes("account") || t.includes("register") || q.includes("ভর্তি")) {
    followUps = isBangla
      ? [
          "অ্যাকাউন্ট অনুমোদন হতে কত সময় লাগে?",
          "গুগল দিয়ে কি রেজিস্ট্রেশন করা যায়?",
          "অ্যাডমিন কিভাবে একাউন্ট ভেরিফাই করে?"
        ]
      : [
          "How long does administrator approval take?",
          "Can I register using my Google account?",
          "How does Admin verify student accounts?"
        ];
    actionLinks = [
      { label: isBangla ? "শিক্ষার্থী রেজিস্ট্রেশন" : "Create Student Account", url: "/register", external: false },
      { label: isBangla ? "পোর্টাল সাইন ইন" : "Sign In to Portal", url: "/login", external: false }
    ];
  } else if (q.includes("notice") || q.includes("audio") || q.includes("broadcast") || t.includes("notice") || q.includes("নোটিশ")) {
    followUps = isBangla
      ? [
          "নোটিশ কার্ডে অডিও ভয়েস মেমো কিভাবে শুনবো?",
          "শিক্ষার্থীরা কি নোটিশ বোর্ডে পোস্ট করতে পারে?",
          "জরুরি নোটিশে কি ফাইল ডাউনলোড করা যায়?"
        ]
      : [
          "How do I play voice memo broadcasts on notices?",
          "Can students post notices on the public board?",
          "How do I download notice attachments?"
        ];
    actionLinks = [
      { label: isBangla ? "নোটিশ বোর্ড" : "Open Notice Board", url: "/notices", external: false }
    ];
  } else {
    followUps = isBangla
      ? [
          "স্মার্ট ফেস হাজিরা কিভাবে কাজ করে?",
          "সেমিস্টার ৬-এ কোন কোন কোর্স পড়ানো হয়?",
          "গোপন অভিযোগ কিভাবে জমা দিবো?",
          "পবিপ্রবি সিএসই ক্লাস রুটিন সময়সূচি"
        ]
      : [
          "How does the AI face attendance work?",
          "What are the Semester 6 course subjects?",
          "How do I submit an anonymous grievance?",
          "PUST CSE Class Routine Timetable"
        ];
    actionLinks = [
      { label: isBangla ? "শিক্ষার্থী পোর্টাল" : "Student Portal", url: "/dashboard/student", external: false },
      { label: isBangla ? "নোটিশ বোর্ড" : "Notice Board", url: "/notices", external: false },
      { label: isBangla ? "সহায়তা ডেস্ক" : "Support Desk", url: "/#support", external: false }
    ];
  }

  return { followUps, actionLinks };
}

export async function POST(req) {
  try {
    const { message, history = [] } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isBangla = isBengaliText(message);

    // If GEMINI_API_KEY is available, call Google Gemini REST API
    if (apiKey && apiKey.trim()) {
      const contents = [];

      // Add previous conversational context
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-6).forEach((item) => {
          if (item.text && item.role) {
            contents.push({
              role: item.role === "assistant" || item.role === "model" ? "model" : "user",
              parts: [{ text: item.text }],
            });
          }
        });
      }

      // Add user prompt with explicit language enforcement
      const finalPrompt = isBangla
        ? `${message}\n\n[INSTRUCTION: The user is asking in Bengali (বাংলা). You MUST answer completely, fluently, and accurately in Bengali (বাংলায় উত্তর দিন). Base all information strictly on the PUST CSE curriculum and features.]`
        : `${message}\n\n[INSTRUCTION: Base all information strictly on the official PUST CSE curriculum, rules, and portals provided in the system instruction.]`;

      contents.push({
        role: "user",
        parts: [{ text: finalPrompt }],
      });

      // Priority list of Gemini models: fast, instant-response models to prevent latency
      const modelsToTry = [
        "gemini-3.6-flash",
        "gemini-3.5-flash"
      ];
      let geminiResponseText = null;

      for (const model of modelsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
              },
              signal: controller.signal,
              body: JSON.stringify({
                system_instruction: {
                  parts: [{ text: SYSTEM_INSTRUCTION }],
                },
                contents,
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 900,
                  topP: 0.85,
                },
              }),
            }
          );
          clearTimeout(timeoutId);

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const candidate = data.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text;
            if (text) {
              geminiResponseText = text;
              break;
            }
          }
        } catch (callErr) {
          // Proceed to next model or fallback
        }
      }

      if (geminiResponseText) {
        const meta = generateInteractionMeta(geminiResponseText, message);
        return NextResponse.json({
          success: true,
          reply: geminiResponseText,
          model: "PUST CSE Verified Desk",
          isGeminiLive: true,
          followUps: meta.followUps,
          actionLinks: meta.actionLinks,
        });
      }
    }

    // Fallback to intelligent built-in knowledge engine (Strictly bilingual)
    const reply = getFallbackResponse(message);
    const meta = generateInteractionMeta(reply, message);

    return NextResponse.json({
      success: true,
      reply,
      model: "PUST CSE Verified Desk",
      isGeminiLive: false,
      hasGeminiKey: Boolean(apiKey && apiKey.trim()),
      followUps: meta.followUps,
      actionLinks: meta.actionLinks,
    });
  } catch (error) {
    console.error("[POST /api/ai-chat] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate response. Please try again.",
      },
      { status: 500 }
    );
  }
}
