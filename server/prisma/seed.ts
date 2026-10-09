// ---------------------------------------------------------------------------
// ConnectED — full demo dataset
//
// Every record the dashboard, academic pages and live-fleet map read is
// created here so a fresh database immediately looks like a working school
// CRM. The school is set in Taungoo, Bago Region (East), Myanmar, and all
// buses / routes / stops report positions around Taungoo.
//
// Run: pnpm db:reset --force   (wipes + reseeds)
//      pnpm db:seed            (adds on top of an existing database)
// ---------------------------------------------------------------------------

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const hash = (plain: string) => bcrypt.hashSync(plain, 10);

/** One password per role keeps the demo logins memorable. */
const PASSWORDS = {
  superAdmin: hash("SuperAdmin@123"),
  admin: hash("Admin@123"),
  teacher: hash("Teacher@123"),
  student: hash("Student@123"),
  parent: hash("Parent@123"),
  driver: hash("Driver@123"),
};

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;

const now = new Date();

/** Midnight on the Monday of the current week. */
const startOfWeek = (date: Date): Date => {
  const copy = new Date(date);
  const daysSinceMonday = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - daysSinceMonday);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const weekStart = startOfWeek(now);

/** A date inside the current school week (0 = Monday). */
const dayAt = (dayIndex: number, hour: number, minute = 0): Date => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayIndex);
  date.setHours(hour, minute, 0, 0);
  return date;
};

/** A date relative to today. */
const at = (daysFromNow: number, hour = 9, minute = 0): Date => {
  const date = new Date(now);
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const minutesAgo = (minutes: number): Date => new Date(now.getTime() - minutes * 60 * 1000);

/** A Taungoo address in Myanmar script. */
const address = (no: string, street: string, ward: string) =>
  `အမှတ် (${no})၊ ${street}၊ ${ward} ရပ်ကွက်၊ တောင်ငူမြို့၊ ပဲခူးတိုင်းဒေသကြီး (အရှေ့)`;

// Taungoo, Bago Region (East) — the school and the whole fleet live here.
const TAUNGOO = { lat: 18.9398, lng: 96.431 };

const dayNames = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

const periodStart = [
  [7, 0],
  [8, 0],
  [9, 0],
  [10, 0],
  [11, 0],
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  // --------------------------------------------------------------- rooms
  const roomDefs = [
    { name: "Mathematics Room", capacity: 40 },
    { name: "Physics Lab", capacity: 32 },
    { name: "Chemistry Lab", capacity: 32 },
    { name: "Biology Lab", capacity: 30 },
    { name: "Science Lab", capacity: 32 },
    { name: "English Room", capacity: 45 },
    { name: "Computer Lab", capacity: 30 },
    { name: "Myanmar Language Room", capacity: 40 },
    { name: "Multi-purpose Hall", capacity: 80 },
  ];

  const rooms: Record<string, any> = {};
  for (const def of roomDefs) {
    rooms[def.name] = await prisma.room.create({ data: def });
  }

  // ------------------------------------------------------------ subjects
  const subjectDefs = [
    { name: "Mathematics", description: "သင်္ချာ — Numbers, algebra, geometry and calculus." },
    { name: "Physics", description: "ရူပဗေဒ — Motion, energy, waves and electricity." },
    { name: "Chemistry", description: "ဓာတုဗေဒ — Matter, reactions and the periodic table." },
    { name: "Biology", description: "ဇီဝဗေဒ — Living organisms and ecosystems." },
    { name: "English", description: "အင်္ဂလိပ်စာ — Reading, writing and communication." },
    { name: "Myanmar", description: "မြန်မာစာ — Myanmar language and literature." },
    { name: "History", description: "သမိုင်း — Myanmar and world history." },
    { name: "Computer Science", description: "ကွန်ပျူတာ — Programming and digital literacy." },
  ];

  const subjects: Record<string, any> = {};
  for (const def of subjectDefs) {
    subjects[def.name] = await prisma.subject.create({
      data: { ...def, status: "active", imgUrl: "" },
    });
  }

  // -------------------------------------------------------------- admins
  const superAdmin = await prisma.admin.create({
    data: {
      fullName: "ဦးကြည်သာ",
      username: "superadmin",
      password: PASSWORDS.superAdmin,
      role: "super-admin",
      email: "kyithar@taungooedu.edu.mm",
      phoneNumber: "+959450100001",
      isActive: true,
      isBanned: false,
      gender: "male",
      address: address("12", "ကန်တော်ကြီးလမ်း", "ရွှေစံတော်"),
      profilePhoto: avatar("superadmin"),
      bio: "ConnectED founder. Oversees Taungoo Education Complex.",
      birthday: new Date("1978-05-14"),
      status: "active",
    },
  });

  const admin = await prisma.admin.create({
    data: {
      fullName: "ဒေါ်ခင်အေးမူ",
      username: "admin",
      password: PASSWORDS.admin,
      role: "admin",
      email: "khinayemu@taungooedu.edu.mm",
      phoneNumber: "+959450100002",
      isActive: true,
      isBanned: false,
      gender: "female",
      address: address("45", "ဗိုလ်ချုပ်လမ်း", "မြို့မ"),
      profilePhoto: avatar("admin"),
      bio: "Head of administration, student affairs and transport.",
      birthday: new Date("1983-11-20"),
      status: "active",
    },
  });

  const admin2 = await prisma.admin.create({
    data: {
      fullName: "ဦးဇော်မျိုးထွန်း",
      username: "admin2",
      password: PASSWORDS.admin,
      role: "admin",
      email: "zawmyohtun@taungooedu.edu.mm",
      phoneNumber: "+959450100003",
      isActive: true,
      isBanned: false,
      gender: "male",
      address: address("8", "အောင်မင်္ဂလာလမ်း", "ဇေယျာသီရိ"),
      profilePhoto: avatar("admin2"),
      bio: "Academic dean and examinations controller.",
      birthday: new Date("1985-02-03"),
      status: "active",
    },
  });

  // ------------------------------------------------------------ teachers
  const teacherDefs = [
    {
      fullName: "ဦးအောင်သူရ",
      username: "teacher",
      gender: "male",
      email: "aungthura@taungooedu.edu.mm",
      phoneNumber: "+959450200010",
      birthday: "1988-03-12",
      bio: "Senior Mathematics & Physics educator.",
      subjects: ["Mathematics", "Physics"],
    },
    {
      fullName: "ဒေါ်သန္တာစိုး",
      username: "teacher1",
      gender: "female",
      email: "thandarsoe@taungooedu.edu.mm",
      phoneNumber: "+959450200011",
      birthday: "1991-08-25",
      bio: "English Language & Literature instructor.",
      subjects: ["English"],
    },
    {
      fullName: "ဒေါ်နွယ်နီအောင်",
      username: "teacher2",
      gender: "female",
      email: "nwayniaung@taungooedu.edu.mm",
      phoneNumber: "+959450200012",
      birthday: "1990-01-18",
      bio: "Mathematics teacher and class mentor.",
      subjects: ["Mathematics"],
    },
    {
      fullName: "ဦးမျိုးမင်းထက်",
      username: "teacher3",
      gender: "male",
      email: "myominhtet@taungooedu.edu.mm",
      phoneNumber: "+959450200013",
      birthday: "1987-06-30",
      bio: "English and History teacher.",
      subjects: ["English", "History"],
    },
    {
      fullName: "ဒေါ်ခင်စန္ဒာ",
      username: "teacher4",
      gender: "female",
      email: "khinsanda@taungooedu.edu.mm",
      phoneNumber: "+959450200014",
      birthday: "1993-04-07",
      bio: "Chemistry and Biology teacher, science lab lead.",
      subjects: ["Chemistry", "Biology"],
    },
    {
      fullName: "ဦးရဲဝင်းထွန်း",
      username: "teacher5",
      gender: "male",
      email: "yewinhtun@taungooedu.edu.mm",
      phoneNumber: "+959450200015",
      birthday: "1989-09-11",
      bio: "Computer Science and Physics teacher.",
      subjects: ["Computer Science", "Physics"],
    },
  ];

  const teachers: Record<string, any> = {};
  for (const def of teacherDefs) {
    const created = await prisma.teacher.create({
      data: {
        fullName: def.fullName,
        username: def.username,
        password: PASSWORDS.teacher,
        role: "teacher",
        email: def.email,
        phoneNumber: def.phoneNumber,
        isActive: true,
        isBanned: false,
        gender: def.gender,
        address: address(
          String(20 + Object.keys(teachers).length),
          "ကျောင်းလမ်း",
          "အောင်မင်္ဂလာ"
        ),
        profilePhoto: avatar(def.username),
        bio: def.bio,
        birthday: new Date(def.birthday),
        status: "active",
        subjectIds: def.subjects.map((name) => subjects[name].id),
      },
    });
    teachers[def.username] = { ...created, subjects: def.subjects };
  }

  // Subject -> teacher lookup used when building the timetable.
  const subjectTeacher: Record<string, any> = {};
  for (const key of Object.keys(teachers)) {
    for (const subjectName of teachers[key].subjects as string[]) {
      subjectTeacher[subjectName] ??= teachers[key];
    }
  }

  // ------------------------------------------------------------- classes
  const classDefs = [
    { name: "6 A", grade: "6 A", room: "Mathematics Room", teacher: "teacher2", capacity: 35 },
    { name: "7 A", grade: "7 A", room: "English Room", teacher: "teacher3", capacity: 38 },
    { name: "8 A", grade: "8 A", room: "Science Lab", teacher: "teacher4", capacity: 30 },
    { name: "8 B", grade: "8 B", room: "Biology Lab", teacher: "teacher4", capacity: 30 },
    { name: "9 A", grade: "9 A", room: "Physics Lab", teacher: "teacher", capacity: 32 },
    { name: "9 B", grade: "9 B", room: "Chemistry Lab", teacher: "teacher5", capacity: 32 },
    { name: "10 A", grade: "10 A", room: "Computer Lab", teacher: "teacher5", capacity: 28 },
    { name: "10 B", grade: "10 B", room: "Myanmar Language Room", teacher: "teacher1", capacity: 40 },
    { name: "11 A", grade: "11 A", room: "Multi-purpose Hall", teacher: "teacher", capacity: 45 },
    { name: "12 A", grade: "12 A", room: "Multi-purpose Hall", teacher: "teacher3", capacity: 45 },
  ];

  const classes: Record<string, any> = {};
  for (const def of classDefs) {
    const created = await prisma.class.create({
      data: {
        name: def.name,
        grade: def.grade,
        capacity: def.capacity,
        status: "active",
        teacherId: teachers[def.teacher].id,
        roomId: rooms[def.room].id,
      },
    });
    classes[def.name] = { ...created, teacherUsername: def.teacher };
  }

  // Now that classes exist, fill in each teacher's class links.
  for (const key of Object.keys(teachers)) {
    const assigned = classDefs
      .filter((def) => def.teacher === key)
      .map((def) => classes[def.name].id);

    if (assigned.length) {
      await prisma.teacher.update({
        where: { id: teachers[key].id },
        data: {
          assignedClassIds: assigned,
          primaryClassId: assigned[0],
        },
      });
    }
  }

  // ------------------------------------------------------------ students
  const studentDefs = [
    { fullName: "ကျော်ကျော်", username: "student", gender: "male", class: "10 A", birthday: "2009-06-15", bio: "Grade 10 student, science club member." },
    { fullName: "စုစုလွင်", username: "student1", gender: "female", class: "9 B", birthday: "2011-09-04", bio: "Grade 9 student, art and literature." },
    { fullName: "မောင်မောင်အေး", username: "student2", gender: "male", class: "10 A", birthday: "2009-02-27", bio: "Grade 10 student, football team." },
    { fullName: "နန္ဒာဝင်း", username: "student3", gender: "female", class: "9 B", birthday: "2010-12-12", bio: "Grade 9 student, debate club." },
    { fullName: "ဇင်မျိုးထွန်း", username: "student4", gender: "male", class: "8 A", birthday: "2012-03-19", bio: "Grade 8 student, robotics club." },
    { fullName: "ခင်လှိုင်", username: "student5", gender: "female", class: "8 B", birthday: "2012-07-08", bio: "Grade 8 student, school choir." },
    { fullName: "စည်သူရ", username: "student6", gender: "male", class: "7 A", birthday: "2013-01-22", bio: "Grade 7 student, chess club." },
    { fullName: "ဝေဝေအောင်", username: "student7", gender: "female", class: "6 A", birthday: "2014-05-30", bio: "Grade 6 student, junior librarian." },
    { fullName: "ဟိန်းထက်အောင်", username: "student8", gender: "male", class: "11 A", birthday: "2007-11-16", bio: "Grade 11 student, science stream." },
    { fullName: "သီတာလွင်", username: "student9", gender: "female", class: "11 A", birthday: "2008-04-02", bio: "Grade 11 student, Red Cross volunteer." },
    { fullName: "အောင်ကျော်မင်း", username: "student10", gender: "male", class: "12 A", birthday: "2006-08-21", bio: "Grade 12 student, university hopeful." },
    { fullName: "ယမင်းခိုင်", username: "student11", gender: "female", class: "12 A", birthday: "2006-10-09", bio: "Grade 12 student, head prefect." },
  ];

  const students: Record<string, any> = {};
  let studentPhone = 1;
  for (const def of studentDefs) {
    const created = await prisma.student.create({
      data: {
        fullName: def.fullName,
        username: def.username,
        password: PASSWORDS.student,
        role: "student",
        email: `${def.username}@student.taungooedu.edu.mm`,
        phoneNumber: `+95977000${String(100 + studentPhone++).slice(-3)}`,
        isActive: true,
        isBanned: false,
        gender: def.gender,
        address: address(
          String(10 + studentPhone),
          "ကျောင်းသားလမ်း",
          "ဇေယျာသီရိ"
        ),
        profilePhoto: avatar(def.username),
        bio: def.bio,
        birthday: new Date(def.birthday),
        status: "enrolled",
        classId: classes[def.class].id,
      },
    });
    students[def.username] = created;
  }

  // ------------------------------------------------------------- parents
  const parentDefs = [
    { fullName: "ဦးဇော်ဝင်း", username: "parent", gender: "male", children: ["student", "student1"], birthday: "1976-02-18" },
    { fullName: "ဒေါ်အေးအေးမြင့်", username: "parent1", gender: "female", children: ["student2", "student3"], birthday: "1979-07-25" },
    { fullName: "ဦးမြင့်လွင်", username: "parent2", gender: "male", children: ["student4", "student5"], birthday: "1974-10-03" },
    { fullName: "ဒေါ်စန်းစန်းယု", username: "parent3", gender: "female", children: ["student6", "student7"], birthday: "1981-12-29" },
    { fullName: "ဦးထွန်းလှ", username: "parent4", gender: "male", children: ["student8", "student9"], birthday: "1972-05-15" },
    { fullName: "ဒေါ်ရီရီထွေး", username: "parent5", gender: "female", children: ["student10", "student11"], birthday: "1977-09-09" },
  ];

  const parents: Record<string, any> = {};
  for (const def of parentDefs) {
    parents[def.username] = await prisma.parent.create({
      data: {
        fullName: def.fullName,
        username: def.username,
        password: PASSWORDS.parent,
        role: "parent",
        email: `${def.username}@gmail.com`,
        phoneNumber: `+95978000${String(100 + Object.keys(parents).length).slice(-3)}`,
        isActive: true,
        isBanned: false,
        gender: def.gender,
        address: address(
          String(5 + Object.keys(parents).length),
          "ကျောင်းလမ်း",
          "မင်္ဂလာ"
        ),
        profilePhoto: avatar(def.username),
        bio: "Parent of Taungoo Education Complex students.",
        birthday: new Date(def.birthday),
        status: "active",
      },
    });
  }

  // Link parents <-> students (both directions).
  for (const def of parentDefs) {
    const parent = parents[def.username];
    const childIds = def.children.map((username) => students[username].id);

    await prisma.parent.update({
      where: { id: parent.id },
      data: { children: { connect: childIds.map((id) => ({ id })) } },
    });

    for (const id of childIds) {
      await prisma.student.update({
        where: { id },
        data: { parentId: parent.id },
      });
    }
  }

  // ------------------------------------------------------------- lessons
  const subjectNames = subjectDefs.map((s) => s.name);
  const classNames = classDefs.map((c) => c.name);

  for (const [classIndex, className] of classNames.entries()) {
    const cls = classes[className];

    for (let d = 0; d < dayNames.length; d++) {
      for (let p = 0; p < 3; p++) {
        const subjectName =
          subjectNames[(classIndex * 3 + d * 3 + p) % subjectNames.length];
        const teacher = subjectTeacher[subjectName] ?? teachers[cls.teacherUsername];
        const [h, m] = periodStart[p];

        await prisma.lesson.create({
          data: {
            name: `${subjectName} — ${className}`,
            day: dayNames[d],
            startTime: dayAt(d, h, m),
            endTime: dayAt(d, h, m + 50),
            status: "scheduled",
            subjectId: subjects[subjectName].id,
            classId: cls.id,
            teacherId: teacher.id,
            roomId: cls.roomId,
          },
        });
      }
    }
  }

  // ------------------------------------------------- exams & assignments
  const classExams: Record<string, any[]> = {};
  const classAssignments: Record<string, any[]> = {};

  for (const className of classNames) {
    const cls = classes[className];
    const lessons = await prisma.lesson.findMany({
      where: { classId: cls.id },
      orderBy: { startTime: "asc" },
      take: 4,
    });

    const exams: any[] = [];
    const assignments: any[] = [];

    for (let i = 0; i < 2; i++) {
      const lesson = lessons[i];
      if (!lesson) break;

      exams.push(
        await prisma.exam.create({
          data: {
            name: `${lesson.name} — ${i === 0 ? "Midterm" : "Final"} Exam`,
            startTime: at(i === 0 ? -7 : 7, 9),
            endTime: at(i === 0 ? -7 : 7, 11),
            lessonId: lesson.id,
          },
        })
      );

      assignments.push(
        await prisma.assignment.create({
          data: {
            name: `${lesson.name} — ${i === 0 ? "Homework 1" : "Homework 2"}`,
            startDate: at(i === 0 ? -3 : -1, 8),
            dueDate: at(i === 0 ? 4 : 5, 23),
            lessonId: lesson.id,
          },
        })
      );
    }

    classExams[className] = exams;
    classAssignments[className] = assignments;
  }

  // -------------------------------------------------------------- results
  const scoreFor = (seed: number) => 45 + ((seed * 17) % 51); // 45..95

  let scoreSeed = 1;
  for (const def of studentDefs) {
    const cls = classes[def.class];
    const student = students[def.username];

    for (const exam of classExams[def.class] ?? []) {
      await prisma.result.create({
        data: {
          score: scoreFor(scoreSeed++),
          description: "Exam result",
          studentId: student.id,
          examId: exam.id,
          classId: cls.id,
        },
      });
    }

    for (const assignment of classAssignments[def.class] ?? []) {
      await prisma.result.create({
        data: {
          score: scoreFor(scoreSeed++),
          description: "Assignment result",
          studentId: student.id,
          assignmentId: assignment.id,
          classId: cls.id,
        },
      });
    }
  }

  // ---------------------------------------------------------- attendances
  for (const def of studentDefs) {
    const cls = classes[def.class];
    const student = students[def.username];
    const lesson = await prisma.lesson.findFirst({
      where: { classId: cls.id },
      orderBy: { startTime: "asc" },
    });

    // The last five school days, today included, so the dashboard has data.
    for (let d = 0; d < 5; d++) {
      const absent = (scoreSeed + d) % 11 === 0;
      const late = !absent && (scoreSeed + d) % 5 === 0;

      await prisma.attendance.create({
        data: {
          date: d === 0 ? new Date(now) : at(-d, 8, 30),
          present: !absent,
          late,
          minutesLate: late ? 5 + ((scoreSeed + d) % 3) * 5 : 0,
          studentId: student.id,
          classId: cls.id,
          lessonId: lesson?.id ?? null,
        },
      });
    }
  }

  // ------------------------------------------------ announcements & events
  // `status` values match the client's announcement_status_options.
  // `class: null` posts to the whole school (shown as "General").
  const announcementDefs = [
    { name: "လွတ်လပ်ရေးနေ့ အထိမ်းအမှတ် အခမ်းအနား", description: "Independence Day ceremony rehearsal this Friday at the multi-purpose hall.", class: "11 A", days: 2, status: "approved", author: "admin" },
    { name: "အလယ်တန်း စာမေးပွဲ အစီအစဉ်", description: "Midterm examination timetable is now published. Check the notice board.", class: "9 A", days: 1, status: "approved", author: "admin2" },
    { name: "ကျောင်းသား မိဘဆရာ တွေ့ဆုံပွဲ", description: "Parent–teacher meeting on Saturday morning, 9:00 AM in the main hall.", class: "10 A", days: 3, status: "approved", author: "teacher" },
    { name: "အားကစားပြိုင်ပွဲ စာရင်းပေးသွင်းရန်", description: "Register for the inter-house sports meet before the end of the week.", class: "8 A", days: 5, status: "pending", author: "teacher3" },
    { name: "စာကြည့်တိုက် စာအုပ်အသစ်များ", description: "New reference books for science and mathematics have arrived in the library.", class: "7 A", days: 4, status: "approved", author: "teacher1" },
    { name: "ကွန်ပျူတာ သင်တန်း အချိန်ဇယား", description: "After-school computer class schedule has been updated for this term.", class: "10 B", days: 6, status: "approved", author: "teacher5" },
    { name: "သွေးလှူဒါန်းပွဲ", description: "Red Cross blood donation drive next month — parents and staff welcome.", class: "12 A", days: 8, status: "pending", author: "admin" },
    { name: "ရေကြီးရေလျှံ သတိပေးချက်", description: "Heavy rain is expected this week — please follow the bus delay notices.", class: "6 A", days: 1, status: "approved", author: "admin2" },
    { name: "ကျောင်းလခပေးသွင်းရန် အသိပေးခြင်း", description: "School fees for the second term are due by the 30th of this month.", class: null, days: 2, status: "approved", author: "admin" },
    { name: "Uniform Inspection Week", description: "Daily uniform inspections run all week; full uniform is required.", class: "8 B", days: 3, status: "pending", author: "teacher4" },
    { name: "Science Fair Projects Due", description: "Grade 9 science fair projects and display boards are due next Friday.", class: "9 B", days: 7, status: "approved", author: "teacher4" },
    { name: "Grade 12 University Application Workshop", description: "Guidance on university applications and scholarships for final-year students.", class: "12 A", days: 9, status: "approved", author: "admin2" },
    { name: "မီးလောင်မှု လေ့ကျင့်ခန်း (Fire Drill)", description: "A whole-school fire drill will be held this Thursday. Follow teacher instructions.", class: null, days: 1, status: "approved", author: "admin" },
    { name: "Football Team Selection", description: "Final selection for the school football team has concluded.", class: "10 A", days: -3, status: "finished", author: "teacher" },
    { name: "Mid-Term Break", description: "School will be closed for the mid-term break. Classes resume the following Monday.", class: null, days: 10, status: "approved", author: "admin" },
    { name: "မြန်မာ့ဆွမ်းလောင်းပွဲ ရုံးပိတ်ရက်", description: "Myanmar traditional festival holiday — school closed.", class: null, days: 20, status: "approved", author: "admin2" },
    { name: "Essay Competition Results", description: "Congratulations to the winners of the Myanmar-language essay competition.", class: "11 A", days: -1, status: "approved", author: "teacher1" },
    { name: "Teacher Training Workshop", description: "Professional development workshop for all teaching staff on Saturday afternoon.", class: null, days: 4, status: "pending", author: "admin" },
    { name: "Cafeteria Menu Update", description: "The cafeteria menu has been revised to include healthier options.", class: null, days: 2, status: "approved", author: "admin2" },
    { name: "Bus Route 3 Delay Notice", description: "Route 3 may run 10–15 minutes late due to road works on Oktwin Road.", class: "7 A", days: 0, status: "approved", author: "admin" },
    { name: "Scholarship Applications Open", description: "Applications for the Taungoo Education Complex scholarship are now open.", class: "12 A", days: 12, status: "pending", author: "admin" },
    { name: "အနိုင်ကျင့်မှု ကာကွယ်ရေး ဟောပြောပွဲ", description: "Anti-bullying awareness talk for junior classes in the assembly hall.", class: "8 A", days: 3, status: "approved", author: "teacher2" },
    { name: "Field Trip Permission Slips", description: "Signed permission slips for the Shwe San Daw field trip are due tomorrow.", class: "7 A", days: 2, status: "pending", author: "teacher3" },
    { name: "Exam Results Discrepancy", description: "This posting was withdrawn pending a recheck of the Grade 9 results.", class: "9 B", days: -2, status: "rejected", author: "teacher5" },
    { name: "ရေရှားပါးမှု အသိပေးချက်", description: "Water rationing notice — classroom taps are closed during the afternoon.", class: "6 A", days: -5, status: "finished", author: "admin2" },
  ];

  for (const def of announcementDefs) {
    const createdByModel = def.author.startsWith("teacher") ? "teacher" : "admin";
    const authorId = createdByModel === "teacher" ? teachers[def.author].id : def.author === "admin" ? admin.id : admin2.id;

    await prisma.announcement.create({
      data: {
        name: def.name,
        description: def.description,
        date: at(def.days, 8),
        status: def.status,
        createdByModel,
        createdById: authorId,
        classId: def.class ? classes[def.class].id : null,
      },
    });
  }

  const eventDefs = [
    { name: "Annual Sports Meet", description: "Inter-house athletics at the Taungoo stadium.", class: "11 A", start: -5, end: -4, status: "finished", author: "admin" },
    { name: "Science Exhibition", description: "Student science and robotics projects on display.", class: "9 A", start: 6, end: 6, status: "approved", author: "teacher4" },
    { name: "Myanmar Cultural Day", description: "Traditional dance, music and food fair.", class: "8 B", start: 12, end: 12, status: "approved", author: "teacher1" },
    { name: "University Orientation Talk", description: "Guidance session for Grade 12 students.", class: "12 A", start: 9, end: 9, status: "approved", author: "admin2" },
    { name: "Field Trip — Shwe San Daw", description: "History field trip to the Shwe San Daw Pagoda.", class: "7 A", start: 15, end: 15, status: "pending", author: "teacher3" },
    { name: "Parent–Teacher Conference", description: "Termly conference in the multi-purpose hall.", class: "10 A", start: 3, end: 3, status: "pending", author: "admin" },
  ];

  for (const def of eventDefs) {
    const createdByModel = def.author.startsWith("teacher") ? "teacher" : "admin";
    const authorId = createdByModel === "teacher" ? teachers[def.author].id : def.author === "admin" ? admin.id : admin2.id;

    await prisma.event.create({
      data: {
        name: def.name,
        description: def.description,
        startDate: at(def.start, 8),
        endDate: at(def.end, 16),
        status: def.status,
        createdByModel,
        createdById: authorId,
        classId: classes[def.class].id,
      },
    });
  }

  // ==========================================================================
  // Transportation — Taungoo, Bago Region (East)
  // ==========================================================================

  const routeDefs = [
    {
      name: "Taungoo Downtown Circular",
      description: "မြို့လယ် လမ်းကြောင်း — railway station, market and hospital loop.",
      startLocation: "တောင်ငူ မီးရထားဘူတာ",
      endLocation: "တောင်ငူ ပြည်သူ့ဆေးရုံကြီး",
      estimatedDuration: 35,
      stops: [
        { name: "တောင်ငူ မီးရထားဘူတာ", latitude: 18.9407, longitude: 96.4266, estimatedArrival: 0 },
        { name: "မြို့မ ဈေး", latitude: 18.9415, longitude: 96.4308, estimatedArrival: 6 },
        { name: "ကန်တော်ကြီး", latitude: 18.938, longitude: 96.429, estimatedArrival: 12 },
        { name: "ရွှေစံတော် ဘုရား", latitude: 18.935, longitude: 96.4338, estimatedArrival: 18 },
        { name: "တောင်ငူ ပြည်သူ့ဆေးရုံကြီး", latitude: 18.947, longitude: 96.4335, estimatedArrival: 28 },
      ],
    },
    {
      name: "Taungoo University Line",
      description: "တက္ကသိုလ် လမ်းကြောင်း — market to university via the degree college.",
      startLocation: "မြို့မ ဈေး",
      endLocation: "တောင်ငူ တက္ကသိုလ်",
      estimatedDuration: 40,
      stops: [
        { name: "မြို့မ ဈေး", latitude: 18.9415, longitude: 96.4308, estimatedArrival: 0 },
        { name: "မင်္ဂလာ ဈေး", latitude: 18.9375, longitude: 96.4355, estimatedArrival: 8 },
        { name: "တောင်ငူ ဒီဂရီကောလိပ်", latitude: 18.943, longitude: 96.437, estimatedArrival: 18 },
        { name: "ကျောက်ကြီး ရပ်ကွက်", latitude: 18.952, longitude: 96.442, estimatedArrival: 28 },
        { name: "တောင်ငူ တက္ကသိုလ်", latitude: 18.998, longitude: 96.446, estimatedArrival: 40 },
      ],
    },
    {
      name: "Oktwin Road Line",
      description: "အုတ်တွင်း လမ်းကြောင်း — city to the southern villages.",
      startLocation: "မြို့မ ဈေး",
      endLocation: "ထန်းတပင်",
      estimatedDuration: 55,
      stops: [
        { name: "မြို့မ ဈေး", latitude: 18.9415, longitude: 96.4308, estimatedArrival: 0 },
        { name: "တောင်ငူ ပြည်သူ့ဆေးရုံကြီး", latitude: 18.947, longitude: 96.4335, estimatedArrival: 8 },
        { name: "အုတ်တွင်း", latitude: 18.856, longitude: 96.435, estimatedArrival: 35 },
        { name: "ထန်းတပင်", latitude: 18.806, longitude: 96.39, estimatedArrival: 55 },
      ],
    },
    {
      name: "Yedashe Road Line",
      description: "ရေတာရှည် လမ်းကောင်း — eastern commuter route.",
      startLocation: "တောင်ငူ မီးရထားဘူတာ",
      endLocation: "ရေတာရှည်",
      estimatedDuration: 50,
      stops: [
        { name: "တောင်ငူ မီးရထားဘူတာ", latitude: 18.9407, longitude: 96.4266, estimatedArrival: 0 },
        { name: "ကျောက်ကြီး ရပ်ကွက်", latitude: 18.952, longitude: 96.442, estimatedArrival: 10 },
        { name: "ရေတာရှည်", latitude: 19.0333, longitude: 96.5333, estimatedArrival: 50 },
      ],
    },
  ];

  const routes: any[] = [];
  for (const def of routeDefs) {
    const route = await prisma.route.create({
      data: {
        name: def.name,
        description: def.description,
        startLocation: def.startLocation,
        endLocation: def.endLocation,
        estimatedDuration: def.estimatedDuration,
        isActive: true,
      },
    });

    const stops: any[] = [];
    for (const [index, stop] of def.stops.entries()) {
      stops.push(
        await prisma.routeStop.create({
          data: {
            routeId: route.id,
            name: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
            sequence: index,
            estimatedArrival: stop.estimatedArrival,
            isActive: true,
          },
        })
      );
    }

    routes.push({ ...route, stops });
  }

  const busDefs = [
    { busNumber: "TTU-001", registrationNumber: "BGO 2E-1234", name: "Taungoo Star", capacity: 40, routeIndex: 0, status: "RUNNING", lat: 18.9405, lng: 96.4298, speed: 34, heading: 85, ago: 0.1 },
    { busNumber: "TTU-002", registrationNumber: "BGO 2E-5678", name: "Shwe San Daw Express", capacity: 36, routeIndex: 1, status: "RUNNING", lat: 18.9428, lng: 96.4365, speed: 28, heading: 40, ago: 0.2 },
    { busNumber: "TTU-003", registrationNumber: "BGO 2E-9012", name: "Kan Taw Gyi Rider", capacity: 42, routeIndex: 2, status: "STOPPED", lat: 18.9468, lng: 96.4336, speed: 0, heading: 180, ago: 6 },
    { busNumber: "TTU-004", registrationNumber: "BGO 2E-3456", name: "Yedashe Cruiser", capacity: 38, routeIndex: 3, status: "IDLE", lat: 18.9407, lng: 96.4266, speed: 0, heading: 0, ago: 45 },
  ];

  const buses: any[] = [];
  for (const def of busDefs) {
    buses.push(
      await prisma.bus.create({
        data: {
          busNumber: def.busNumber,
          registrationNumber: def.registrationNumber,
          name: def.name,
          capacity: def.capacity,
          routeId: routes[def.routeIndex].id,
          status: def.status,
          isActive: true,
          currentLatitude: def.lat,
          currentLongitude: def.lng,
          currentSpeed: def.speed,
          heading: def.heading,
          lastLocationAt: minutesAgo(def.ago),
        },
      })
    );
  }

  // -------------------------------------------------------------- drivers
  const driverDefs = [
    { fullName: "ဦးမြင့်ဦး", username: "driver", gender: "male", busIndex: 0, phone: "+959420009988", birthday: "1972-04-10", bio: "Downtown circular route driver." },
    { fullName: "ဦးသိန်းဇော်", username: "driver1", gender: "male", busIndex: 1, phone: "+959420009989", birthday: "1975-08-19", bio: "University line driver." },
    { fullName: "ဦးမောင်မောင်", username: "driver2", gender: "male", busIndex: 2, phone: "+959420009990", birthday: "1980-12-01", bio: "Oktwin road route driver." },
    { fullName: "ဦးစိုးဝင်း", username: "driver3", gender: "male", busIndex: 3, phone: "+959420009991", birthday: "1978-11-23", bio: "Yedashe cruiser route driver." },
  ];

  const drivers: any[] = [];
  for (const def of driverDefs) {
    const driver = await prisma.driver.create({
      data: {
        fullName: def.fullName,
        username: def.username,
        password: PASSWORDS.driver,
        role: "driver",
        email: `${def.username}@taungooedu.edu.mm`,
        phoneNumber: def.phone,
        isActive: true,
        isBanned: false,
        gender: def.gender,
        address: address(
          String(30 + def.busIndex),
          "ဘူတာလမ်း",
          "ရွှေစံတော်"
        ),
        profilePhoto: avatar(def.username),
        bio: def.bio,
        birthday: new Date(def.birthday),
        status: "active",
        busId: buses[def.busIndex].id,
      },
    });

    // Link the bus back to its driver.
    await prisma.bus.update({
      where: { id: buses[def.busIndex].id },
      data: { driverId: driver.id },
    });

    drivers.push(driver);
  }

  // ------------------------------------------- student bus assignments
  const classToBusIndex: Record<string, number> = {
    "10 A": 0,
    "9 B": 0,
    "8 A": 1,
    "8 B": 1,
    "7 A": 2,
    "6 A": 2,
    "11 A": 3,
    "12 A": 3,
    "9 A": 1,
    "10 B": 0,
  };

  for (const def of studentDefs) {
    const busIndex = classToBusIndex[def.class] ?? 0;
    const bus = buses[busIndex];
    const route = routes[busIndex];
    const pickupStop = route.stops[1] ?? route.stops[0];
    const dropoffStop = route.stops[route.stops.length - 1];

    await prisma.busStudentAssignment.create({
      data: {
        studentId: students[def.username].id,
        busId: bus.id,
        routeId: route.id,
        pickupStopId: pickupStop.id,
        dropoffStopId: dropoffStop.id,
        isActive: true,
      },
    });
  }

  // ------------------------------------------------------ location trails
  for (const [index, bus] of buses.entries()) {
    const route = routes[index];
    const baseLat = bus.currentLatitude || TAUNGOO.lat;
    const baseLng = bus.currentLongitude || TAUNGOO.lng;

    for (let i = 0; i < 8; i++) {
      await prisma.busLocation.create({
        data: {
          busId: bus.id,
          latitude: baseLat + (i - 4) * 0.0007,
          longitude: baseLng + (i - 4) * 0.0009,
          speed: i === 7 ? bus.currentSpeed : 20 + ((i * 7) % 25),
          heading: (index * 90 + i * 12) % 360,
          accuracy: 5 + (i % 4),
          recordedAt: minutesAgo((7 - i) * 2),
        },
      });
    }
  }

  // --------------------------------------------------------------- trips
  const trips: any[] = [];
  for (const [index, bus] of buses.slice(0, 3).entries()) {
    const driver = drivers[index];
    const route = routes[index];

    const morning = await prisma.trip.create({
      data: {
        busId: bus.id,
        driverId: driver.id,
        routeId: route.id,
        tripType: "MORNING",
        status: "COMPLETED",
        scheduledStartAt: at(0, 6, 30),
        actualStartAt: at(0, 6, 32),
        scheduledEndAt: at(0, 7, 30),
        actualEndAt: at(0, 7, 28),
        startedBy: driver.id,
        completedBy: driver.id,
        notes: "Morning pickup completed.",
      },
    });
    trips.push(morning);

    const afternoon = await prisma.trip.create({
      data: {
        busId: bus.id,
        driverId: driver.id,
        routeId: route.id,
        tripType: "AFTERNOON",
        status: "IN_PROGRESS",
        scheduledStartAt: at(0, 16, 0),
        actualStartAt: at(0, 16, 3),
        startedBy: driver.id,
        notes: "Evening drop-off in progress.",
      },
    });
    trips.push(afternoon);
  }

  // ------------------------------------------------------ boarding events
  for (const [index, bus] of buses.slice(0, 3).entries()) {
    const driver = drivers[index];
    const route = routes[index];
    const morningTrip = trips[index * 2];
    const assigned = await prisma.busStudentAssignment.findMany({
      where: { busId: bus.id, isActive: true },
      select: { studentId: true, pickupStopId: true },
    });

    for (const assignment of assigned) {
      const stop = route.stops.find((s: any) => s.id === assignment.pickupStopId) ?? route.stops[0];

      await prisma.boardingEvent.create({
        data: {
          tripId: morningTrip.id,
          busId: bus.id,
          studentId: assignment.studentId,
          driverId: driver.id,
          stopId: stop?.id ?? null,
          eventType: "BOARDED",
          method: "QR",
          occurredAt: at(0, 6, 45),
          latitude: stop?.latitude ?? TAUNGOO.lat,
          longitude: stop?.longitude ?? TAUNGOO.lng,
          notes: "Morning boarding",
        },
      });
    }
  }

  // ------------------------------------------------------------ incidents
  await prisma.incident.create({
    data: {
      busId: buses[2].id,
      driverId: drivers[2].id,
      routeId: routes[2].id,
      type: "BREAKDOWN",
      severity: "MEDIUM",
      description: "Engine overheating near Taungoo General Hospital — bus stopped for inspection.",
      latitude: 18.9468,
      longitude: 96.4336,
      occurredAt: at(-1, 15, 20),
      status: "ACKNOWLEDGED",
    },
  });

  await prisma.incident.create({
    data: {
      busId: buses[0].id,
      driverId: drivers[0].id,
      routeId: routes[0].id,
      type: "ROUTE_DEVIATION",
      severity: "LOW",
      description: "Detour around road works on Bogyoke Road.",
      latitude: 18.9412,
      longitude: 96.4305,
      occurredAt: at(-3, 8, 15),
      resolvedAt: at(-3, 8, 40),
      resolvedBy: admin.id,
      status: "RESOLVED",
    },
  });

  // --------------------------------------------------------- maintenance
  const maintenanceDefs = [
    {
      busIndex: 0,
      type: "Oil change",
      title: "Oil & filter service",
      ticketNumber: "MNT-0001",
      mileage: 84200,
      date: -20,
      cost: 120000,
      description: "Engine oil and filter replaced.",
      performedBy: "Taungoo Auto Service",
      status: "COMPLETED",
      workPerformed: "Synthetic engine oil and oil filter replaced. Leak check passed.",
    },
    {
      busIndex: 1,
      type: "Brake service",
      title: "Front brake pad replacement",
      ticketNumber: "MNT-0002",
      mileage: 61300,
      date: -12,
      cost: 185000,
      description: "Front brake pads replaced.",
      performedBy: "Bago Motor Works",
      status: "COMPLETED",
      workPerformed: "Front discs machined, pads replaced, brake fluid topped up.",
    },
    {
      busIndex: 3,
      type: "Tyre rotation",
      title: "Tyre rotation & balance",
      ticketNumber: "MNT-0003",
      mileage: 45800,
      date: -5,
      cost: 45000,
      description: "Four tyres rotated and balanced.",
      performedBy: "Taungoo Tyre House",
      status: "COMPLETED",
      workPerformed: "Tyres rotated, balanced, pressure set to spec.",
    },
    {
      busIndex: 3,
      type: "Repair",
      title: "Suspension repair",
      ticketNumber: "MNT-0004",
      mileage: 45860,
      date: -1,
      cost: 0,
      description: "Driver reported a knocking sound on the rear axle. Bus held out of service until inspection and approval.",
      performedBy: "",
      status: "REPORTED",
      priority: "HIGH",
      blocksOperation: true,
    },
  ];

  for (const def of maintenanceDefs) {
    const completed = def.status === "COMPLETED";
    const data: any = {
      busId: buses[def.busIndex].id,
      type: def.type,
      title: def.title,
      ticketNumber: def.ticketNumber,
      status: def.status,
      priority: def.priority ?? "MEDIUM",
      severity: def.severity ?? "MEDIUM",
      blocksOperation: def.blocksOperation ?? true,
      mileage: def.mileage,
      date: at(def.date, 9),
      cost: def.cost,
      totalCost: def.cost,
      description: def.description,
      performedBy: def.performedBy,
      serviceProvider: def.performedBy,
      reportedBy: admin.id,
      reportedByName: admin.fullName,
      nextDueAt: at(def.date + 90, 9),
      nextDueMileage: def.mileage + 5000,
    };
    if (completed) {
      data.actualStartAt = at(def.date, 9);
      data.actualCompletedAt = at(def.date, 13);
      data.completedBy = admin.id;
      data.completedByName = admin.fullName;
      data.reviewedByName = admin.fullName;
      data.workPerformed = def.workPerformed ?? "";
    }
    await prisma.maintenanceRecord.create({ data });
  }

  // ---------------------------------------------------------------- fuel
  const fuelDefs = [
    { busIndex: 0, driverIndex: 0, days: -14, liters: 45.5, price: 2200, odometer: 84050, station: "Denko — Taungoo" },
    { busIndex: 0, driverIndex: 0, days: -3, liters: 42.0, price: 2250, odometer: 84600, station: "Denko — Taungoo" },
    { busIndex: 1, driverIndex: 1, days: -10, liters: 38.5, price: 2200, odometer: 61100, station: "Max — Taungoo" },
    { busIndex: 1, driverIndex: 1, days: -2, liters: 40.0, price: 2250, odometer: 61750, station: "Max — Taungoo" },
    { busIndex: 2, driverIndex: 2, days: -6, liters: 50.0, price: 2200, odometer: 90500, station: "Denko — Oktwin Road" },
    { busIndex: 3, driverIndex: null, days: -8, liters: 35.0, price: 2200, odometer: 45700, station: "MOGE — Taungoo" },
  ];

  for (const def of fuelDefs) {
    const driver = def.driverIndex === null ? drivers[0] : drivers[def.driverIndex];
    await prisma.fuelRecord.create({
      data: {
        busId: buses[def.busIndex].id,
        driverId: driver.id,
        date: at(def.days, 7),
        liters: def.liters,
        pricePerLiter: def.price,
        totalCost: def.liters * def.price,
        odometer: def.odometer,
        station: def.station,
        notes: "Routine refuel",
      },
    });
  }

  // -------------------------------------------------------- driver shifts
  for (const [index, driver] of drivers.entries()) {
    await prisma.driverShift.create({
      data: {
        driverId: driver.id,
        busId: buses[index].id,
        shiftStart: at(0, 6, 15),
        shiftEnd: at(0, 17, 30),
        notes: "Morning and afternoon school runs.",
      },
    });
  }

  // ------------------------------------------------------------ geofences
  const geofenceDefs = [
    { name: "Taungoo Education Complex", type: "SCHOOL", latitude: TAUNGOO.lat, longitude: TAUNGOO.lng, radius: 250 },
    { name: "Bus Depot — Taungoo", type: "DEPOT", latitude: 18.9435, longitude: 96.428, radius: 120 },
    { name: "Myoma Market Stop", type: "PICKUP_STOP", latitude: 18.9415, longitude: 96.4308, radius: 60 },
    { name: "Shwe San Daw Stop", type: "DROPOFF_STOP", latitude: 18.935, longitude: 96.4338, radius: 60 },
  ];

  for (const def of geofenceDefs) {
    await prisma.geofence.create({
      data: { ...def, active: true },
    });
  }

  // ==========================================================================
  // Messaging
  // ==========================================================================

  const makeConversation = async (
    aId: string,
    bId: string,
    requestedBy: string,
    status: string,
    thread: Array<{ from: string; text: string; read: boolean; minutesAgo: number }>
  ) => {
    const conversation = await prisma.conversation.create({
      data: {
        participantIds: [aId, bId],
        requestedById: requestedBy,
        status,
      },
    });

    for (const message of thread) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: message.from,
          text: message.text,
          readAt: message.read ? minutesAgo(Math.max(message.minutesAgo - 1, 0)) : null,
          createdAt: minutesAgo(message.minutesAgo),
        },
      });
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: minutesAgo(thread[thread.length - 1]?.minutesAgo ?? 0) },
    });
  };

  await makeConversation(parents["parent"].id, teachers["teacher1"].id, parents["parent"].id, "accepted", [
    { from: parents["parent"].id, text: "မင်္ဂလာပါ ဆရာမ။ စုစုလွင် ဒီနေ့ ကျောင်းလာမလား သိချင်ပါတယ်။", read: true, minutesAgo: 180 },
    { from: teachers["teacher1"].id, text: "မင်္ဂလာပါ။ စုစုလွင် ဒီနေ့ ကျောင်းရောက်ပါပြီ။ စာမေးပွဲ အစီအစဉ်လည်း ပို့ပေးလိုက်ပါမယ်။", read: true, minutesAgo: 150 },
    { from: parents["parent"].id, text: "ကျေးဇူးတင်ပါတယ် ဆရာမ။", read: false, minutesAgo: 40 },
  ]);

  await makeConversation(admin.id, teachers["teacher"].id, admin.id, "accepted", [
    { from: admin.id, text: "ဆရာ၊ ဒီအပတ် သင်္ချာ စာမေးပွဲ မေးခွန်းများ ပြင်ဆင်ပြီးပြီလား?", read: true, minutesAgo: 300 },
    { from: teachers["teacher"].id, text: "ပြီးပါပြီ။ ဒီနေ့ ညနေ စစ်ဆေးပေးပါ။", read: true, minutesAgo: 260 },
  ]);

  await makeConversation(parents["parent1"].id, teachers["teacher2"].id, parents["parent1"].id, "pending", [
    { from: parents["parent1"].id, text: "မင်္ဂလာပါ ဆရာမ။ မောင်မောင်အေး အကြောင်း ဆွေးနွေးလိုပါတယ်။", read: false, minutesAgo: 25 },
  ]);

  // ------------------------------------------------------------- summary
  const counts = {
    admins: await prisma.admin.count(),
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    parents: await prisma.parent.count(),
    drivers: await prisma.driver.count(),
    rooms: await prisma.room.count(),
    subjects: await prisma.subject.count(),
    classes: await prisma.class.count(),
    lessons: await prisma.lesson.count(),
    exams: await prisma.exam.count(),
    assignments: await prisma.assignment.count(),
    results: await prisma.result.count(),
    attendances: await prisma.attendance.count(),
    announcements: await prisma.announcement.count(),
    events: await prisma.event.count(),
    routes: await prisma.route.count(),
    buses: await prisma.bus.count(),
    trips: await prisma.trip.count(),
    conversations: await prisma.conversation.count(),
  };

  console.log(`
✔ Seed complete — Taungoo Education Complex, Bago Region (East), Myanmar

  Users      admin ${counts.admins}  ·  teacher ${counts.teachers}  ·  student ${counts.students}  ·  parent ${counts.parents}  ·  driver ${counts.drivers}
  Academics  rooms ${counts.rooms}  ·  subjects ${counts.subjects}  ·  classes ${counts.classes}  ·  lessons ${counts.lessons}
             exams ${counts.exams}  ·  assignments ${counts.assignments}  ·  results ${counts.results}  ·  attendances ${counts.attendances}
             announcements ${counts.announcements}  ·  events ${counts.events}
  Transport  routes ${counts.routes}  ·  buses ${counts.buses}  ·  trips ${counts.trips}  ·  messages ${counts.conversations} threads
             Bus positions are centred on Taungoo (${TAUNGOO.lat}, ${TAUNGOO.lng}).

  Sign in at  http://localhost:8000/api/auth/sign-in  with any of these logins:

    superadmin / SuperAdmin@123   (super-admin)
    admin      / Admin@123        (admin)
    admin2     / Admin@123        (admin)
    teacher    / Teacher@123      (teacher)
    teacher1   / Teacher@123      (teacher)
    teacher2   / Teacher@123      (teacher)
    teacher3   / Teacher@123      (teacher)
    teacher4   / Teacher@123      (teacher)
    teacher5   / Teacher@123      (teacher)
    student    / Student@123      (student — ကျော်ကျော်, Grade 10)
    student1   / Student@123      (student — စုစုလွင်, Grade 9)
    parent     / Parent@123       (parent — ဦးဇော်ဝင်း)
    parent1    / Parent@123       (parent)
    driver     / Driver@123       (driver — TTU-001)
    driver1    / Driver@123       (driver — TTU-002)
    driver2    / Driver@123       (driver — TTU-003)
`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
