// app.js (module)
// Firebase CDN imports (kept as CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, setDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { students } from "./students.js"; // <-- your unchanged students list

// Firebase config (unchanged)
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

// UI refs
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const subjectListEl = document.getElementById("subjectList");
const subjectsContainer = document.getElementById("subjectsContainer");
const historySubject = document.getElementById("history-subject");
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

// Subject names
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

// helper toast
function showToast(msg, ms = 2000) {
  toast.innerText = msg;
  toast.style.display = "block";
  setTimeout(()=> toast.style.display = "none", ms);
}

// sidebar toggle
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

// build UI: create subject buttons & panels
function buildUI() {
  SUBJECTS.forEach((sub, idx) => {
    // sidebar button
    const b = document.createElement("button");
    b.className = "nav-btn";
    b.dataset.tab = `subject-${idx}`;
    b.innerText = `📚 ${sub}`;
    subjectListEl.appendChild(b);

    // panel
    const panel = document.createElement("section");
    panel.id = `subject-${idx}`;
    panel.className = "tab-content subject-panel";
    panel.innerHTML = `
      <div class="subject-header">
        <div>
          <h2>🎓 ${sub}</h2>
          <div class="stats">
            <div class="stat"><div>Total</div><div class="big" id="total-${idx}">${students.length}</div></div>
            <div class="stat"><div>Present</div><div class="big" id="present-${idx}">—</div></div>
            <div class="stat"><div>Absent</div><div class="big" id="absent-${idx}">—</div></div>
            <div class="stat"><div>Status</div><div class="big" id="status-${idx}">Not finalized</div></div>
          </div>
        </div>
        <div class="controls">
          <div><label>Select date</label><br/><input type="date" id="date-${idx}" /></div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div><button id="finalize-${idx}" class="primary">Finalize Attendance</button></div>
            <div><button id="export-${idx}">Export CSV</button></div>
          </div>
        </div>
      </div>

      <div class="scanner-wrap">
        <div class="scanner-box">
          <h4>📷 QR Code Scanner</h4>
          <div id="qr-reader-${idx}" class="qr-reader"></div>
          <div class="camera-row">
            <label>Camera</label>
            <select id="camera-select-${idx}"></select>
            <button id="scan-toggle-${idx}">Start Scanner</button>
          </div>
          <div id="qr-result-${idx}" style="margin-top:8px"></div>
        </div>

        <div style="flex:1; min-width:360px;">
          <h4>👩‍🎓 Attendance List</h4>
          <table class="attendance-table" id="table-${idx}">
            <thead><tr><th>ID</th><th>Name</th><th>Section</th><th>Status</th><th>Time</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;
    subjectsContainer.appendChild(panel);

    // history select option
    const opt = document.createElement("option");
    opt.value = sub;
    opt.text = sub;
    historySubject.appendChild(opt);
  });

  // wire nav buttons
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
      const tab = btn.dataset.tab;
      const el = document.getElementById(tab);
      if (el) el.classList.add("active");
      manageScannersOnTabChange(tab);
    });
  });

  // init subject controls
  SUBJECTS.forEach((_, idx) => {
    document.getElementById(`date-${idx}`).value = todayInput();
    fillAttendanceTable(idx);
    document.getElementById(`finalize-${idx}`).addEventListener("click", () => askFinalize(idx));
    document.getElementById(`scan-toggle-${idx}`).addEventListener("click", () => toggleScannerFor(idx));
    document.getElementById(`camera-select-${idx}`).addEventListener("change", (e)=> switchCameraFor(idx, e.target.value));
    document.getElementById(`export-${idx}`).addEventListener("click", () => exportCSVFor(idx));
    document.getElementById(`date-${idx}`).addEventListener("change", () => onDateChange(idx));
  });
}

function todayInput() {
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function dmyFromInput(inputDate) {
  const [y,m,d] = inputDate.split("-");
  return `${d}/${m}/${y}`;
}
function nowTime() {
  return new Date().toLocaleTimeString('en-GB');
}

// Firestore helpers
async function saveAttendance(subject, dateDMY, studentId, name, section, status, timeStr) {
  const id = `${subject}_${studentId}_${dateDMY}`;
  const ref = doc(db, "attendance", id);
  await setDoc(ref, {
    subject, studentId, name, section, date: dateDMY, time: timeStr || "—", status, timestamp: serverTimestamp()
  });
}
async function setRollcallFinal(subject, dateDMY, finalizedBy) {
  const id = `${subject}_${dateDMY}`;
  const ref = doc(db, "rollcalls", id);
  await setDoc(ref, { subject, date: dateDMY, finalized: true, finalizedBy, finalizedAt: serverTimestamp() });
}
async function getRollcall(subject, dateDMY) {
  const ref = doc(db, "rollcalls", `${subject}_${dateDMY}`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
async function loadAttendance(subject, dateDMY) {
  const q = query(collection(db, "attendance"), where("subject","==",subject), where("date","==",dateDMY), orderBy("time","asc"));
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach(s => rows.push(s.data()));
  return rows;
}

// Attendance UI
function fillAttendanceTable(idx) {
  const tbody = document.querySelector(`#table-${idx} tbody`);
  tbody.innerHTML = "";
  students.forEach(s => {
    const tr = document.createElement("tr");
    tr.id = `row-${idx}-${s.studentId}`;
    tr.innerHTML = `<td>${s.studentId}</td><td>${s.name}</td><td>${s.section}</td><td class="status"> </td><td class="time">—</td>`;
    tbody.appendChild(tr);
  });
}
function setRowPresent(idx, studentId, timeStr) {
  const row = document.getElementById(`row-${idx}-${studentId}`);
  if (!row) return;
  row.querySelector(".status").innerText = "Present";
  row.querySelector(".status").classList.remove("absent");
  row.querySelector(".status").classList.add("present");
  row.querySelector(".time").innerText = timeStr;
}
function setRowAbsent(idx, studentId) {
  const row = document.getElementById(`row-${idx}-${studentId}`);
  if (!row) return;
  row.querySelector(".status").innerText = "Absent";
  row.querySelector(".status").classList.remove("present");
  row.querySelector(".status").classList.add("absent");
  row.querySelector(".time").innerText = "—";
}
async function updateStats(idx) {
  const subject = SUBJECTS[idx];
  const dateInput = document.getElementById(`date-${idx}`).value;
  const dateDMY = dmyFromInput(dateInput);

  document.getElementById(`total-${idx}`).innerText = students.length;

  const roll = await getRollcall(subject, dateDMY);
  const statusEl = document.getElementById(`status-${idx}`);
  if (!roll) {
    statusEl.innerText = "Not finalized";
    document.getElementById(`present-${idx}`).innerText = "—";
    document.getElementById(`absent-${idx}`).innerText = "—";
  } else {
    statusEl.innerText = "Finalized";
    const recs = await loadAttendance(subject, dateDMY);
    let present = recs.filter(r => r.status === "Present").length;
    const absent = students.length - present;
    document.getElementById(`present-${idx}`).innerText = present;
    document.getElementById(`absent-${idx}`).innerText = absent;
  }
}

// Scanner management
const scanners = {}; // idx -> { reader, running }

async function enumerateCameras(idx) {
  const sel = document.getElementById(`camera-select-${idx}`);
  sel.innerHTML = "";
  try {
    const devices = await Html5Qrcode.getCameras();
    if (!devices || !devices.length) {
      const opt = document.createElement("option");
      opt.text = "No cameras";
      sel.appendChild(opt);
      return [];
    }
    devices.forEach((d,i) => {
      const o = document.createElement("option");
      o.value = d.id;
      o.text = d.label || `Camera ${i+1}`;
      sel.appendChild(o);
    });
    return devices;
  } catch (e) {
    console.error("Camera enum error", e);
    return [];
  }
}

async function startScanner(idx, cameraId) {
  await stopScanner(idx).catch(()=>{});
  const regionId = `qr-reader-${idx}`;
  const reader = new Html5Qrcode(regionId, { verbose:false });
  scanners[idx] = { reader, running:true };

  try {
    await reader.start(
      { deviceId: { exact: cameraId } },
      { fps: 10, qrbox: { width: Math.min(380, window.innerWidth*0.8), height: Math.min(380, window.innerWidth*0.8) } },
      (decoded) => handleDecoded(idx, decoded),
      (err) => {}
    );
    document.getElementById(`scan-toggle-${idx}`).innerText = "Stop Scanner";
    showToast("Scanner started");
  } catch (err) {
    console.error("startScanner error", err);
    showToast("Failed to start camera (HTTPS/localhost required)");
    scanners[idx].running = false;
  }
}

async function stopScanner(idx) {
  if (!scanners[idx] || !scanners[idx].reader) return;
  try {
    await scanners[idx].reader.stop();
    scanners[idx].reader.clear();
  } catch (e) {}
  scanners[idx].running = false;
  document.getElementById(`scan-toggle-${idx}`).innerText = "Start Scanner";
}

async function toggleScannerFor(idx) {
  const sel = document.getElementById(`camera-select-${idx}`);
  if (!sel || !sel.value) {
    showToast("No camera selected");
    return;
  }
  if (scanners[idx] && scanners[idx].running) {
    await stopScanner(idx);
    document.getElementById(`qr-result-${idx}`).innerText = "Scanner stopped";
  } else {
    await startScanner(idx, sel.value);
  }
}

async function switchCameraFor(idx, cameraId) {
  await startScanner(idx, cameraId);
}

async function handleDecoded(idx, decodedText) {
  try {
    const payload = JSON.parse(decodedText);
    const found = students.find(s => s.studentId === payload.studentId);
    if (!found) {
      document.getElementById(`qr-result-${idx}`).innerText = `Unknown ID: ${payload.studentId}`;
      return;
    }
    const dateInput = document.getElementById(`date-${idx}`).value;
    const dateDMY = dmyFromInput(dateInput);
    const timeStr = nowTime();

    await saveAttendance(SUBJECTS[idx], dateDMY, found.studentId, found.name, found.section, "Present", timeStr);
    setRowPresent(idx, found.studentId, timeStr);
    document.getElementById(`qr-result-${idx}`).innerText = `✅ Marked Present: ${found.name}`;
    updateStats(idx).catch(()=>{});
  } catch (err) {
    console.error("Invalid QR", err);
    document.getElementById(`qr-result-${idx}`).innerText = "Invalid QR format";
  }
}

function manageScannersOnTabChange(activeTabId) {
  SUBJECTS.forEach((_, idx) => {
    const tabId = `subject-${idx}`;
    if (activeTabId === tabId) {
      enumerateCameras(idx).then(devs => {
        const sel = document.getElementById(`camera-select-${idx}`);
        if (devs && devs.length) {
          sel.value = devs[0].id;
          // attempt to auto-start; will prompt permissions
          startScanner(idx, sel.value).catch(()=>{});
        }
      });
    } else {
      stopScanner(idx).catch(()=>{});
    }
  });
}

// Finalize attendance
function askFinalize(idx) {
  const subject = SUBJECTS[idx];
  const dateInput = document.getElementById(`date-${idx}`).value;
  const dateDMY = dmyFromInput(dateInput);
  confirmSubjectEl.innerText = subject;
  confirmDateEl.innerText = dateDMY;
  confirmModal.setAttribute('aria-hidden','false');

  confirmOk.onclick = async () => {
    confirmModal.setAttribute('aria-hidden','true');
    await finalizeAttendance(idx);
  };
  confirmCancel.onclick = () => confirmModal.setAttribute('aria-hidden','true');
}

async function finalizeAttendance(idx) {
  const subject = SUBJECTS[idx];
  const dateInput = document.getElementById(`date-${idx}`).value;
  const dateDMY = dmyFromInput(dateInput);

  const recorded = await loadAttendance(subject, dateDMY);
  const recordedIds = new Set(recorded.map(r => r.studentId));

  for (const s of students) {
    if (!recordedIds.has(s.studentId)) {
      await saveAttendance(subject, dateDMY, s.studentId, s.name, s.section, "Absent", "—");
      setRowAbsent(idx, s.studentId);
    } else {
      const rec = recorded.find(r => r.studentId === s.studentId);
      if (rec && rec.status === "Present") setRowPresent(idx, s.studentId, rec.time || "—");
    }
  }

  const user = auth.currentUser;
  const finalizedBy = user ? user.email : "unknown";
  await setRollcallFinal(subject, dateDMY, finalizedBy);

  await updateStats(idx);
  showToast("Attendance finalized and saved");
}

// CSV export
function exportCSVFor(idx) {
  const subject = SUBJECTS[idx];
  const dateInput = document.getElementById(`date-${idx}`).value;
  const dateDMY = dmyFromInput(dateInput);

  const rows = [];
  const tbody = document.querySelector(`#table-${idx} tbody`);
  tbody.querySelectorAll("tr").forEach(tr => {
    const cols = Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim().replace(/,/g,''));
    rows.push(cols.join(","));
  });
  const csv = ["ID,Name,Section,Status,Time", ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subject.replace(/\s+/g,'_')}_${dateDMY}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// History load
document.getElementById("history-load").addEventListener("click", async () => {
  const subject = historySubject.value;
  const dateInput = document.getElementById("history-date").value;
  if (!subject || !dateInput) { showToast("Select subject and date"); return; }
  const dateDMY = dmyFromInput(dateInput);

  const recs = await loadAttendance(subject, dateDMY);
  historyResults.innerHTML = "";
  if (!recs.length) { historyResults.innerText = "No records for that date."; return; }

  const table = document.createElement("table");
  table.className = "attendance-table";
  table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Section</th><th>Status</th><th>Time</th></tr></thead>`;
  const tbody = document.createElement("tbody");
  recs.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.studentId}</td><td>${r.name}</td><td>${r.section}</td><td>${r.status}</td><td>${r.time || "—"}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  historyResults.appendChild(table);
});

// on date change
async function onDateChange(idx) {
  fillAttendanceTable(idx);
  const subject = SUBJECTS[idx];
  const dateInput = document.getElementById(`date-${idx}`).value;
  const dateDMY = dmyFromInput(dateInput);
  const roll = await getRollcall(subject, dateDMY);
  if (roll) {
    const recs = await loadAttendance(subject, dateDMY);
    recs.forEach(r => {
      if (r.status === "Present") setRowPresent(idx, r.studentId, r.time || "—");
      else setRowAbsent(idx, r.studentId);
    });
  }
  await updateStats(idx);
}

// Auth
loginBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider).then(result => {
    const user = result.user;
    userInfo.innerText = `✅ ${user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    showToast("Logged in");
  }).catch(err => {
    console.error("Login error:", err);
    showToast("Login failed: " + (err.message || err.code || ""));
  });
});
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(()=> {
    userInfo.innerText = "Not signed in";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    showToast("Logged out");
  });
});
onAuthStateChanged(auth, (user) => {
  if (user) {
    userInfo.innerText = `✅ ${user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    userInfo.innerText = "Not signed in";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

// Init
buildUI();
SUBJECTS.forEach((_, idx) => {
  enumerateCameras(idx).catch(()=>{});
  updateStats(idx).catch(()=>{});
});

// stop scanners before unload
window.addEventListener("beforeunload", async () => {
  for (const k in scanners) {
    if (scanners[k] && scanners[k].reader) {
      try { await scanners[k].reader.stop(); } catch(e){}
    }
  }
});

// auto-start attempt when switching tabs
function autoStartForActiveTab() {
  const activeBtn = document.querySelector(".nav-btn.active");
  if (!activeBtn) return;
  const tab = activeBtn.dataset.tab;
  SUBJECTS.forEach((_, idx) => {
    const id = `subject-${idx}`;
    if (tab === id) {
      enumerateCameras(idx).then(devs => {
        const sel = document.getElementById(`camera-select-${idx}`);
        if (devs && devs.length) {
          sel.value = devs[0].id;
          startScanner(idx, sel.value).catch(()=>{});
        }
      }).catch(()=>{});
    } else {
      stopScanner(idx).catch(()=>{});
    }
  });
}
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList && e.target.classList.contains("nav-btn")) {
    setTimeout(() => autoStartForActiveTab(), 120);
  }
});
