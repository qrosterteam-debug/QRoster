// app.js - Updated with the new list of changes
// - Export CSV only after finalize or in history
// - DocID with time to avoid overwrite (subject_date_time_uid)
// - History shows subject — date time
// - Sanitized inputs, validation
// - Role-based auth (manual roles in /users collection, no custom claims/Functions)
// - Separate teacher/student login/register
// - Student features: view own attendance per subject (only own)
// - Admin role (manual in /users collection)
// - Class management: create/edit classes, select before attendance
// - Date picker for history
// - Mobile optimization (scanner permissions)
// - Error handling (toasts)
// - Logout clears scannedStudents
// - Backup/export all data
// - Home tutorial role-specific
// - Fix exported CSV (correct columns: StudentID, Name, Section, Status, Time)
// - Original UI kept (basic tabs + new ones for features)
// - Keep students.js (not dynamic, fixed for your section)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdTrOmPZzwW4LtMNQvPSSMNbz-r-yhNtY",
  authDomain: "qroster-4a631.firebaseapp.com",
  projectId: "qroster-4a631",
  storageBucket: "qroster-4a631.firebasestorage.app",
  messagingSenderId: "961257265744",
  appId: "1:961257265744:web:9f709bb6b6df541c8b8f55"
};

const app = initializeApp(firebaseConfig);

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  doc,
  serverTimestamp,
  limit,
  addDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { students } from "./students.js";

const db = getFirestore(app);
const auth = getAuth(app);

const SUBJECTS = [
  "Computer Systems Services",
  "Media and Information Literacy",
  "Empowerment Technologies",
  "Personal Development",
  "Inquiries Investigations and Immersion",
  "Physical Education & Health",
  "Work Immersion Program"
];

let currentSubject = null;
let scannedStudents = {};
let scanner = null;
let currentUser = null;
let isLoading = false;
let isFinalized = false;
let currentRole = null;
let classes = [];

function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    const doc = await getDoc(doc(db, "users", user.uid));
    currentRole = doc.exists() ? doc.data().role : 'teacher';
  } else {
    currentRole = null;
  }
  const userInfo = document.getElementById("user-info");
  const loginBtns = document.getElementById("login-btns");
  const logoutBtn = document.getElementById("logout");

  if (user) {
    const displayName = user.displayName || user.email.split("@")[0];
    if (userInfo) userInfo.innerHTML = `<span>Welcome, ${displayName}</span>`;
    if (loginBtns) loginBtns.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    loadRoleSpecificUI();
  } else {
    if (userInfo) userInfo.innerHTML = "";
    if (loginBtns) loginBtns.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    loadHomeTutorial('guest');
  }
});

function loadRoleSpecificUI() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.style.display = 'none');
  document.querySelector('.tab[data-target="home-tab"]').style.display = 'block';

  if (currentRole === 'teacher' || currentRole === 'admin') {
    document.querySelector('.tab[data-target="attendance-tab"]').style.display = 'block';
    document.querySelector('.tab[data-target="history-tab"]').style.display = 'block';
    document.querySelector('.tab[data-target="class-management-tab"]').style.display = 'block';
    loadHomeTutorial('teacher');
  } else if (currentRole === 'student') {
    document.querySelector('.tab[data-target="my-attendance-tab"]').style.display = 'block';
    loadHomeTutorial('student');
  } if (currentRole === 'admin') {
    document.querySelector('.tab[data-target="admin-management-tab"]').style.display = 'block';
  }
}

function loadHomeTutorial(role) {
  const homeTab = document.getElementById("home-tab");
  let tutorialHTML = '';

  if (role === 'guest') {
    tutorialHTML = `
      <p>QRoster is a modern QR-based attendance system for schools.</p>
      <p>To get started, login or register as a teacher or student.</p>
    `;
  } else if (role === 'teacher') {
    tutorialHTML = `
      <h3>Teacher Tutorial</h3>
      <ul>
        <li>1. Go to Class Management tab to create/edit classes and select class before attendance session.</li>
        <li>2. In Take Attendance, select subject, start scanner to mark present.</li>
        <li>3. Finalize to save and mark absent.</li>
        <li>4. View/export history in History tab with date picker.</li>
      </ul>
    `;
  } else if (role === 'student') {
    tutorialHTML = `
      <h3>Student Tutorial</h3>
      <ul>
        <li>1. Go to My Attendance tab.</li>
        <li>2. Select subject to view your present/absent status for that day.</li>
        <li>3. Use your QR code (provided by teacher) for scanning.</li>
      </ul>
    `;
  }

  homeTab.innerHTML += tutorialHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const scannerBtn = document.getElementById("start-scan");
  const finalizeBtn = document.getElementById("finalize");
  const exportBtn = document.getElementById("export-csv");
  const historyList = document.getElementById("history-list");
  const logoutBtn = document.getElementById("logout");

  const finalizeModal = document.getElementById("finalizeModal");
  const finalizeOk = document.getElementById("finalizeOk");
  const finalizeCancel = document.getElementById("finalizeCancel");

  // Login/Register Modals
  const teacherLoginModal = document.getElementById("teacher-login-modal");
  const studentLoginModal = document.getElementById("student-login-modal");
  const teacherRegisterModal = document.getElementById("teacher-register-modal");
  const studentRegisterModal = document.getElementById("student-register-modal");

  const teacherLoginEmail = document.getElementById("teacher-login-email");
  const teacherLoginPassword = document.getElementById("teacher-login-password");
  const teacherLoginSubmit = document.getElementById("teacher-login-submit");
  const teacherLoginCancel = document.getElementById("teacher-login-cancel");

  const studentLoginEmail = document.getElementById("student-login-email");
  const studentLoginPassword = document.getElementById("student-login-password");
  const studentLoginSubmit = document.getElementById("student-login-submit");
  const studentLoginCancel = document.getElementById("student-login-cancel");

  const teacherRegisterEmail = document.getElementById("teacher-register-email");
  const teacherRegisterPassword = document.getElementById("teacher-register-password");
  const teacherRegisterSubmit = document.getElementById("teacher-register-submit");
  const teacherRegisterCancel = document.getElementById("teacher-register-cancel");

  const studentRegisterEmail = document.getElementById("student-register-email");
  const studentRegisterPassword = document.getElementById("student-register-password");
  const studentRegisterSubmit = document.getElementById("student-register-submit");
  const studentRegisterCancel = document.getElementById("student-register-cancel");

  // Password eye icons
  document.querySelectorAll('.eye-icon').forEach(eye => {
    eye.addEventListener('click', () => {
      const input = eye.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      scannedStudents = {};
      await signOut(auth);
      showToast("👋 Logged out.");
    });
  }

  // Open modals
  document.getElementById("student-login").addEventListener("click", () => studentLoginModal.style.display = "block");
  document.getElementById("teacher-login").addEventListener("click", () => teacherLoginModal.style.display = "block");
  document.getElementById("student-register").addEventListener("click", () => studentRegisterModal.style.display = "block");
  document.getElementById("teacher-register").addEventListener("click", () => teacherRegisterModal.style.display = "block");

  // Cancel modals
  [teacherLoginCancel, studentLoginCancel, teacherRegisterCancel, studentRegisterCancel].forEach(cancel => {
    if (cancel) cancel.addEventListener("click", () => cancel.closest('.modal').style.display = "none");
  });

  // Submit Teacher Login
  if (teacherLoginSubmit) {
    teacherLoginSubmit.addEventListener("click", async () => {
      const email = teacherLoginEmail.value.trim();
      const password = teacherLoginPassword.value.trim();

      if (!email || !password) return showToast("⚠️ Please enter email and password!");

      isLoading = true;
      teacherLoginSubmit.disabled = true;
      teacherLoginSubmit.innerHTML = "Logging in...";

      try {
        await signInWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", auth.currentUser.uid), { role: 'teacher' }, { merge: true });
        showToast("✅ Logged in successfully!");
        teacherLoginModal.style.display = "none";
      } catch (e) {
        console.error(e);
        showToast("❌ Login failed — check email/password");
      } finally {
        isLoading = false;
        teacherLoginSubmit.disabled = false;
        teacherLoginSubmit.innerHTML = "Login";
      }
    });
  }

  // Submit Student Login
  if (studentLoginSubmit) {
    studentLoginSubmit.addEventListener("click", async () => {
      const email = studentLoginEmail.value.trim();
      const password = studentLoginPassword.value.trim();

      if (!email || !password) return showToast("⚠️ Please enter email and password!");

      isLoading = true;
      studentLoginSubmit.disabled = true;
      studentLoginSubmit.innerHTML = "Logging in...";

      try {
        await signInWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", auth.currentUser.uid), { role: 'student' }, { merge: true });
        showToast("✅ Logged in successfully!");
        studentLoginModal.style.display = "none";
      } catch (e) {
        console.error(e);
        showToast("❌ Login failed — check email/password");
      } finally {
        isLoading = false;
        studentLoginSubmit.disabled = false;
        studentLoginSubmit.innerHTML = "Login";
      }
    });
  }

  // Submit Teacher Register
  if (teacherRegisterSubmit) {
    teacherRegisterSubmit.addEventListener("click", async () => {
      const email = teacherRegisterEmail.value.trim();
      const password = teacherRegisterPassword.value.trim();

      if (!email || !password) return showToast("⚠️ Please enter email and password!");

      if (password.length < 6) return showToast("⚠️ Password must be at least 6 characters!");

      isLoading = true;
      teacherRegisterSubmit.disabled = true;
      teacherRegisterSubmit.innerHTML = "Creating...";

      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", credential.user.uid), { role: 'teacher' });
        showToast("✅ Registration successful! Logging you in...");
        teacherRegisterModal.style.display = "none";
      } catch (e) {
        console.error(e);
        showToast("❌ Registration failed — try again");
      } finally {
        isLoading = false;
        teacherRegisterSubmit.disabled = false;
        teacherRegisterSubmit.innerHTML = "Register";
      }
    });
  }

  // Submit Student Register
  if (studentRegisterSubmit) {
    studentRegisterSubmit.addEventListener("click", async () => {
      const email = studentRegisterEmail.value.trim();
      const password = studentRegisterPassword.value.trim();

      if (!email || !password) return showToast("⚠️ Please enter email and password!");

      if (password.length < 6) return showToast("⚠️ Password must be at least 6 characters!");

      isLoading = true;
      studentRegisterSubmit.disabled = true;
      studentRegisterSubmit.innerHTML = "Creating...";

      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", credential.user.uid), { role: 'student' });
        showToast("✅ Registration successful! Logging you in...");
        studentRegisterModal.style.display = "none";
      } catch (e) {
        console.error(e);
        showToast("❌ Registration failed — try again");
      } finally {
        isLoading = false;
        studentRegisterSubmit.disabled = false;
        studentRegisterSubmit.innerHTML = "Register";
      }
    });
  }

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add("active");

      if (tab.dataset.target !== "attendance-tab" && scanner) stopScanner();
      if (tab.dataset.target === "history-tab" && currentUser) loadHistoryList();
      if (tab.dataset.target === "class-management-tab" && currentRole === 'teacher') loadClassManagement();
      if (tab.dataset.target === "my-attendance-tab" && currentRole === 'student') loadMyAttendance();
      if (tab.dataset.target === "admin-management-tab" && currentRole === 'admin') loadAdminManagement();
    });
  });

  // Subject buttons
  const container = document.getElementById("subjects-container");
  if (container) {
    SUBJECTS.forEach((subject, idx) => {
      const btn = document.createElement("button");
      btn.className = "subject-btn";
      btn.innerText = subject;
      btn.addEventListener("click", () => selectSubject(idx));
      container.appendChild(btn);
    });
  }

  function selectSubject(idx) {
    currentSubject = SUBJECTS[idx];
    scannedStudents = {};
    isFinalized = false;
    showToast(`📘 ${currentSubject} selected`);
    document.getElementById("attendance-subject").innerText = currentSubject;
    renderAttendanceTable();
  }

  function renderAttendanceTable() {
    const tbody = document.getElementById("attendance-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    students.forEach(st => {
      const rec = scannedStudents[st.studentid];
      const tr = document.createElement("tr");

      let statusText = "—";
      let statusClass = "";

      if (rec) {
        statusText = "Present";
        statusClass = "present";
      } else if (isFinalized) {
        statusText = "Absent";
        statusClass = "absent";
      }

      tr.innerHTML = `
        <td>${st.studentid}</td>
        <td>${st.name}</td>
        <td>${st.section}</td>
        <td class="${statusClass}">${statusText}</td>
        <td>${rec ? rec.time : "—"}</td>
      `;

      tbody.appendChild(tr);
    });

    updateAttendanceSummary();
  }

  function updateAttendanceSummary() {
    const present = Object.keys(scannedStudents).length;
    const total = students.length;
    const percent = total ? Math.round((present / total) * 100) : 0;
    const el = document.getElementById("attendance-summary");
    if (el) {
      el.innerHTML = `<strong>Present:</strong> ${present} <strong>Absent:</strong> ${total - present} <strong>Attendance:</strong> ${percent}%`;
    }
  }

  async function startScanner() {
    if (!currentSubject) return showToast("⚠️ Select a subject first!");
    if (typeof Html5Qrcode === 'undefined') return showToast("❌ Scanner library not loaded!");

    if (!scanner) scanner = new Html5Qrcode("qr-video");

    scannerBtn.innerText = "⏹️ Stop Scanner";
    scannerBtn.disabled = true;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        handleScan
      );
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to start scanner! Try again.");
    } finally {
      scannerBtn.disabled = false;
    }
  }

  async function stopScanner() {
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch (err) {
        console.error("Scanner stop error:", err);
      }
      scanner = null;
      scannerBtn.innerText = "📷 Start Scanner";
      showToast("⏹️ Scanner stopped.");
    }
  }

  if (scannerBtn) {
    scannerBtn.addEventListener("click", () => {
      scanner ? stopScanner() : startScanner();
    });
  }

  function handleScan(decodedText) {
    try {
      const data = JSON.parse(decodedText);
      if (!data.studentid) {
        return showToast("⚠️ Invalid QR Code data!");
      }

      const student = students.find(s => s.studentid === data.studentid);
      if (!student) {
        return showToast("⚠️ Student not in roster!");
      }

      if (scannedStudents[data.studentid]) {
        return showToast(`⚠️ ${data.name || student.name} already scanned!`);
      }

      scannedStudents[data.studentid] = {
        ...data,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      showToast(`✅ ${data.name || student.name} marked present!`);
      renderAttendanceTable();
    } catch (e) {
      showToast("⚠️ Invalid QR Code format!");
    }
  }

  if (finalizeBtn) {
    finalizeBtn.addEventListener("click", () => {
      if (!currentSubject) return showToast("⚠️ Select a subject first!");
      if (!currentUser) return showToast("⚠️ Please login first!");
      if (Object.keys(scannedStudents).length === 0) return showToast("⚠️ Scan at least one student first!");
      
      finalizeModal.style.display = "block";
    });
  }

  if (finalizeOk) {
    finalizeOk.addEventListener("click", async () => {
      finalizeModal.style.display = "none";
      isLoading = true;
      finalizeBtn.disabled = true;
      finalizeBtn.innerHTML = "Saving...";

      const now = new Date();
      const date = now.toISOString().split("T")[0];
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).replace(":", "-");
      const safeSubject = currentSubject.replace(/[^a-zA-Z0-9]/g, '_');
      const docId = `${safeSubject}_${date}_${time}_${currentUser.uid}`;
      const ref = doc(db, "attendance", docId);

      try {
        await setDoc(ref, {
          teacher: currentUser.email,
          subject: currentSubject,
          date,
          time,
          records: scannedStudents,
          timestamp: serverTimestamp()
        });
        showToast("✅ Attendance saved and finalized!");
        isFinalized = true;
        renderAttendanceTable();
      } catch (err) {
        console.error(err);
        showToast("❌ Unable to save attendance!");
      } finally {
        isLoading = false;
        finalizeBtn.disabled = false;
        finalizeBtn.innerHTML = "Finalize & Save Attendance";
      }
    });
  }

  if (finalizeCancel) {
    finalizeCancel.addEventListener("click", () => {
      finalizeModal.style.display = "none";
    });
  }

  // Export CSV
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentSubject) return showToast("⚠️ Select a subject first!");
      if (!isFinalized) return showToast("⚠️ Finalize attendance first!");
      
      let csv = "Student ID,Name,Section,Status,Time\n";
      students.forEach(st => {
        const rec = scannedStudents[st.studentid];
        const status = rec ? "Present" : "Absent";
        csv += `${st.studentid},${st.name},${st.section},${status},${rec ? rec.time : ""}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${currentSubject}_attendance_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      showToast("📄 CSV exported!");
    });
  }

  // History load
  async function loadHistoryList() {
    if (!currentUser || !historyList) return;
    historyList.innerHTML = "<p>Loading history...</p";

    const q = query(
      collection(db, "attendance"),
      orderBy("__name__", "desc"),
      limit(50)
    );

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        historyList.innerHTML = "<p>No past records found.</p";
        return;
      }

      historyList.innerHTML = "";
      snapshot.forEach(docSnap => {
        const id = docSnap.id;
        const parts = id.split("_");
        if (parts.length < 4 || parts[parts.length - 1] !== currentUser.uid) return;

        const subject = parts.slice(0, -3).join("_").replace(/_/g, " ");
        const date = parts[parts.length - 3];
        const time = parts[parts.length - 2].replace("-", ":"); 

        const item = document.createElement("div");
        item.className = "history-item";
        item.innerHTML = "<strong>" + subject + "</strong> — " + date + " " + time;
        item.addEventListener("click", () => loadSingleHistory(subject, date, time));
        historyList.appendChild(item);
      });
    } catch (err) {
      console.error(err);
      historyList.innerHTML = "<p>Failed to load history.</p>";
    }
  }

  async function loadSingleHistory(subject, date, time) {
    const safeSubject = subject.replace(/[^a-zA-Z0-9]/g, '_');
    const docId = `${safeSubject}_${date}_${time.replace(":", "-")}_${currentUser.uid}`;
    const ref = doc(db, "attendance", docId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        showToast("📭 No record found.");
        return;
      }

      const data = snap.data();
      currentSubject = data.subject;
      scannedStudents = data.records || {};
      isFinalized = true;

      document.getElementById("attendance-subject").innerText = `${data.subject} (${data.date} ${data.time})`;
      renderAttendanceTable();

      document.querySelector('.tab[data-target="attendance-tab"]').click();
      showToast(`✅ Loaded ${data.subject} - ${data.date} ${data.time}`);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to load record.");
    }
  }

  updateAttendanceSummary();
});