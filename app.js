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
  limit
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

function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  const userInfo = document.getElementById("user-info");
  const loginBtn = document.getElementById("login");
  const registerBtn = document.getElementById("register");
  const logoutBtn = document.getElementById("logout");

  if (user) {
    const displayName = user.displayName || user.email.split("@")[0];
    if (userInfo) userInfo.innerHTML = `<span>Welcome, ${displayName}</span>`;
    if (loginBtn) loginBtn.style.display = "none";
    if (registerBtn) registerBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (userInfo) userInfo.innerHTML = "";
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (registerBtn) registerBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const scannerBtn = document.getElementById("start-scan");
  const finalizeBtn = document.getElementById("finalize");
  const exportBtn = document.getElementById("export-csv");
  const historyList = document.getElementById("history-list");
  const loginBtn = document.getElementById("login");
  const registerBtn = document.getElementById("register");
  const logoutBtn = document.getElementById("logout");

  const finalizeModal = document.getElementById("finalizeModal");
  const finalizeOk = document.getElementById("finalizeOk");
  const finalizeCancel = document.getElementById("finalizeCancel");

  // Login Modal
  const loginModal = document.getElementById("loginModal");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginSubmit = document.getElementById("loginSubmit");
  const loginCancel = document.getElementById("loginCancel");

  // Register Modal
  const registerModal = document.getElementById("registerModal");
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = document.getElementById("registerPassword");
  const registerSubmit = document.getElementById("registerSubmit");
  const registerCancel = document.getElementById("registerCancel");

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      showToast("👋 Logged out.");
    });
  }

  // Open Login Modal
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      loginModal.style.display = "block";
      loginEmail.value = "";
      loginPassword.value = "";
      loginEmail.focus();
    });
  }

  // Open Register Modal
  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      registerModal.style.display = "block";
      registerEmail.value = "";
      registerPassword.value = "";
      registerEmail.focus();
    });
  }

  // Submit Login
  if (loginSubmit) {
    loginSubmit.addEventListener("click", async () => {
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();

      if (!email || !password) {
        showToast("⚠️ Please enter email and password!");
        return;
      }

      isLoading = true;
      loginSubmit.disabled = true;
      loginSubmit.innerHTML = "Logging in...";

      try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("✅ Logged in successfully!");
        loginModal.style.display = "none";
      } catch (e) {
        console.error(e);
        if (e.code === "auth/user-not-found") {
          showToast("❌ No account found. Please register first!");
        } else if (e.code === "auth/wrong-password") {
          showToast("❌ Incorrect password!");
        } else {
          showToast("❌ Login failed — check email/password");
        }
      } finally {
        isLoading = false;
        loginSubmit.disabled = false;
        loginSubmit.innerHTML = "Login";
      }
    });
  }

  // Submit Register
  if (registerSubmit) {
    registerSubmit.addEventListener("click", async () => {
      const email = registerEmail.value.trim();
      const password = registerPassword.value.trim();

      if (!email || !password) {
        showToast("⚠️ Please enter email and password!");
        return;
      }

      if (password.length < 6) {
        showToast("⚠️ Password must be at least 6 characters!");
        return;
      }

      isLoading = true;
      registerSubmit.disabled = true;
      registerSubmit.innerHTML = "Creating...";

      try {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("✅ Registration successful! Logging you in...");
        registerModal.style.display = "none";
      } catch (e) {
        console.error(e);
        if (e.code === "auth/email-already-in-use") {
          showToast("❌ Email already registered! Use Login.");
        } else {
          showToast("❌ Registration failed — try again");
        }
      } finally {
        isLoading = false;
        registerSubmit.disabled = false;
        registerSubmit.innerHTML = "Register";
      }
    });
  }

  // Cancel buttons
  if (loginCancel) loginCancel.addEventListener("click", () => loginModal.style.display = "none");
  if (registerCancel) registerCancel.addEventListener("click", () => registerModal.style.display = "none");

  // Close modals on outside click
  [loginModal, registerModal].forEach(modal => {
    if (modal) {
      modal.addEventListener("click", (e) => { 
        if (e.target === modal) modal.style.display = "none"; 
      });
    }
  });

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
      const safeSubject = currentSubject.replace(/[^a-zA-Z0-9]/g, '_');
      const docId = `${safeSubject}_${date}_${currentUser.uid}`;
      const ref = doc(db, "attendance", docId);

      try {
        await setDoc(ref, {
          teacher: currentUser.email,
          subject: currentSubject,
          date,
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

  // Export CSV — no check for finalize
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentSubject) return showToast("⚠️ Select a subject first!");
      
      let csv = "Student ID,Name,Section,Status,Time\n";
      students.forEach(st => {
        const rec = scannedStudents[st.studentid];
        const status = rec ? "Present" : "—";
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

  // History load (no time in docId)
  async function loadHistoryList() {
    if (!currentUser || !historyList) return;
    historyList.innerHTML = "<p>Loading history...</p>";

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
        if (parts.length < 3 || parts[parts.length - 1] !== currentUser.uid) return;

        const subject = parts.slice(0, -2).join("_").replace(/_/g, " ");
        const date = parts[parts.length - 2];

        const item = document.createElement("div");
        item.className = "history-item";
        item.innerHTML = "<strong>" + subject + "</strong> — " + date;
        item.addEventListener("click", () => loadSingleHistory(subject, date));
        historyList.appendChild(item);
      });
    } catch (err) {
      console.error(err);
      historyList.innerHTML = "<p>Failed to load history.</p>";
    }
  }

  async function loadSingleHistory(subject, date) {
    const safeSubject = subject.replace(/[^a-zA-Z0-9]/g, '_');
    const docId = `${safeSubject}_${date}_${currentUser.uid}`;
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

      document.getElementById("attendance-subject").innerText = `${data.subject} (${data.date})`;
      renderAttendanceTable();

      document.querySelector('.tab[data-target="attendance-tab"]').click();
      showToast(`✅ Loaded ${data.subject} - ${data.date}`);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to load record.");
    }
  }

  updateAttendanceSummary();
});