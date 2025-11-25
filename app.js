// app.js - Fixed version with null checks for DOM elements and Firebase config reminder

// Initialize Firebase app here (moved from firebase.js to fix import error)
// IMPORTANT: Replace the firebaseConfig below with your actual Firebase project config from the Firebase Console.
// Go to https://console.firebase.google.com/, select your project, go to Project Settings > General > Your apps > Web app config.
// Copy the config object and replace the placeholders below.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdTrOmPZzwW4LtMNQvPSSMNbz-r-yhNtY",  // Replace with your actual API key
  authDomain: "qroster-4a631.firebaseapp.com",  // Replace with your auth domain
  projectId: "qroster-4a631",  // Replace with your project ID
  storageBucket: "qroster-4a631.firebasestorage.app",  // Replace with your storage bucket
  messagingSenderId: "961257265744",  // Replace with your messaging sender ID
  appId: "1:961257265744:web:9f709bb6b6df541c8b8f55"  // Replace with your app ID
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
  orderBy,
  where,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { students } from "./students.js"; // DO NOT CHANGE student list file

// Initialize Firebase
const db = getFirestore(app);
const auth = getAuth(app);

// Subjects
const SUBJECTS = [
  "Computer Systems Services",
  "Media and Information Literacy",
  "Empowerment Technologies",
  "Personal Development",
  "Inquiries Investigations and Immersion",
  "Physical Education & Health",
  "Work Immersion Program"
];

// State
let currentSubject = null;
let scannedStudents = {};
let scanner = null;
let currentUser = null;
let isLoading = false; // For loading indicators

// Toast (fixed: reduced default duration to 3000ms for better UX)
function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return console.warn("Toast element not found!");
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

// Authentication
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    const userInfo = document.getElementById("user-info");
    if (userInfo) userInfo.innerHTML = `<span>${user.email}</span>`;
    const loginBtn = document.getElementById("login");
    if (loginBtn) loginBtn.style.display = "none";
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    // Hide login form if present
    const loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.style.display = "none";
  } else {
    currentUser = null;
    const userInfo = document.getElementById("user-info");
    if (userInfo) userInfo.innerHTML = "";
    const loginBtn = document.getElementById("login");
    if (loginBtn) loginBtn.style.display = "inline-block";
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) logoutBtn.style.display = "none";
    // Show login form if present
    const loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.style.display = "block";
  }
});

// Wait for DOM to load before accessing elements
document.addEventListener("DOMContentLoaded", () => {
  // UI elements (added null checks to prevent errors if elements are missing)
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");
  const qrVideo = document.getElementById("qr-video");
  const qrResult = document.getElementById("qr-result");
  const scannerBtn = document.getElementById("start-scan");
  const finalizeBtn = document.getElementById("finalize");
  const exportBtn = document.getElementById("export-csv");
  const historyResults = document.getElementById("history-results");
  const loginBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logout");
  const userInfo = document.getElementById("user-info");
  const toast = document.getElementById("toast");
  const confirmModal = document.getElementById("confirmModal");
  const confirmOk = document.getElementById("confirmOk");
  const confirmCancel = document.getElementById("confirmCancel");
  const confirmSubjectEl = document.getElementById("confirmSubject");
  const confirmDateEl = document.getElementById("confirmDate");
  const historyLoadBtn = document.getElementById("history-load");

  // Login button (fixed: added null checks for email/password elements)
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      if (isLoading) return;
      isLoading = true;
      loginBtn.disabled = true;
      const emailEl = document.getElementById("login-email");
      const passwordEl = document.getElementById("login-password");
      if (!emailEl || !passwordEl) {
        console.error("Missing elements:", { emailEl, passwordEl }); // Debug log
        showToast("⚠️ Login form elements not found!");
        isLoading = false;
        loginBtn.disabled = false;
        return;
      }
      const email = emailEl.value.trim();
      const password = passwordEl.value.trim();
      if (!email || !password) {
        showToast("⚠️ Please enter email and password!");
        isLoading = false;
        loginBtn.disabled = false;
        return;
      }
      try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("✅ Logged in successfully!");
      } catch (e) {
        console.error(e);
        showToast("❌ Login failed!");
      } finally {
        isLoading = false;
        loginBtn.disabled = false;
      }
    });
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      showToast("👋 Logged out successfully.");
    });
  }

  // Tabs
  if (tabs && contents) {
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        contents.forEach(c => c.classList.remove("active"));
        tab.classList.add("active");
        const target = document.getElementById(tab.dataset.target);
        if (target) target.classList.add("active");
      });
    });
  }

  // Create subject buttons
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

  // Select subject
  function selectSubject(idx) {
    currentSubject = SUBJECTS[idx];
    showToast(`📘 ${currentSubject} selected.`);
    const attendanceSubject = document.getElementById("attendance-subject");
    if (attendanceSubject) attendanceSubject.innerText = currentSubject;
    scannedStudents = {};
    renderAttendanceTable();
  }

  // Render attendance
  function renderAttendanceTable() {
    const tbody = document.getElementById("attendance-body");
    if (!tbody) return console.warn("Attendance body element not found!");
    tbody.innerHTML = "";
    students.forEach(st => {
      const tr = document.createElement("tr");
      const present = scannedStudents[st.studentid];
      tr.innerHTML = `
        <td>${st.studentid}</td>
        <td>${st.name}</td>
        <td>${st.section}</td>
        <td class="${present ? "present" : "absent"}">${present ? "Present" : "Absent"}</td>
        <td>${present ? present.time : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Scanner (fixed: check library availability correctly, prevent duplicates, validate data, reset state)
  async function startScanner() {
    if (!currentSubject) return showToast("⚠️ Select a subject first!");
    if (typeof Html5Qrcode === 'undefined') return showToast("❌ Scanner library not loaded!");
    if (!scanner) {
      scanner = new Html5Qrcode("qr-video");
    }
    if (scannerBtn) {
      scannerBtn.innerText = "Stop Scanner";
      scannerBtn.disabled = true;
    }
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        handleScan
      );
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to start scanner!");
    } finally {
      if (scannerBtn) scannerBtn.disabled = false;
    }
  }

  async function stopScanner() {
    if (scanner) {
      await scanner.stop();
      scanner = null; // Fixed: reset scanner state
      if (scannerBtn) scannerBtn.innerText = "Start Scanner";
      showToast("⏹️ Scanner stopped.");
    }
  }

  if (scannerBtn) {
    scannerBtn.addEventListener("click", () => {
      if (scannerBtn.innerText === "Start Scanner") startScanner();
      else stopScanner();
    });
  }

  function handleScan(decodedText) {
    try {
      const data = JSON.parse(decodedText);
      if (!data.studentid || !data.name) { // Fixed: validate required fields
        return showToast("⚠️ Invalid QR Code data!");
      }
      if (scannedStudents[data.studentid]) { // Fixed: prevent duplicates
        return showToast(`⚠️ ${data.name} already scanned!`);
      }
      if (students.find(s => s.studentid === data.studentid)) {
        scannedStudents[data.studentid] = {
          ...data,
          time: new Date().toLocaleTimeString()
        };
        showToast(`✅ ${data.name} marked present!`);
        renderAttendanceTable();
      } else {
        showToast("⚠️ Invalid QR Code!");
      }
    } catch {
      showToast("⚠️ Invalid QR Code format!");
    }
  }

  // Finalize attendance (fixed: prevent empty saves, add loading)
  if (finalizeBtn) {
    finalizeBtn.addEventListener("click", async () => {
      if (!currentSubject) return showToast("⚠️ Select a subject first!");
      if (!currentUser) return showToast("⚠️ Please log in first!");
      if (Object.keys(scannedStudents).length === 0) return showToast("⚠️ No students scanned!"); // Fixed: check for empty scans
      if (isLoading) return;
      isLoading = true;
      finalizeBtn.disabled = true;
      const date = new Date().toISOString().split("T")[0];
      const ref = doc(db, "attendance", `${currentSubject}_${date}_${currentUser.uid}`);
      try {
        await setDoc(ref, {
          teacher: currentUser.displayName,
          subject: currentSubject,
          date,
          records: scannedStudents,
          timestamp: serverTimestamp()
        });
        showToast("✅ Attendance saved and finalized!");
      } catch (err) {
        console.error(err);
        showToast("❌ Unable to save attendance!");
      } finally {
        isLoading = false;
        finalizeBtn.disabled = false;
      }
    });
  }

  // Export CSV (fixed: added functionality)
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentSubject) return showToast("⚠️ Select a subject first!");
      const csvContent = "data:text/csv;charset=utf-8," +
        "Student ID,Name,Section,Status,Time\n" +
        students.map(st => {
          const rec = scannedStudents[st.studentid];
          return `${st.studentid},${st.name},${st.section},${rec ? "Present" : "Absent"},${rec ? rec.time : ""}`;
        }).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${currentSubject}_attendance.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("📄 CSV exported!");
    });
  }

  // History fetch (fixed: made modal functional, added loading)
  if (historyLoadBtn) {
    historyLoadBtn.addEventListener("click", () => {
      if (!currentUser) return showToast("⚠️ Log in to view history!");
      // Populate subject dropdown (assuming confirmSubjectEl is a <select>)
      if (confirmSubjectEl) confirmSubjectEl.innerHTML = SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join("");
      if (confirmModal) confirmModal.style.display = "block"; // Show modal
    });
  }

  if (confirmOk) {
    confirmOk.addEventListener("click", async () => {
      const subj = confirmSubjectEl ? confirmSubjectEl.value : "";
      const date = confirmDateEl ? confirmDateEl.value : "";
      if (confirmModal) confirmModal.style.display = "none"; // Hide modal
      if (!subj || !date) return showToast("⚠️ Choose subject & date!");
      if (isLoading) return;
      isLoading = true;
      if (historyLoadBtn) historyLoadBtn.disabled = true;
      const ref = doc(db, "attendance", `${subj}_${date}_${currentUser.uid}`);
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          showToast("📭 No records found.");
          return;
        }
        const data = snap.data();
        const div = document.createElement("div");
        div.innerHTML = `<h3>${data.subject} (${data.date})</h3>`;
        const table = document.createElement("table");
        table.innerHTML = `
          <thead><tr><th>ID</th><th>Name</th><th>Section</th><th>Status</th><th>Time</th></tr></thead>
          <tbody>
            ${students
              .map(st => {
                const rec = data.records[st.studentid];
                return `<tr>
                  <td>${st.studentid}</td>
                  <td>${st.name}</td>
                  <td>${st.section}</td>
                  <td class="${rec ? "present" : "absent"}">${rec ? "Present" : "Absent"}</td>
                  <td>${rec ? rec.time : "—"}</td>
                </tr>`;
              })
              .join("")}
          </tbody>`;
        div.appendChild(table);
        if (historyResults) {
          historyResults.innerHTML = "";
          historyResults.appendChild(div);
        }
      } catch (err) {
        console.error(err);
        showToast("❌ Failed to load history!");
      } finally {
        isLoading = false;
        if (