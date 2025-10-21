// app.js (complete)
// Uses firebase CDN modules and html5-qrcode
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, setDoc, getDoc, getDocs,
  query, where, orderBy, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { students } from "./students.js"; // keep unchanged

/* ======================
   Firebase config (unchanged)
   ====================== */
const firebaseConfig = {
  apiKey: "AIzaSyDdTrOmPZzwW4LtMNQvPSSMNbz-r-yhNtY",
  authDomain: "qroster-4a631.firebaseapp.com",
  projectId: "qroster-4a631",
  storageBucket: "qroster-4a631.firebasestorage.app",
  messagingSenderId: "961257265744",
  appId: "1:961257265744:web:9f709bb6b6df541c8b8f55",
  measurementId: "G-63MXS6BHMK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

/* ======================
   UI references
   ====================== */
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const navList = document.getElementById("navList");
const subjectListEl = document.getElementById("subjectList");
const subjectPanelsEl = document.getElementById("subjectPanels");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const userInfoEl = document.getElementById("user-info");
const toastEl = document.getElementById("toast");
const confirmModal = document.getElementById("confirmModal");
const confirmFinalizeBtn = document.getElementById("confirmFinalize");
const cancelFinalizeBtn = document.getElementById("cancelFinalize");
const historySection = document.getElementById("history");
const historySubjectSelect = document.getElementById("historySubjectSelect");
const historyDateInput = document.getElementById("historyDate");
const historyLoadBtn = document.getElementById("historyLoad");
const historyResults = document.getElementById("historyResults");

/* ======================
   Subjects (8) - Use exact strings you specified
   Keep these names unchanged (per your request)
   ====================== */
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

/* ======================
   State
   ====================== */
let activeSubjectIdx = null;
const qrReaders = {}; // map subjectIdx -> Html5Qrcode instance
const cameraOptions = {}; // subjectIdx -> array of cameras
const runningScannerFor = { idx: null }; // which subject idx is running
const attendanceState = {}; // per subject idx -> map studentId -> {status,time}
subjects.forEach((s, i) => attendanceState[i] = {}); // init

/* helper: show toast for 5s */
function showToast(msg, duration = 5000) {
  toastEl.innerText = msg;
  toastEl.style.display = "block";
  toastEl.style.opacity = "1";
  setTimeout(() => {
    toastEl.style.opacity = "0";
    setTimeout(()=> toastEl.style.display = "none", 300);
  }, duration);
}

/* toggle sidebar */
menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

/* ======================
   Build sidebar subject buttons and panels
   ====================== */
function buildUI() {
  // populate sidebar subject buttons
  subjects.forEach((subj, idx) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.tab = `subject-${idx}`;
    btn.innerHTML = `📚 ${subj}`;
    btn.addEventListener("click", () => activateSubject(idx));
    subjectListEl.appendChild(btn);

    // create corresponding subject panel
    const panel = document.createElement("section");
    panel.id = `subject-${idx}`;
    panel.className = "tab-content";
    panel.innerHTML = `
      <div class="subject-panel">
        <div class="subject-header">
          <h2>🎓 ${subj}</h2>
          <div class="controls">
            <div class="stats">
              <div class="stat"><div>Total</div><div class="big" id="total-${idx}">${students.length}</div></div>
              <div class="stat"><div>Present</div><div class="big" id="present-${idx}">—</div></div>
              <div class="stat"><div>Absent</div><div class="big" id="absent-${idx}">—</div></div>
              <div class="stat"><div>Status</div><div class="big" id="status-${idx}">Not finalized</div></div>
            </div>
            <div class="controls">
              <button id="finalize-${idx}" class="btn">Finalize Attendance</button>
              <button id="export-${idx}" class="btn secondary">Export CSV</button>
            </div>
          </div>
        </div>

        <div class="scanner-wrap">
          <div class="scanner-box">
            <h4>📷 QR Code Scanner</h4>
            <div class="scanner-frame" id="scanner-frame-${idx}">
              <div id="qr-reader-${idx}" style="width:100%;height:100%;"></div>
            </div>
            <div class="camera-row">
              <label class="small-muted">Camera</label>
              <select id="camera-select-${idx}"></select>
              <button id="start-btn-${idx}" class="btn secondary">Start Scanner</button>
              <button id="stop-btn-${idx}" class="btn secondary" style="display:none">Stop</button>
            </div>
            <div id="scanner-status-${idx}" class="small-muted" style="margin-top:8px">Scanner stopped</div>
          </div>

          <div style="flex:1;">
            <h4>👩‍🎓 Attendance List</h4>
            <table class="attendance-table" id="table-${idx}">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Section</th><th>Status</th><th>Time</th></tr>
              </thead>
              <tbody id="table-body-${idx}"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    subjectPanelsEl.appendChild(panel);

    // finalize/export events
    panel.querySelector(`#finalize-${idx}`).addEventListener("click", () => {
      // open confirm modal; remember idx for finalize
      confirmModal.dataset.finalizeIdx = idx;
      openModal(confirmModal);
    });
    panel.querySelector(`#export-${idx}`).addEventListener("click", () => exportAttendanceCSV(idx));
  });

  // build history subject select
  historySubjectSelect.innerHTML = subjects.map((s, i) => `<option value="${i}">${s}</option>`).join("");
}

/* ======================
   Modal controls
   ====================== */
function openModal(mod) {
  mod.setAttribute("aria-hidden", "false");
}
function closeModal(mod) {
  mod.setAttribute("aria-hidden", "true");
}
cancelFinalizeBtn.addEventListener("click", () => closeModal(confirmModal));

confirmFinalizeBtn.addEventListener("click", async () => {
  const idx = parseInt(confirmModal.dataset.finalizeIdx, 10);
  closeModal(confirmModal);
  await finalizeAttendanceForSubject(idx);
});

/* ======================
   Activate subject: show panel and stop other scanners
   ====================== */
function activateSubject(idx) {
  // deactivate nav buttons
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  // find the nav btn corresponding
  const btns = Array.from(document.querySelectorAll(".nav-btn"));
  const subjBtn = btns.find(b => b.dataset.tab === `subject-${idx}`);
  if(subjBtn) subjBtn.classList.add("active");

  // show only the chosen tab; hide home + history
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  const panel = document.getElementById(`subject-${idx}`);
  panel.classList.add("active");

  // stop running scanner on other subject, if any
  if (runningScannerFor.idx !== null && runningScannerFor.idx !== idx) {
    stopScanner(runningScannerFor.idx).catch(()=>{});
  }

  activeSubjectIdx = idx;

  // initialize table and camera list (idempotent)
  renderAttendanceTable(idx);
  ensureCamerasForSubject(idx).then(() => {
    // if there is at least one camera, populate select
    populateCameraSelect(idx);
  }).catch(err => {
    console.error("Camera init err:", err);
  });

  // set nav active for the button
  // scroll subject into view in sidebar
  const sidebarBtn = subjectListEl.children[idx];
  if (sidebarBtn) sidebarBtn.scrollIntoView({block:"center"});
}

/* ======================
   Render attendance table for a subject
   ====================== */
function renderAttendanceTable(idx) {
  const tbody = document.getElementById(`table-body-${idx}`);
  tbody.innerHTML = "";
  students.forEach(s => {
    const tr = document.createElement("tr");
    tr.id = `row-${idx}-${s.studentId}`;
    const statusObj = attendanceState[idx][s.studentId] || { status: "—", time: "—" };
    tr.innerHTML = `
      <td>${s.studentId}</td>
      <td>${s.name}</td>
      <td>${s.section}</td>
      <td class="status-cell">${statusObj.status}</td>
      <td class="time-cell">${statusObj.time}</td>
    `;
    tbody.appendChild(tr);
  });
  updateStats(idx);
}

/* ======================
   Update stats block (total/present/absent)
   - For display logic: before finalize show '-' for present/absent.
   - After finalize show numbers.
   ====================== */
function updateStats(idx, finalized=false) {
  const totalEl = document.getElementById(`total-${idx}`);
  const presentEl = document.getElementById(`present-${idx}`);
  const absentEl = document.getElementById(`absent-${idx}`);
  const statusEl = document.getElementById(`status-${idx}`);

  const state = attendanceState[idx];
  const presentCount = Object.values(state).filter(v => v.status === "Present").length;
  const absentCount = Object.values(state).filter(v => v.status === "Absent").length;

  totalEl.innerText = students.length;
  if (!finalized) {
    // per your instruction: show '-' until finalized
    presentEl.innerText = presentCount > 0 ? presentCount : "—";
    absentEl.innerText = absentCount > 0 ? absentCount : "—";
    statusEl.innerText = "Not finalized";
  } else {
    presentEl.innerText = presentCount;
    absentEl.innerText = absentCount;
    statusEl.innerText = "Finalized";
  }
}

/* ======================
   Camera handling & scanner start/stop per subject
   - Prevent multiple list items / duplicate camera entries
   - Ensure only one active html5-qrcode instance per subject
   ====================== */
async function ensureCamerasForSubject(idx) {
  try {
    const cams = await Html5Qrcode.getCameras();
    cameraOptions[idx] = cams || [];
    return cameraOptions[idx];
  } catch (err) {
    console.error("getCameras err", err);
    cameraOptions[idx] = [];
    return [];
  }
}

function populateCameraSelect(idx) {
  const sel = document.getElementById(`camera-select-${idx}`);
  sel.innerHTML = ""; // clear duplicates
  const cams = cameraOptions[idx] || [];
  if (!cams.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.text = "No cameras found";
    sel.appendChild(opt);
    return;
  }
  cams.forEach((c, i) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.text = c.label || `camera ${i}`;
    sel.appendChild(opt);
  });

  // attach start/stop handlers (idempotent)
  const startBtn = document.getElementById(`start-btn-${idx}`);
  const stopBtn = document.getElementById(`stop-btn-${idx}`);
  startBtn.onclick = () => startScannerWithCamera(idx, sel.value || cameraOptions[idx][0].id);
  stopBtn.onclick = () => stopScanner(idx);
}

/* start scanner for subject idx using specific camera id */
async function startScannerWithCamera(idx, cameraId) {
  // if already running for this idx, restart to avoid duplicates
  if (qrReaders[idx]) {
    try { await qrReaders[idx].stop(); } catch(e) {}
    qrReaders[idx] = null;
  }

  const readerId = `qr-reader-${idx}`;
  const qrReader = new Html5Qrcode(readerId, { verbose: false });
  qrReaders[idx] = qrReader;

  const config = { fps: 10, qrbox: function(viewfinderWidth, viewfinderHeight) {
    // square box that scales with container, not larger than 80% of smaller dimension
    const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.65;
    return { width: size, height: size };
  }};

  const onScanSuccess = (decodedText, decodedResult) => {
    // parsed QR expected to be JSON like {"studentid":"M001","name":"BACUS, ...","section":"12-Nickel"}
    try {
      // try to be fault tolerant: allow both "studentId" or "studentid"
      const parsed = JSON.parse(decodedText);
      const sid = parsed.studentid || parsed.studentId || parsed.id;
      const name = parsed.name || "";
      const section = parsed.section || "";
      if (!sid) {
        showToast("Invalid QR: missing student id");
        return;
      }
      markPresentLocal(idx, sid, name, section);
      const resText = `Scanned: ${sid} ${name || ""}`;
      document.getElementById(`scanner-status-${idx}`).innerText = resText;
      showToast(resText, 3000);
    } catch (err) {
      console.error("Invalid QR format", err);
      showToast("Invalid QR format");
    }
  };

  const onScanFailure = (error) => {
    // ignore frequent scan failure messages
    // console.warn("scan fail", error);
  };

  try {
    await qrReader.start({ deviceId: { exact: cameraId } }, config, onScanSuccess, onScanFailure);
    runningScannerFor.idx = idx;
    document.getElementById(`scanner-status-${idx}`).innerText = "Scanner running";
    document.getElementById(`start-btn-${idx}`).style.display = "none";
    document.getElementById(`stop-btn-${idx}`).style.display = "inline-block";
  } catch (err) {
    console.error("Camera start error:", err);
    showToast("Camera start error: " + (err.message || err));
  }
}

/* stop scanner for subject */
async function stopScanner(idx) {
  const reader = qrReaders[idx];
  if (reader) {
    try { await reader.stop(); } catch(e) {}
    try { await reader.clear(); } catch(e) {}
  }
  qrReaders[idx] = null;
  if (runningScannerFor.idx === idx) runningScannerFor.idx = null;
  document.getElementById(`scanner-status-${idx}`).innerText = "Scanner stopped";
  document.getElementById(`start-btn-${idx}`).style.display = "inline-block";
  document.getElementById(`stop-btn-${idx}`).style.display = "none";
}

/* ======================
   Mark present locally (not finalized)
   - Update attendanceState and UI
   - If already present, ignore duplicate
   ====================== */
function markPresentLocal(idx, studentId, name, section) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-GB");
  // set in attendanceState
  attendanceState[idx][studentId] = { status: "Present", time: timeStr };

  // update row in table
  const row = document.getElementById(`row-${idx}-${studentId}`);
  if (row) {
    row.querySelector(".status-cell").innerText = "Present";
    row.querySelector(".status-cell").classList.add("present");
    row.querySelector(".time-cell").innerText = timeStr;
  }

  // update stats display (not finalized)
  updateStats(idx, false);
}

/* ======================
   Finalize attendance for subject: mark absent and save all records to Firestore
   ====================== */
async function finalizeAttendanceForSubject(idx) {
  // stop scanner first
  try { await stopScanner(idx); } catch(e) {}

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB");

  // Build records: Present for those scanned, Absent for others
  const records = [];
  students.forEach(s => {
    const rec = attendanceState[idx][s.studentId];
    if (rec && rec.status === "Present") {
      records.push({
        studentId: s.studentId,
        name: s.name,
        section: s.section,
        subject: subjects[idx],
        date: dateStr,
        time: rec.time,
        status: "Present",
        timestamp: serverTimestamp()
      });
    } else {
      // absent
      records.push({
        studentId: s.studentId,
        name: s.name,
        section: s.section,
        subject: subjects[idx],
        date: dateStr,
        time: "—",
        status: "Absent",
        timestamp: serverTimestamp()
      });
      // update UI state
      attendanceState[idx][s.studentId] = { status: "Absent", time: "—" };
    }
  });

  // Save all records to Firestore under collection "attendance"
  try {
    const batchPromises = records.map(r => {
      const docId = `${r.subject.replace(/\s+/g, "_")}_${r.studentId}_${r.date}`;
      return setDoc(doc(db, "attendance", docId), r);
    });
    await Promise.all(batchPromises);
    showToast("Attendance finalized and saved to history", 4000);
  } catch (err) {
    console.error("Error finalizing:", err);
    showToast("Error saving to Firestore: " + err.message);
  }

  // Update UI as finalized
  renderAttendanceTable(idx);
  updateStats(idx, true);
}

/* ======================
   CSV export (fixed & robust)
   ====================== */
function exportAttendanceCSV(idx) {
  const rows = [];
  const tbody = document.getElementById(`table-body-${idx}`);
  rows.push(["ID", "Name", "Section", "Status", "Time", "Date"]);
  const today = new Date().toLocaleDateString("en-GB");
  tbody.querySelectorAll("tr").forEach(tr => {
    const id = tr.children[0].innerText.trim();
    const name = tr.children[1].innerText.trim();
    const section = tr.children[2].innerText.trim();
    const status = tr.children[3].innerText.trim() || "Absent";
    const time = tr.children[4].innerText.trim();
    rows.push([id, name, section, status, time, today]);
  });

  // convert to CSV with proper quoting
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

  showToast("CSV exported", 3000);
}

/* ======================
   Attendance History: load from Firestore
   ====================== */
async function loadHistoryFor(subjectIdx, dateStr) {
  historyResults.innerHTML = "<p>Loading...</p>";
  try {
    const q = query(collection(db, "attendance"),
      where("subject", "==", subjects[subjectIdx]),
      where("date", "==", dateStr),
      orderBy("studentId", "asc")
    );
    const snaps = await getDocs(q);
    if (snaps.empty) {
      historyResults.innerHTML = `<p>No records for ${subjects[subjectIdx]} on ${dateStr}.</p>`;
      return;
    }
    // build table
    const table = document.createElement("table");
    table.className = "attendance-table";
    table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Section</th><th>Status</th><th>Time</th></tr></thead>`;
    const tb = document.createElement("tbody");
    snaps.forEach(snap => {
      const d = snap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${d.studentId}</td><td>${d.name}</td><td>${d.section}</td><td>${d.status}</td><td>${d.time || "—"}</td>`;
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    historyResults.innerHTML = "";
    historyResults.appendChild(table);
  } catch (err) {
    console.error("History load err:", err);
    historyResults.innerHTML = `<p>Error loading history: ${err.message}</p>`;
  }
}

/* ======================
   Auth handlers
   ====================== */
loginBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then(result => {
      const user = result.user;
      userInfoEl.innerText = `✅ Logged in as: ${user.email}`;
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
    })
    .catch(err => {
      console.error("Login error:", err);
      showToast("Login error: " + (err.message || err.code));
    });
});

logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    userInfoEl.innerText = `Not signed in`;
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    userInfoEl.innerText = `✅ Logged in as: ${user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    userInfoEl.innerText = `Not signed in`;
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

/* ======================
   History controls binding
   ====================== */
historyLoadBtn.addEventListener("click", () => {
  const idx = parseInt(historySubjectSelect.value, 10);
  const dateVal = historyDateInput.value;
  if (!dateVal) return showToast("Pick a date to load history");
  const [year, month, day] = dateVal.split("-");
  const formatted = `${day}/${month}/${year}`;
  loadHistoryFor(idx, formatted);
});

/* ======================
   Utility: convert YYYY-MM-DD to DD/MM/YYYY and set default date to today
   ====================== */
function setDefaultHistoryDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  historyDateInput.value = `${y}-${m}-${d}`;
  historyDateInput.max = `${y}-${m}-${d}`;
}

/* ======================
   Prevent duplicate scanner creation when spamming tabs:
   When a subject tab is shown, we only init cameras and create reader when 'Start Scanner' clicked.
   But we also provide an auto-start if previously started.
   ====================== */
function wireStartStopButtons() {
  subjects.forEach(async (s, idx) => {
    const startBtn = document.getElementById(`start-btn-${idx}`);
    const stopBtn = document.getElementById(`stop-btn-${idx}`);
    // ensure cameras enumerated and populate
    await ensureCamerasForSubject(idx);
    populateCameraSelect(idx);

    startBtn.onclick = async () => {
      // stop other scanners
      if (runningScannerFor.idx !== null && runningScannerFor.idx !== idx) {
        await stopScanner(runningScannerFor.idx).catch(()=>{});
      }
      const sel = document.getElementById(`camera-select-${idx}`);
      const camId = sel.value || (cameraOptions[idx] && cameraOptions[idx][0] && cameraOptions[idx][0].id);
      if (!camId) {
        showToast("No camera available");
        return;
      }
      await startScannerWithCamera(idx, camId);
    };

    stopBtn.onclick = async () => {
      await stopScanner(idx);
    };
  });
}

/* ======================
   Misc utilities
   ====================== */
function isoToday() {
  const t = new Date();
  return t.toISOString().slice(0,10);
}

/* ======================
   Init startup
   ====================== */
async function init() {
  buildUI();
  setDefaultHistoryDate();

  // populate 'Home' nav btn click
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      // deactivate existing active
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      // hide all tab-content
      document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
      const tab = btn.dataset.tab;
      if (tab === "home") {
        document.getElementById("home").classList.add("active");
      } else {
        const el = document.getElementById(tab);
        if (el) el.classList.add("active");
      }
    });
  });

  // ensure camera selects present and actions wired
  await Promise.all(subjects.map((s,i) => ensureCamerasForSubject(i)));
  wireStartStopButtons();

  // create subject panels for quick access: open first subject by default
  activateSubject(0);

  // show top clock
  setInterval(() => {
    const d = new Date();
    document.getElementById("topClock").innerText = d.toLocaleString();
  }, 1000);

  // ensure history subject select is ready
  historySubjectSelect.innerHTML = subjects.map((s,i)=>`<option value="${i}">${s}</option>`).join("");

  // ensure table rendered for all subjects (initial)
  subjects.forEach((_,i) => renderAttendanceTable(i));

  showToast("App loaded. Subjects: " + subjects.length, 3000);
}

init().catch(e => console.error("Init err", e));

/* Expose some functions for debugging if desired */
window.QRoster = {
  startScannerWithCamera,
  stopScanner,
  exportAttendanceCSV
};
