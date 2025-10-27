// app.js — full updated application logic
// Uses Firebase CDN modules and students from ./students.js
// Important: keep your students.js unchanged; it must export `students` as an ES module: export { students }

import { students } from "./students.js";

// Firebase (CDN) imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs,
  query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- Your Firebase config (kept unchanged) ----------
const firebaseConfig = {
  apiKey: "AIzaSyDdTrOmPZzwW4LtMNQvPSSMNbz-r-yhNtY",
  authDomain: "qroster-4a631.firebaseapp.com",
  projectId: "qroster-4a631",
  storageBucket: "qroster-4a631.firebasestorage.app",
  messagingSenderId: "961257265744",
  appId: "1:961257265744:web:9f709bb6b6df541c8b8f55",
  measurementId: "G-63MXS6BHMK"
};

// init firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// ---------- UI references ----------
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const subjectListEl = document.getElementById("subject-list");
const subjectsContainer = document.getElementById("subjects-container");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const modalLogin = document.getElementById("modal-login");
const userInfoEl = document.getElementById("user-info");
const loginFrost = document.getElementById("login-frost");
const historyTabBtn = document.getElementById("history-tab");
const historySelect = document.getElementById("history-subject-select");
const historyDate = document.getElementById("history-date");
const historyShow = document.getElementById("history-show");
const historyResults = document.getElementById("history-results");
const historySpinner = document.getElementById("history-spinner");
const confirmModal = document.getElementById("confirm-modal");
const cancelFinalize = document.getElementById("cancel-finalize");
const confirmFinalize = document.getElementById("confirm-finalize");
const toastEl = document.getElementById("toast");

// Toast helper
function showToast(msg, timeout = 5000) {
  toastEl.innerText = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), timeout);
}

// Subjects list — your requested 8 subjects
const subjects = [
  "Computer Systems Services",
  "Entrepreneurship",
  "Contemporary Philippine Arts From The Regions",
  "Understanding Culture, Society, And Politics",
  "21st Century Literature From The Philippines And The World",
  "Introduction To Philosophy And The Human Person",
  "Practical Research 2",
  "Physical Education And Health"
];

// small app state
let currentUser = null;
let currentSubjectIdx = null;
let scannerState = { active: false, instance: null, cameraId: null };
let cameraListCache = null;

// map to keep today's attendance local state per subject
// structure: attendanceCache[subjectIdx] = { "M001": record, ... }
const attendanceCache = {};

// ensure sidebar toggle works
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

// --------- Authentication logic ----------
loginBtn.addEventListener("click", doSignIn);
modalLogin.addEventListener("click", doSignIn);
logoutBtn.addEventListener("click", () => signOut(auth).catch(e=>console.error(e)));

async function doSignIn() {
  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged handler will update UI
  } catch (err) {
    console.error("Login error:", err);
    showToast("Login failed: " + (err.message || err.code || "Unknown"));
  }
}

// onAuth state change
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userInfoEl.innerText = user.email;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    historyTabBtn.style.display = "block";
    // close login modal
    loginFrost.setAttribute("data-open","false");
    loginFrost.setAttribute("aria-hidden","true");

    // show history subjects list
    populateHistorySelect();

    // show logout under user and keep them visible
  } else {
    currentUser = null;
    userInfoEl.innerText = "Not signed in";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    historyTabBtn.style.display = "none";

    // show login modal (frosted)
    loginFrost.setAttribute("data-open","true");
    loginFrost.setAttribute("aria-hidden","false");
  }
});

// open login modal if not logged on first load
window.addEventListener("load", () => {
  if (!auth.currentUser) {
    loginFrost.setAttribute("data-open","true");
    loginFrost.setAttribute("aria-hidden","false");
  }
});

// close confirm modal helpers
function openConfirmModal() {
  confirmModal.setAttribute("aria-hidden","false");
  confirmModal.style.display = "flex";
}
function closeConfirmModal() {
  confirmModal.setAttribute("aria-hidden","true");
  confirmModal.style.display = "none";
}
cancelFinalize.addEventListener("click", closeConfirmModal);

// ---------- Build UI: sidebar subjects & subject panels ----------
function buildSidebarAndPanels() {
  subjectListEl.innerHTML = "";
  subjectsContainer.innerHTML = "";
  subjects.forEach((title, idx) => {
    // sidebar subject button
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.tab = `subject-${idx}`;
    btn.innerText = title;
    btn.addEventListener("click", () => switchToSubject(idx));
    subjectListEl.appendChild(btn);

    // subject panel
    const panel = document.createElement("section");
    panel.id = `subject-${idx}`;
    panel.className = "tab-content subject-panel";
    panel.innerHTML = `
      <div class="subject-header">
        <h3>${title}</h3>
        <div class="controls">
          <div class="stats">
            <div class="stat"><div class="big" id="total-${idx}">${students.length}</div><div>Total</div></div>
            <div class="stat"><div class="big" id="present-${idx}">-</div><div>Present Today</div></div>
            <div class="stat"><div class="big" id="absent-${idx}">-</div><div>Absent Today</div></div>
          </div>
          <div class="controls">
            <button id="start-scanner-${idx}" class="primary">Start Scanner</button>
            <button id="finalize-${idx}" class="primary">Finalize Attendance</button>
            <button id="export-${idx}" class="primary">Export CSV</button>
          </div>
        </div>
      </div>

      <div class="scanner-wrap">
        <div class="scanner-box">
          <div id="qr-reader-${idx}" style="width:100%;"></div>
          <div class="camera-row" id="camera-row-${idx}">
            <label>Camera:</label>
            <select id="camera-select-${idx}"></select>
            <button id="camera-refresh-${idx}" class="primary">Refresh</button>
          </div>
          <div id="qr-reader-results-${idx}"></div>
        </div>

        <div style="flex:1; min-width:300px;">
          <table class="attendance-table" id="table-${idx}">
            <thead><tr><th>ID</th><th>Name</th><th>Section</th><th>Status</th><th>Time</th></tr></thead>
            <tbody id="table-body-${idx}"></tbody>
          </table>
        </div>
      </div>
    `;
    subjectsContainer.appendChild(panel);

    // attach button events after element exists
    setTimeout(()=> {
      document.getElementById(`start-scanner-${idx}`).addEventListener("click", ()=> toggleScanner(idx));
      document.getElementById(`finalize-${idx}`).addEventListener("click", ()=> openConfirmModalFor(idx));
      document.getElementById(`export-${idx}`).addEventListener("click", ()=> exportAttendanceCSV(idx));
      document.getElementById(`camera-refresh-${idx}`).addEventListener("click", ()=> populateCameraSelect(idx, true));
      document.getElementById(`camera-select-${idx}`).addEventListener("change", (e) => {
        const selId = e.target.value;
        // switch camera if scanner active
        if (scannerState.active && currentSubjectIdx === idx) {
          startScannerWithCamera(selId);
        } else {
          scannerState.cameraId = selId;
        }
      });
    }, 50);

    // initialize attendance table blank
    loadStudentTable(idx);
    attendanceCache[idx] = {}; // empty
  });

  // show history options as well
  populateHistorySelect();
}

// load student table for given subject index (status blank by default)
function loadStudentTable(idx) {
  const body = document.getElementById(`table-body-${idx}`);
  body.innerHTML = "";
  students.forEach(s => {
    const tr = document.createElement("tr");
    tr.id = `row-${idx}-${s.studentId}`;
    tr.innerHTML = `<td>${s.studentId}</td><td>${s.name}</td><td>${s.section}</td><td class="status"> </td><td class="time">—</td>`;
    body.appendChild(tr);
  });
  // set stats default
  document.getElementById(`total-${idx}`).innerText = students.length;
  document.getElementById(`present-${idx}`).innerText = "-";
  document.getElementById(`absent-${idx}`).innerText = "-";
}

// ---------- Scanner logic: single scanner instance reused ----------
async function populateCameraSelect(idx, refresh=false) {
  const select = document.getElementById(`camera-select-${idx}`);
  select.innerHTML = "<option>Loading...</option>";
  try {
    // cache camera list
    if (!cameraListCache || refresh) {
      cameraListCache = await Html5Qrcode.getCameras();
    }
    select.innerHTML = "";
    if (!cameraListCache || cameraListCache.length === 0) {
      const opt = document.createElement("option");
      opt.text = "No camera found";
      select.appendChild(opt);
      return;
    }
    cameraListCache.forEach((cam, i) => {
      const o = document.createElement("option");
      o.value = cam.id;
      o.text = cam.label || `Camera ${i+1}`;
      select.appendChild(o);
    });
    // set scannerState camera id if unset
    if (!scannerState.cameraId) scannerState.cameraId = cameraListCache[0].id;
    select.value = scannerState.cameraId;
  } catch (err) {
    console.error("Camera list error:", err);
    select.innerHTML = "<option>Error fetching cameras</option>";
  }
}

async function toggleScanner(idx) {
  if (scannerState.active && currentSubjectIdx === idx) {
    await stopScanner();
    return;
  }
  // if another subject's scanner is running, stop it first
  if (scannerState.active && currentSubjectIdx !== idx) {
    await stopScanner();
  }
  // start for this subject
  currentSubjectIdx = idx;
  await populateCameraSelect(idx);
  const select = document.getElementById(`camera-select-${idx}`);
  const camId = select.value || scannerState.cameraId || (cameraListCache && cameraListCache[0] && cameraListCache[0].id);
  scannerState.cameraId = camId;
  await startScannerWithCamera(camId, idx);
}

// stop scanner
async function stopScanner() {
  if (scannerState.instance) {
    try { await scannerState.instance.stop(); } catch(e){ /* ignore */ }
    try { scannerState.instance.clear(); } catch(e){ /* ignore */ }
  }
  scannerState.instance = null;
  scannerState.active = false;
  currentSubjectIdx = null;
  // hide results
}

// start scanner with specific camera id for subject idx
async function startScannerWithCamera(cameraId, idx) {
  // ensure we stop any previous instance
  await stopScanner();
  const readerElId = `qr-reader-${idx}`;
  const qrReader = new Html5Qrcode(readerElId, { formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ] });
  scannerState.instance = qrReader;
  scannerState.active = true;
  try {
    await qrReader.start(
      { deviceId: { exact: cameraId } },
      { fps: 10, qrbox: getQrBoxSize() },
      (decodedText) => {
        // try robust parsing
        handleDecoded(decodedText, idx);
      },
      (errorMsg) => {
        // scanning in progress — ignore
      }
    );
    showToast("Scanner started");
  } catch (err) {
    console.error("Camera start error:", err);
    showToast("Unable to start camera: " + (err.message || err));
    scannerState.active = false;
  }
}

// calculate a qrbox based on screen size for good mobile behavior
function getQrBoxSize() {
  const w = Math.min(window.innerWidth, 600);
  return Math.floor(w * 0.72);
}

// robust decode handler: supports JSON or fallback lookup by studentId pattern
async function handleDecoded(decodedText, idx) {
  // dedupe rapid scans by small timer per student (optional)
  let studentData = null;
  try {
    studentData = JSON.parse(decodedText);
  } catch (err) {
    // attempt to recover: find student id like M001 or F012
    const idMatch = decodedText.match(/\b[MF]\d{3}\b/i);
    if (idMatch) {
      const sId = idMatch[0].toUpperCase();
      const found = students.find(s => s.studentId.toUpperCase() === sId);
      if (found) studentData = { studentId: found.studentId, name: found.name, section: found.section };
    }
  }

  if (!studentData || !studentData.studentId) {
    console.warn("Invalid QR format", decodedText);
    showToast("Invalid QR — not recognized", 3000);
    return;
  }

  // Mark attendance
  await markAttendance(idx, studentData.studentId, studentData.name, studentData.section);
  // update UI scan result
  const resEl = document.getElementById(`qr-reader-results-${idx}`);
  if (resEl) {
    resEl.innerText = `✅ Scanned: ${studentData.name}`;
    setTimeout(()=> resEl.innerText = "", 5000);
  }
}

// ---------- Attendance saving / finalize / history ----------
async function markAttendance(idx, studentId, name, section) {
  // timeframe check removed (you asked to keep earlier) — if needed re-add
  const now = new Date();
  const date = now.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const time = now.toLocaleTimeString("en-GB");

  // write to Firestore under doc id subject_studentid_date to prevent duplicates
  const subject = subjects[idx];
  const docId = `${subject.replace(/[^\w]/g,"_")}_${studentId}_${date}`;
  try {
    await setDoc(doc(db, "attendance", docId), {
      subject,
      studentId,
      name,
      section,
      date,
      time,
      status: "Present",
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error("Error writing attendance:", e);
    showToast("Unable to save attendance");
  }

  // update local cache + UI
  attendanceCache[idx][studentId] = { studentId, name, section, date, time, status: "Present" };
  updateRowPresent(idx, studentId, date, time);
  updateStats(idx);
}

// update a single table row to present
function updateRowPresent(idx, studentId, date, time) {
  const row = document.getElementById(`row-${idx}-${studentId}`);
  if (!row) return;
  const statusCell = row.querySelector(".status");
  const timeCell = row.querySelector(".time");
  if (statusCell) {
    statusCell.innerText = "Present";
    statusCell.classList.add("present");
    statusCell.classList.remove("absent");
  }
  if (timeCell) timeCell.innerText = `${date} ${time}`;
}

// finalize: confirm modal triggers finalize
let pendingFinalizeIdx = null;
function openConfirmModalFor(idx) {
  pendingFinalizeIdx = idx;
  openConfirmModal();
}

// when confirmed, finalize logic
confirmFinalize.addEventListener("click", async () => {
  if (pendingFinalizeIdx === null) { closeConfirmModal(); return; }
  const idx = pendingFinalizeIdx;
  pendingFinalizeIdx = null;
  closeConfirmModal();
  await finalizeAttendanceFor(idx);
});

// finalize attendance: write Absent docs for missing students and ensure all saved
async function finalizeAttendanceFor(idx) {
  const subject = subjects[idx];
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");

  // for each student ensure a doc exists; if not, create Absent
  for (const s of students) {
    const docId = `${subject.replace(/[^\w]/g,"_")}_${s.studentId}_${date}`;
    try {
      const snap = await getDoc(doc(db, "attendance", docId));
      if (!snap.exists()) {
        // mark absent
        await setDoc(doc(db, "attendance", docId), {
          subject, studentId: s.studentId, name: s.name, section: s.section,
          date, time: "—", status: "Absent", timestamp: serverTimestamp()
        });
      } else {
        // doc exists and might already be Present — leave it
      }
    } catch (err) {
      console.error("Finalize write error:", err);
    }
  }

  // after finalize, update local view: load today's docs for subject
  await loadTodayAttendanceToUI(idx);
  showToast("Attendance finalized and saved to history");
}

// load today's attendance for a subject into UI and update stats
async function loadTodayAttendanceToUI(idx) {
  const subject = subjects[idx];
  const today = new Date().toLocaleDateString("en-GB");
  const q = query(collection(db, "attendance"), where("subject","==",subject), where("date","==",today));
  try {
    const snap = await getDocs(q);
    // clear table
    loadStudentTable(idx);
    attendanceCache[idx] = {};
    snap.forEach(docSnap => {
      const data = docSnap.data();
      attendanceCache[idx][data.studentId] = data;
      // update row
      const row = document.getElementById(`row-${idx}-${data.studentId}`);
      if (row) {
        const statusCell = row.querySelector(".status");
        const timeCell = row.querySelector(".time");
        if (statusCell) {
          statusCell.innerText = data.status || "—";
          statusCell.classList.toggle("present", data.status === "Present");
          statusCell.classList.toggle("absent", data.status === "Absent");
        }
        if (timeCell) timeCell.innerText = (data.date ? `${data.date} ${data.time || ""}` : "—");
      }
    });
    updateStats(idx);
  } catch (err) {
    console.error("Load today attendance error:", err);
  }
}

// update stats numbers
function updateStats(idx) {
  const cache = attendanceCache[idx] || {};
  const presentCount = Object.values(cache).filter(r => r.status === "Present").length;
  const absentCount = Object.values(cache).filter(r => r.status === "Absent").length;
  // If finalize not done, show '-' for present/absent
  // We'll decide that presence of any doc for today means finalized (safe enough)
  const subject = subjects[idx];
  const today = new Date().toLocaleDateString("en-GB");
  // If no docs exist in Firestore for today, show '-'
  // But we can approximate: if cache has any entries then show counts
  const showCounts = Object.keys(cache).length > 0;
  document.getElementById(`present-${idx}`).innerText = showCounts ? presentCount : "-";
  document.getElementById(`absent-${idx}`).innerText = showCounts ? absentCount : "-";
}

// ---------- History tab logic ----------
function populateHistorySelect() {
  historySelect.innerHTML = "";
  subjects.forEach((s, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.text = s;
    historySelect.appendChild(o);
  });
}

historyShow.addEventListener("click", async () => {
  if (!currentUser) { showToast("Please sign in to view history"); return; }
  const idx = parseInt(historySelect.value,10);
  const subject = subjects[idx];
  const dateVal = historyDate.value;
  if (!dateVal) { showToast("Select a date"); return; }
  // dateVal is YYYY-MM-DD; convert to DD/MM/YYYY
  const [yy,mm,dd] = dateVal.split("-");
  const formatted = `${dd}/${mm}/${yy}`;
  await loadHistoryFor(subject, formatted);
});

async function loadHistoryFor(subject, formattedDate) {
  historyResults.innerHTML = "";
  historySpinner.style.display = "inline-block";
  try {
    const q = query(collection(db, "attendance"), where("subject","==",subject), where("date","==",formattedDate));
    const snap = await getDocs(q);
    if (snap.empty) {
      historyResults.innerHTML = `<p>No records found for ${subject} on ${formattedDate}</p>`;
      historySpinner.style.display = "none";
      return;
    }
    // build table
    const table = document.createElement("table");
    table.className = "attendance-table";
    table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Section</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>`;
    const tbody = document.createElement("tbody");
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${d.studentId}</td><td>${d.name}</td><td>${d.section}</td><td>${d.date}</td><td>${d.time || "—"}</td><td>${d.status}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    historyResults.appendChild(table);
  } catch (err) {
    console.error("History fetch err:", err);
    historyResults.innerHTML = `<p>Error fetching history</p>`;
  } finally {
    historySpinner.style.display = "none";
  }
}

// ---------- CSV export patch (full student list, correct encoding) ----------
function exportAttendanceCSV(idx) {
  const subject = subjects[idx];
  const today = new Date().toLocaleDateString("en-GB");
  // Build rows using students array and check Firestore/local cache for statuses
  const rows = [];
  rows.push(["ID","Name","Section","Status","Time","Date"]);

  // Use attendanceCache if present; but to be safe, fetch today's records from Firestore sync
  (async () => {
    try {
      // query today's attendance for subject
      const q = query(collection(db, "attendance"), where("subject","==",subject), where("date","==",today));
      const snap = await getDocs(q);
      const recMap = {};
      snap.forEach(docSnap => {
        const d = docSnap.data();
        recMap[d.studentId] = d;
      });

      students.forEach(s => {
        const rec = recMap[s.studentId];
        const status = rec ? (rec.status || "Present") : "Absent";
        const time = rec ? (rec.time || "—") : "—";
        rows.push([s.studentId, s.name, s.section, status, time, today]);
      });

      // build CSV content (proper quoting)
      const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeSubj = subject.replace(/[^\w]/g, "_");
      a.download = `${safeSubj}_Attendance_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export CSV error:", err);
      showToast("Error exporting CSV");
    }
  })();
}

// ---------- Tab switching logic ----------
function switchToSubject(idx) {
  // turn off existing scanner
  stopScanner().catch(()=>{});
  // hide all tabs
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  // activate subject panel
  const id = `subject-${idx}`;
  const panel = document.getElementById(id);
  if (panel) panel.classList.add("active");
  currentSubjectIdx = idx;
  // highlight active nav button
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
  const subjectBtns = navButtons.filter(b => b.dataset.tab === id || (b.dataset.tab && b.dataset.tab.startsWith("subject-") && b.dataset.tab.endsWith(String(idx))));
  if (subjectBtns.length) subjectBtns[0].classList.add("active");
  // When switching, pre-populate camera selects for this idx
  populateCameraSelect(idx).catch(e=>console.error(e));
  // Load today's attendance for this subject (to show finalized if any)
  loadTodayAttendanceToUI(idx);
}

// history tab show/hide: only visible after login (we do via onAuthStateChanged). When clicked:
historyTabBtn.addEventListener("click", () => {
  // stop scanner
  stopScanner();
  // switch visibility
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.getElementById("history").classList.add("active");
  // hide active nav highlight and set history active
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  historyTabBtn.classList.add("active");
});

// when home clicked
document.querySelectorAll('.nav-btn[data-tab="home"]').forEach(b => {
  b.addEventListener('click', () => {
    stopScanner();
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.getElementById("home").classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(n => n.classList.remove("active"));
    b.classList.add("active");
  });
});

// ---------- Utility: ensure camera stops and only single instance ----------
window.addEventListener("beforeunload", () => {
  if (scannerState.instance) {
    try { scannerState.instance.stop(); } catch(e) {}
  }
});

// ---------- Initialization ----------
(function init() {
  // build UI
  buildSidebarAndPanels();

  // add small listeners
  document.getElementById("qr-logo").addEventListener("error", ()=>{/* silent */});
  document.getElementById("home-logo").addEventListener("error", ()=>{/* silent */});

  // make history tab hidden on load if user not logged (handled by auth)
  if (!auth.currentUser) {
    loginFrost.setAttribute("data-open","true");
    loginFrost.setAttribute("aria-hidden","false");
  } else {
    // signed in already
    loginFrost.setAttribute("data-open","false");
    loginFrost.setAttribute("aria-hidden","true");
  }

  // Attach clicks to nav items (home already wired)
  // make sidebar scrollable and allow keyboard toggle
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // stop scanner and close modal
      stopScanner();
      closeConfirmModal();
    }
  });

  // show logout under user
  logoutBtn.style.display = auth.currentUser ? "inline-block" : "none";

  console.log("App loaded. Subjects:", subjects);
})();

