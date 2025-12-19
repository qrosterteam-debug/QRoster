// app.js - Final Version with Professional Login Modal

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", // ← Replace with your own Firebase API key
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
  where,
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
  const logoutBtn = document.getElementById("logout");

  if (user) {
    if (userInfo) userInfo.innerHTML = `<span>Welcome, ${user.email}</span>`;
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (userInfo) userInfo.innerHTML = "";
    if (loginBtn) loginBtn.style.display = "inline-block";
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
  const logoutBtn = document.getElementById("logout");

  const finalizeModal = document.getElementById("finalizeModal");
  const finalizeOk = document.getElementById("finalizeOk");
  const finalizeCancel = document.getElementById("finalizeCancel");

  // Login Modal Elements
  const loginModal = document.getElementById("loginModal");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginSubmit = document.getElementById("loginSubmit");
  const loginCancel = document.getElementById("loginCancel");

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

      try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("✅ Logged in successfully!");
        loginModal.style.display = "none";
      } catch (e) {
        console.error(e);
        showToast("❌ Login failed — check email/password");
      } finally {
        isLoading = false;
        loginSubmit.disabled = false;
      }
    });
  }

  // Cancel Login
  if (loginCancel) {
    loginCancel.addEventListener("click", () => {
      loginModal.style.display = "none";
    });
  }

  // Close Login Modal when clicking outside
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) {
        loginModal.style.display = "none";
      }
    });
  }

  // Tab switching
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
    showToast(`📘 ${currentSubject} selected`);
    document.getElementById("attendance-subject").innerText = currentSubject;
    renderAttendanceTable();
  }

  function renderAttendanceTable() {
    const tbody = document.getElementById("attendance-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(st => {
      const rec = scannedStudents[st.studentid];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${st.studentid}</td>
        <td>${st.name}</td>
        <td>${st.section}</td>
        <td class="${rec ? "present" : "absent"}">${rec ? "Present" : "Absent"}</td>
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
    if (!currentSubject) return showToast("⚠️ Select a subject!");
    if (typeof Html5Qrcode === 'undefined') return showToast("❌ Scanner library missing!");

    if (!scanner) scanner = new Html5Qrcode("qr-video");
    scannerBtn.innerText = "Stop Scanner";
    scannerBtn.disabled = true;

    try {
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, handleScan);
    } catch (err) {
      showToast("❌ Camera error!");
    } finally {
      scannerBtn.disabled = false;
    }
  }

  async function stopScanner() {
    if (scanner) {
      await scanner.stop();
      scanner.clear();
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
      if (!data.studentid || !data.name) return showToast("⚠️ Invalid QR!");

      if (!students.find(s => s.studentid === data.studentid)) return showToast("⚠️ Student not in roster!");

      if (scannedStudents[data.studentid]) return showToast(`⚠️ ${data.name} already present!`);

      scannedStudents[data.studentid] = {
        ...data,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      showToast(`✅ ${data.name} present!`);
      renderAttendanceTable();
    } catch (e) {
      showToast("⚠️ Bad QR format!");
    }
  }

  // Finalize
  if (finalizeBtn) {
    finalizeBtn.addEventListener("click", () => {
      if (!currentSubject || !currentUser || Object.keys(scannedStudents).length === 0) {
        showToast("⚠️ Complete requirements first!");
        return;
      }
      finalizeModal.style.display = "block";
    });
  }

  if (finalizeOk) {
    finalizeOk.addEventListener("click", async () => {
      finalizeModal.style.display = "none";
      isLoading = true;
      finalizeBtn.disabled = true;

      const date = new Date().toISOString().split("T")[0];
      const docId = `${currentSubject}_${date}_${currentUser.uid}`;
      const ref = doc(db, "attendance", docId);

      try {
        await setDoc(ref, {
          teacher: currentUser.email,
          subject: currentSubject,
          date,
          records: scannedStudents,
          timestamp: serverTimestamp()
        });
        showToast("✅ Attendance saved!");
      } catch (err) {
        showToast("❌ Save failed!");
      } finally {
        isLoading = false;
        finalizeBtn.disabled = false;
      }
    });
  }

  if (finalizeCancel) finalizeCancel.addEventListener("click", () => finalizeModal.style.display = "none");

  // Export CSV
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentSubject) return showToast("⚠️ Select subject!");

      let csv = "Student ID,Name,Section,Status,Time\n";
      [...students].sort((a,b) => a.name.localeCompare(b.name)).forEach(st => {
        const rec = scannedStudents[st.studentid];
        csv += `${st.studentid},${st.name},${st.section},${rec ? "Present" : "Absent"},${rec ? rec.time : ""}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentSubject}_attendance_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("📄 CSV exported!");
    });
  }

  // History List
  async function loadHistoryList() {
    if (!currentUser || !historyList) return;
    historyList.innerHTML = "<p>Loading...</p>";

    const q = query(
      collection(db, "attendance"),
      orderBy("__name__", "desc"),
      limit(50)
    );

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        historyList.innerHTML = "<p>No records found.</p>";
        return;
      }

      historyList.innerHTML = "";
      snapshot.forEach(docSnap => {
        const id = docSnap.id;
        const parts = id.split("_");
        if (parts.length < 3 || parts[parts.length - 1] !== currentUser.uid) return;

        const subject = parts.slice(0, -2).join("_");
        const date = parts[parts.length - 2];

        const item = document.createElement("div");
        item.className = "history-item";
        item.innerHTML = `<strong>${subject}</strong> — ${date}`;
        item.addEventListener("click", () => loadSingleHistory(subject, date));
        historyList.appendChild(item);
      });
    } catch (err) {
      historyList.innerHTML = "<p>Failed to load history.</p>";
    }
  }

  async function loadSingleHistory(subject, date) {
    const ref = doc(db, "attendance", `${subject}_${date}_${currentUser.uid}`);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return showToast("📭 Record not found.");

      const data = snap.data();
      currentSubject = data.subject;
      scannedStudents = data.records || {};

      document.getElementById("attendance-subject").innerText = `${data.subject} (${data.date})`;
      renderAttendanceTable();

      document.querySelector('.tab[data-target="attendance-tab"]').click();
      showToast(`✅ Loaded ${data.subject} - ${data.date}`);
    } catch (err) {
      showToast("❌ Load failed.");
    }
  }

  updateAttendanceSummary();
});