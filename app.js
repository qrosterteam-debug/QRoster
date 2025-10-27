import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
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
import { app } from "./firebase.js";

// Initialize Firebase
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// UI elements
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

// Subjects
const SUBJECTS = [
  "Computer Systems Services",
  "Entrepreneurship",
  "Contemporary Philippine Arts From The Regions",
  "Understanding Culture, Society, And Politics",
  "21st Century Literature From The Philippines And The World",
  "Introduction To Philosophy And The Human Person",
  "Practical Research 2",
  "Physical Education And Health"
];

// State
let currentSubject = null;
let scannedStudents = {};
let scanner = null;
let currentUser = null;

// Force desktop mode
function forceDesktopMode() {
  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content = "width=1280, initial-scale=1.0";
  document.head.appendChild(meta);
  document.body.style.zoom = "85%";
}
forceDesktopMode();

// Toast
function showToast(msg, duration = 5000) {
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

// Authentication
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    userInfo.innerHTML = `<img src="${user.photoURL}" class="user-pic"/> <span>${user.displayName}</span>`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    currentUser = null;
    userInfo.innerHTML = "";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
    showToast("✅ Logged in successfully!");
  } catch (e) {
    console.error(e);
    showToast("❌ Login failed!");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  showToast("👋 Logged out successfully.");
});

// Tabs
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

// Create subject buttons
const container = document.getElementById("subjects-container");
SUBJECTS.forEach((subject, idx) => {
  const btn = document.createElement("button");
  btn.className = "subject-btn";
  btn.innerText = subject;
  btn.addEventListener("click", () => selectSubject(idx));
  container.appendChild(btn);
});

// Select subject
function selectSubject(idx) {
  currentSubject = SUBJECTS[idx];
  showToast(`📘 ${currentSubject} selected.`);
  document.getElementById("attendance-subject").innerText = currentSubject;
  scannedStudents = {};
  renderAttendanceTable();
}

// Render attendance
function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-body");
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

// Scanner
async function startScanner() {
  if (!currentSubject) return showToast("⚠️ Select a subject first!");
  if (!scanner) {
    scanner = new Html5Qrcode("qr-video");
  }
  scannerBtn.innerText = "Stop Scanner";
  try {
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      handleScan
    );
  } catch (err) {
    console.error(err);
    showToast("❌ Failed to start scanner!");
  }
}

async function stopScanner() {
  if (scanner) {
    await scanner.stop();
    scannerBtn.innerText = "Start Scanner";
    showToast("⏹️ Scanner stopped.");
  }
}

scannerBtn.addEventListener("click", () => {
  if (scannerBtn.innerText === "Start Scanner") startScanner();
  else stopScanner();
});

function handleScan(decodedText) {
  try {
    const data = JSON.parse(decodedText);
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

// Finalize attendance
finalizeBtn.addEventListener("click", async () => {
  if (!currentSubject) return showToast("⚠️ Select a subject first!");
  if (!currentUser) return showToast("⚠️ Please log in first!");

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
  }
});

// History fetch
historyLoadBtn.addEventListener("click", async () => {
  if (!currentUser) return showToast("⚠️ Log in to view history!");
  const subj = confirmSubjectEl.value;
  const date = confirmDateEl.value;
  if (!subj || !date) return showToast("⚠️ Choose subject & date!");
  const ref = doc(db, "attendance", `${subj}_${date}_${currentUser.uid}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return showToast("📭 No records found.");
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
  historyResults.innerHTML = "";
  historyResults.appendChild(div);
});
