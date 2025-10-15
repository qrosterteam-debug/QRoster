// app.js (complete)
// ✅ Import Firebase SDK from CDN (keeps your config)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
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

import { students } from "./students.js"; // keep your student list file unchanged

// ✅ Firebase Config (unchanged)
const firebaseConfig = {
  apiKey: "AIzaSyDdTrOmPZzwW4LtMNQvPSSMNbz-r-yhNtY",
  authDomain: "qroster-4a631.firebaseapp.com",
  projectId: "qroster-4a631",
  storageBucket: "qroster-4a631.firebasestorage.app",
  messagingSenderId: "961257265744",
  appId: "1:961257265744:web:9f709bb6b6df541c8b8f55",
  measurementId: "G-63MXS6BHMK"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// ---------- UI helpers ----------
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

// DOM references
const navSubjects = document.getElementById("nav-subjects");
const subjectContainers = document.getElementById("subject-containers");
const historySubjectSelect = document.getElementById("history-subject-select");
const historyDateInput = document.getElementById("history-date");
const historyResults = document.getElementById("history-results");
const todayLabel = document.getElementById("today-label");
const toastEl = document.getElementById("toast");

// login buttons
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const userInfoDiv = document.getElementById("user-info");

// modal
const confirmModal = document.getElementById("confirm-modal");
const confirmYes = document.getElementById("confirm-yes");
const confirmNo = document.getElementById("confirm-no");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");

// topbar toggle
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebar = document.getElementById("sidebar");
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

// show today's date
function setTodayLabel() {
  const d = new Date();
  todayLabel.innerText = d.toLocaleDateString();
}
setTodayLabel();

// Toast helper
let toastTimer = null;
function showToast(msg, ms = 5000) {
  clearTimeout(toastTimer);
  toastEl.innerText = msg;
  toastEl.style.display = "block";
  toastTimer = setTimeout(() => {
    toastEl.style.display = "none";
  }, ms);
}

// Simple JSON repair helper (fix common unquoted-key issue)
function tryParseScannedJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // try to repair unquoted keys like {studentid:"M001",...}
    try {
      const repaired = text.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
      return JSON.parse(repaired);
    } catch (e2) {
      // try minor fixes (replace single quotes)
      try {
        const s2 = text.replace(/'/g, '"');
        const repaired2 = s2.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
        return JSON.parse(repaired2);
      } catch (e3) {
        return null;
      }
    }
  }
}

// ---------- Build sidebar and subject containers ----------
function buildUI() {
  // add subject nav buttons
  subjects.forEach((subj, idx) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.subject = `subject-${idx}`;
    btn.innerHTML = `📚 ${subj}`;
    navSubjects.appendChild(btn);

    // container for subject
    const container = document.createElement("section");
    container.id = `subject-${idx}`;
    container.className = "tab-content subject-panel";
    container.innerHTML = `
      <div class="subject-header">
        <div style="display:flex;flex-direction:column;">
          <h2>${subj}</h2>
          <div class="stats">
            <div class="stat"><div>Total</div><div class="big" id="total-${idx}">${students.length}</div></div>
            <div class="stat"><div>Present</div><div class="big" id="present-${idx}">0</div></div>
            <div class="stat"><div>Absent</div><div class="big" id="absent-${idx}">${students.length}</div></div>
            <div class="stat"><div>Status</div><div class="big" id="status-${idx}">Not finalized</div></div>
          </div>
        </div>
        <div class="controls">
          <button class="btn" id="finalize-${idx}">Finalize Attendance</button>
          <button class="btn secondary" id="export-${idx}">Export CSV</button>
        </div>
      </div>

      <div class="scanner-wrap">
        <div class="scanner-box scanner-inner">
          <h4>📷 QR Code Scanner</h4>
          <div class="scanner-canvas-wrap" id="canvas-wrap-${idx}">
            <div id="qr-reader-${idx}" style="width:100%;height:auto;background:#000;"></div>
            <div class="scanner-overlay">
              <div class="scanner-frame" id="scanner-frame-${idx}">
                <div class="scanner-corners"></div>
              </div>
            </div>
          </div>

          <div class="camera-controls" id="camera-controls-${idx}">
            <label>Camera</label>
            <select id="camera-select-${idx}"></select>
            <button class="btn secondary" id="start-${idx}">Start Scanner</button>
            <button class="btn ghost" id="stop-${idx}" style="display:none;">Stop Scanner</button>
            <div id="scanner-status-${idx}" style="margin-left:8px;color:#0b3b84;font-weight:600;">Scanner stopped</div>
          </div>
        </div>

        <div style="flex:1">
          <h4>👩‍🎓 Attendance List</h4>
          <table class="attendance-table" id="table-${idx}">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Section</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody id="table-body-${idx}"></tbody>
          </table>
        </div>
      </div>
    `;
    subjectContainers.appendChild(container);
  });

  // add Attendance History tab nav
  const histBtn = document.createElement("button");
  histBtn.className = "nav-btn";
  histBtn.dataset.subject = "history";
  histBtn.innerHTML = "📜 Attendance History";
  navSubjects.appendChild(histBtn);

  // populate history subject select
  subjects.forEach((s, i) => {
    const opt = document.createElement("option");
    opt.value = `subject-${i}`;
    opt.innerText = s;
    historySubjectSelect.appendChild(opt);
  });
}

buildUI();

// ---------- Attendance table population ----------
function populateAttendanceTables() {
  subjects.forEach((_, idx) => {
    const tbody = document.getElementById(`table-body-${idx}`);
    tbody.innerHTML = "";
    students.forEach(s => {
      const row = document.createElement("tr");
      row.id = `${idx}-${s.studentId}`; // include subject idx to separate per-subject rows
      row.innerHTML = `
        <td>${s.studentId}</td>
        <td>${s.name}</td>
        <td>${s.section}</td>
        <td class="status">—</td>
        <td class="time">—</td>
      `;
      tbody.appendChild(row);
    });

    // initial counts
    document.getElementById(`total-${idx}`).innerText = students.length;
    document.getElementById(`present-${idx}`).innerText = 0;
    document.getElementById(`absent-${idx}`).innerText = students.length;
    document.getElementById(`status-${idx}`).innerText = "Not finalized";
  });
}
populateAttendanceTables();

// ---------- Tab switching ----------
function hideAllTabs() {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
}
navSubjects.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (!btn) return;
  const target = btn.dataset.subject;
  if (!target) return;
  hideAllTabs();

  // set active nav class
  btn.classList.add("active");

  if (target === "home") {
    document.getElementById("home").classList.add("active");
    stopActiveScanner(); // ensure scanner stopped
    return;
  } else if (target === "history") {
    document.getElementById("history").classList.add("active");
    stopActiveScanner();
    return;
  } else {
    // subject tab
    const el = document.getElementById(target);
    if (el) el.classList.add("active");

    // init scanner for subject index
    const match = target.match(/subject-(\d+)/);
    if (match) {
      const idx = parseInt(match[1], 10);
      // start enumerating cameras and ready scanner controls (but do NOT auto-start)
      prepareScannerControlsForSubject(idx);
    }
  }
});

// ---------- Scanner management ----------
let activeScanner = {
  idx: null,
  qrReader: null,
  currentCameraId: null,
  running: false
};

// safe stop
async function stopActiveScanner() {
  if (activeScanner.qrReader) {
    try {
      await activeScanner.qrReader.stop();
    } catch (e) {
      // ignore
    }
    try { activeScanner.qrReader.clear(); } catch(e) {}
    activeScanner.qrReader = null;
    activeScanner.running = false;
    if (activeScanner.idx !== null) {
      const st = document.getElementById(`scanner-status-${activeScanner.idx}`);
      if (st) st.innerText = "Scanner stopped";
      const startBtn = document.getElementById(`start-${activeScanner.idx}`);
      const stopBtn = document.getElementById(`stop-${activeScanner.idx}`);
      if (startBtn) startBtn.style.display = "inline-block";
      if (stopBtn) stopBtn.style.display = "none";
    }
    activeScanner.idx = null;
  }
}

// enumerate cameras and populate select
async function enumerateCamerasForSubject(idx) {
  const select = document.getElementById(`camera-select-${idx}`);
  if (!select) return;
  select.innerHTML = "";
  try {
    const cams = await Html5Qrcode.getCameras();
    if (!cams || !cams.length) {
      const op = document.createElement("option");
      op.value = "";
      op.innerText = "No camera found";
      select.appendChild(op);
      return;
    }
    // dedupe and list
    const seen = new Set();
    cams.forEach((c, i) => {
      if (seen.has(c.id)) return;
      seen.add(c.id);
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.innerText = (c.label || `camera ${i}, id ${c.id}`);
      select.appendChild(opt);
    });
    // set first as selected
    if (select.options.length > 0) select.selectedIndex = 0;
  } catch (err) {
    console.error("Camera enumeration error:", err);
    const op = document.createElement("option");
    op.value = "";
    op.innerText = "Error fetching cameras";
    select.appendChild(op);
  }
}

// prepare controls (ensures events are attached only once)
const preparedSubjects = new Set();
function prepareScannerControlsForSubject(idx) {
  // avoid preparing multiple times
  if (preparedSubjects.has(idx)) {
    // re-enumerate cameras each time subject opened to refresh options
    enumerateCamerasForSubject(idx);
    return;
  }
  preparedSubjects.add(idx);

  // populate camera select
  enumerateCamerasForSubject(idx);

  const startBtn = document.getElementById(`start-${idx}`);
  const stopBtn = document.getElementById(`stop-${idx}`);
  const select = document.getElementById(`camera-select-${idx}`);

  startBtn.addEventListener("click", async () => {
    // stop previous scanner (if different subject)
    if (activeScanner.idx !== null && activeScanner.idx !== idx) {
      await stopActiveScanner();
    }

    // if already running for this subject, ignore
    if (activeScanner.running && activeScanner.idx === idx) return;

    const cameraId = select.value;
    if (!cameraId) {
      showToast("No camera selected");
      return;
    }

    // new reader
    const qrRegionId = `qr-reader-${idx}`;
    const qrReader = new Html5Qrcode(qrRegionId);

    try {
      await qrReader.start(
        { deviceId: { exact: cameraId } },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // handle decode
          handleDecodedForSubject(idx, decodedText);
        },
        (error) => {
          // optional scanning error
        }
      );

      // set active scanner state
      activeScanner.idx = idx;
      activeScanner.qrReader = qrReader;
      activeScanner.currentCameraId = cameraId;
      activeScanner.running = true;

      // UI updates
      document.getElementById(`scanner-status-${idx}`).innerText = "Scanner running";
      if (startBtn) startBtn.style.display = "none";
      if (stopBtn) stopBtn.style.display = "inline-block";

      showToast("Scanner started", 2000);
    } catch (err) {
      console.error("Camera start error:", err);
      showToast("Could not start camera (check permissions or HTTPS).");
      try { qrReader.clear(); } catch (e) {}
    }
  });

  stopBtn.addEventListener("click", async () => {
    if (activeScanner.idx === idx) {
      await stopActiveScanner();
    }
  });
}

// decoding handler
async function handleDecodedForSubject(idx, decodedText) {
  if (!decodedText) return;
  // try parse
  let parsed = tryParseScannedJson(decodedText);
  if (!parsed) {
    console.warn("Invalid QR format", decodedText);
    showToast("Invalid QR format");
    return;
  }

  // normalize keys (accept studentid or studentId, name, section)
  const studentId = parsed.studentId || parsed.studentid || parsed.id || parsed.student_id;
  const name = parsed.name || parsed.fullname || parsed.studentName;
  const section = parsed.section || parsed.class || parsed.sectionName;

  if (!studentId) {
    showToast("QR missing student ID");
    return;
  }

  // mark attendance in UI for this subject
  const rowId = `${idx}-${studentId}`;
  const row = document.getElementById(rowId);
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");
  const time = now.toLocaleTimeString("en-GB");

  if (row) {
    const statusCell = row.querySelector(".status");
    const timeCell = row.querySelector(".time");
    if (statusCell && timeCell) {
      // if already present, ignore duplicate scans
      if (statusCell.innerText === "Present") {
        showToast(`${name || studentId} already marked`);
        return;
      }
      statusCell.innerText = "Present";
      statusCell.classList.add("present");
      statusCell.classList.remove("absent");
      timeCell.innerText = time;
    }
  } else {
    // row not found (maybe not in this subject list)
    showToast(`Student ${studentId} not found in this subject`);
    return;
  }

  // Update counters
  updateSubjectCounts(idx);

  // Auto save to Firestore attendance collection (per subject and date)
  // Document ID pattern: <subjectKey>_<studentId>_<date>
  try {
    const subjectKey = subjects[idx].replace(/\s+/g, "_");
    const docRef = doc(db, "attendance", `${subjectKey}_${studentId}_${date}`);
    await setDoc(docRef, {
      studentId,
      name,
      section,
      date,
      time,
      subject: subjects[idx],
      timestamp: serverTimestamp(),
      status: "Present"
    });
  } catch (err) {
    console.error("Error saving attendance to Firestore:", err);
  }

  // quick success toast
  showToast(`Marked Present: ${name || studentId}`, 3000);
}

// update present/absent counters for a subject
function updateSubjectCounts(idx) {
  const tbody = document.getElementById(`table-body-${idx}`);
  const total = students.length;
  let present = 0;
  tbody.querySelectorAll("tr").forEach(tr => {
    const st = tr.querySelector(".status").innerText;
    if (st && st.trim().toLowerCase() === "present") present++;
  });
  const absent = total - present;
  document.getElementById(`present-${idx}`).innerText = present;
  document.getElementById(`absent-${idx}`).innerText = absent;
}

// finalize attendance (with modal confirmation)
function attachFinalizeHandlers() {
  subjects.forEach((_, idx) => {
    const finalizeBtn = document.getElementById(`finalize-${idx}`);
    const exportBtn = document.getElementById(`export-${idx}`);
    finalizeBtn.addEventListener("click", () => {
      confirmTitle.innerText = "Finalize Attendance";
      confirmMessage.innerText = `Finalize attendance for ${subjects[idx]}? This will mark remaining students Absent for today.`;
      confirmModal.setAttribute("aria-hidden", "false");

      confirmYes.onclick = async () => {
        confirmModal.setAttribute("aria-hidden", "true");
        await finalizeAttendanceFor(idx);
      };
      confirmNo.onclick = () => {
        confirmModal.setAttribute("aria-hidden", "true");
      };
    });

    exportBtn.addEventListener("click", () => {
      exportAttendanceCSV(idx);
    });
  });
}

// finalize: mark remaining students Absent, save to Firestore
async function finalizeAttendanceFor(idx) {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");
  const subjectKey = subjects[idx].replace(/\s+/g, "_");
  const tbody = document.getElementById(`table-body-${idx}`);
  for (const tr of Array.from(tbody.querySelectorAll("tr"))) {
    const id = tr.id.split("-").slice(1).join("-");
    const statusCell = tr.querySelector(".status");
    const timeCell = tr.querySelector(".time");
    if (!statusCell) continue;
    if (statusCell.innerText !== "Present") {
      // mark Absent
      statusCell.innerText = "Absent";
      statusCell.classList.add("absent");
      statusCell.classList.remove("present");
      if (timeCell) timeCell.innerText = "—";

      // save to Firestore
      try {
        await setDoc(doc(db, "attendance", `${subjectKey}_${id}_${date}`), {
          studentId: id,
          name: tr.children[1].innerText,
          section: tr.children[2].innerText,
          date,
          time: "—",
          subject: subjects[idx],
          timestamp: serverTimestamp(),
          status: "Absent"
        });
      } catch (err) {
        console.error("Error saving absent record:", err);
      }
    }
  }

  document.getElementById(`status-${idx}`).innerText = "Finalized";
  updateSubjectCounts(idx);
  showToast("Attendance finalized and saved.", 4000);
}

// export CSV helper
function exportAttendanceCSV(idx) {
  const rows = [];
  const tbody = document.getElementById(`table-body-${idx}`);
  rows.push(["ID", "Name", "Section", "Status", "Time", "Date"]);
  const today = new Date().toLocaleDateString("en-GB");
  tbody.querySelectorAll("tr").forEach(tr => {
    const id = tr.children[0].innerText;
    const name = tr.children[1].innerText;
    const section = tr.children[2].innerText;
    const status = tr.children[3].innerText;
    const time = tr.children[4].innerText;
    rows.push([id, name, section, status, time, today]);
  });

  // convert to CSV
  const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeSubj = subjects[idx].replace(/[^\w]/g, "_");
  a.download = `${safeSubj}_Attendance_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- History tab (basic Firestore read for subject+date) ----------
document.getElementById("history-refresh").addEventListener("click", async () => {
  const subjectKey = document.getElementById("history-subject-select").value;
  const dateVal = historyDateInput.value;
  if (!subjectKey || !dateVal) {
    showToast("Select subject and date.");
    return;
  }
  // convert date to dd/mm/yyyy (en-GB)
  const [y, m, d] = dateVal.split("-");
  const formatted = `${d}/${m}/${y}`;
  // query Firestore attendance where subject==... and date==...
  try {
    const q = query(collection(db, "attendance"), where("subject", "==", subjects[parseInt(subjectKey.split("-")[1],10)]), where("date","==", formatted), orderBy("time","asc"));
    const snaps = await getDocs(q);
    if (snaps.empty) {
      historyResults.innerHTML = "<p>No records found.</p>";
      return;
    }
    const table = document.createElement("table");
    table.className = "attendance-table";
    table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Section</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>`;
    const tb = document.createElement("tbody");
    snaps.forEach(snap => {
      const data = snap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${data.studentId||""}</td><td>${data.name||""}</td><td>${data.section||""}</td><td>${data.date||""}</td><td>${data.time||""}</td><td>${data.status||""}</td>`;
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    historyResults.innerHTML = "";
    historyResults.appendChild(table);
  } catch (err) {
    console.error("History fetch err:", err);
    showToast("Error fetching history (see console).");
  }
});

// ---------- Login / Auth ----------
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
    // UI updates handled in onAuthStateChanged
  } catch (err) {
    console.error("Login error:", err);
    showToast("Login failed: " + (err.message || err));
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("Logged out");
  } catch (err) {
    console.error("Logout error:", err);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    userInfoDiv.innerText = `✅ Logged in as: ${user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    // optionally start default subject camera enumeration
    // prepareScannerControlsForSubject(0);
  } else {
    userInfoDiv.innerText = "Not signed in";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    // stop any active scanner
    stopActiveScanner();
  }
});

// ---------- Prevent duplicate scanner on fast tab spam ----------
let tabSwitchLock = false;
navSubjects.addEventListener("click", async (e) => {
  if (tabSwitchLock) return;
  tabSwitchLock = true;
  setTimeout(() => tabSwitchLock = false, 250); // short debounce
});

// ---------- finalize/export attach ----------
attachFinalizeHandlers();

// ---------- Init: show home and set history date default ----------
document.getElementById("home").classList.add("active");
const todayISO = new Date().toISOString().slice(0,10);
historyDateInput.value = todayISO;

// ensure camera controls are enumerated for first subject when clicked
// Also make sure to re-enumerate when nav button is clicked for subject
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const subject = btn.dataset.subject;
    if (!subject) return;
    const match = (subject.match(/subject-(\d+)/) || []);
    if (match[1]) {
      const idx = parseInt(match[1], 10);
      // small delay to allow tab to become active visually
      setTimeout(() => enumerateCamerasForSubject(idx), 120);
    }
  });
});

// ensure cleaning up scanner when leaving tab or closing page
window.addEventListener('beforeunload', async () => {
  await stopActiveScanner();
});

// helper: ensure scanner uses desktop-like layout on mobile by forcing viewport scale (optional)
// NOTE: we avoid changing browser settings; keep responsive CSS only

// Add small UX: clicking home logo resets to home
document.getElementById('home-logo').addEventListener('click', () => {
  document.querySelector('.nav-btn[data-subject="home"]').click();
});

// Done
console.log("App loaded. Subjects:", subjects);
