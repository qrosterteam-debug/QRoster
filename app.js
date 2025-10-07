// ✅ Import Firebase SDK from CDN (kept your config)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, setDoc, getDoc,
  getDocs, query, orderBy, where, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { students } from "./students.js"; // your student list (untouched)

// ✅ Firebase Config - kept exactly as you provided
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

// ---------- DOM ----------
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const loginBtn = document.getElementById('login');
const logoutBtn = document.getElementById('logout');
const userInfo = document.getElementById('user-info');
const welcomeText = document.getElementById('welcomeText');
const todayText = document.getElementById('todayText');

const qrReaderContainer = document.getElementById('qr-reader');
const cameraSelect = document.getElementById('cameraSelect');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const qrResults = document.getElementById('qr-reader-results');
const finalizeBtn = document.getElementById('finalizeBtn');

const studentBody = document.getElementById('student-body');
const totalCountEl = document.getElementById('totalCount');
const presentCountEl = document.getElementById('presentCount');
const absentCountEl = document.getElementById('absentCount');

const historyDate = document.getElementById('historyDate');
const loadHistoryBtn = document.getElementById('loadHistoryBtn');
const historyBody = document.getElementById('history-body');

const confirmModalRoot = document.getElementById('confirmModal');

// ---------- state ----------
let currentUser = null;
let html5QrScanner = null;
let currentCameraId = null;
let camerasList = [];
let todayStr = null; // dd/mm/yyyy
let presentSet = new Set(); // studentId marked present
let absentSet = new Set();  // computed on finalize

// ---------- helpers ----------
function getTodayString() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2,'0');
  const m = String(now.getMonth()+1).padStart(2,'0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatTimeNow() {
  const now = new Date();
  return now.toLocaleTimeString('en-GB');
}

function updateTodayUI() {
  todayStr = getTodayString();
  todayText.innerText = `Today: ${todayStr}`;
}

function updateStatsUI() {
  const total = students.length;
  const present = presentSet.size;
  const absent = total - present;
  totalCountEl.innerText = total;
  presentCountEl.innerText = present;
  absentCountEl.innerText = absent;
}

// ---------- student table ----------
function loadStudentTable() {
  studentBody.innerHTML = '';
  students.forEach(s => {
    const tr = document.createElement('tr');
    tr.id = `row-${s.studentId}`;

    tr.innerHTML = `
      <td>${s.studentId}</td>
      <td>${s.name}</td>
      <td>${s.section}</td>
      <td class="statusCell"> </td>
      <td class="timeCell">—</td>
    `;
    studentBody.appendChild(tr);
  });
  updateStatsUI();
}

// mark UI (present) locally
function markPresentInUI(studentId, timeStr) {
  const row = document.getElementById(`row-${studentId}`);
  if (!row) return;
  row.querySelector('.statusCell').innerText = 'Present';
  row.querySelector('.statusCell').classList.remove('absent');
  row.querySelector('.statusCell').classList.add('present');
  row.querySelector('.timeCell').innerText = timeStr || formatTimeNow();
  updateStatsUI();
}

// mark absent in UI (finalize)
function markAbsentInUI(studentId) {
  const row = document.getElementById(`row-${studentId}`);
  if (!row) return;
  row.querySelector('.statusCell').innerText = 'Absent';
  row.querySelector('.statusCell').classList.remove('present');
  row.querySelector('.statusCell').classList.add('absent');
  row.querySelector('.timeCell').innerText = '—';
  updateStatsUI();
}

// ---------- Firestore attendance writing ----------
async function saveAttendanceRecord(studentId, name, section, status, date, time) {
  // doc id use STUDENTID_DD/MM/YYYY
  const docId = `${studentId}_${date}`;
  try {
    await setDoc(doc(db, 'attendance', docId), {
      studentId, name, section, date, time, timestamp: serverTimestamp(), status
    });
  } catch (err) {
    console.error('Error saving attendance doc:', err);
  }
}

// ---------- scanner logic ----------
async function startScanner(cameraId) {
  // stop previous if any
  if (html5QrScanner) {
    try { await html5QrScanner.stop(); } catch(e){ /* ignore */ }
    html5QrScanner = null;
  }

  html5QrScanner = new Html5Qrcode(qrReaderContainer.id, { fps: 10, verbose: false });

  // set qrbox proportionally based on container size
  function qrBoxSize() {
    const w = qrReaderContainer.clientWidth;
    const h = qrReaderContainer.clientHeight;
    const smaller = Math.min(w, h);
    // make the scanning box around 58% of smaller side
    return Math.floor(smaller * 0.58);
  }

  const config = { fps: 10, qrbox: qrBoxSize };

  try {
    await html5QrScanner.start(
      { deviceId: { exact: cameraId } },
      config,
      onScanSuccess,
      (errorMessage) => {
        // scan fail (ignored)
      }
    );
  } catch (err) {
    console.error('Camera start error:', err);
  }
}

// called when QR scanned
async function onScanSuccess(decodedText) {
  // expect JSON with studentId, name, section
  try {
    const studentData = JSON.parse(decodedText);
    const { studentId, name, section } = studentData;
    if (!studentId) throw new Error('Missing studentId');

    // already marked?
    if (presentSet.has(studentId)) {
      qrResults.innerText = `Already marked: ${studentId}`;
      return;
    }

    // mark present locally + UI
    const time = formatTimeNow();
    presentSet.add(studentId);
    markPresentInUI(studentId, `${todayStr} ${time}`);

    // save to Firestore
    await saveAttendanceRecord(studentId, name, section, 'Present', todayStr, time);

    qrResults.innerText = `✅ Scanned: ${name} — Present`;
    updateStatsUI();

  } catch (err) {
    console.error('Invalid QR format or error:', err);
    qrResults.innerText = 'Invalid QR format';
  }
}

// ---------- camera enumeration ----------
async function enumerateCameras() {
  cameraSelect.innerHTML = '';
  try {
    camerasList = await Html5Qrcode.getCameras();
    if (!camerasList || camerasList.length === 0) {
      const opt = document.createElement('option'); opt.value=''; opt.text='No cameras found';
      cameraSelect.appendChild(opt);
      return;
    }
    camerasList.forEach((c, idx) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.text = c.label || `camera ${idx+1}`;
      cameraSelect.appendChild(opt);
    });
    // pick facing back if available
    const preferred = camerasList.find(c=>/back|rear|environment/i.test(c.label)) || camerasList[0];
    currentCameraId = preferred.id;
    cameraSelect.value = currentCameraId;
  } catch (err) {
    console.error('Error enumerating cameras', err);
  }
}

// ---------- finalize attendance ----------
function showConfirmationModal(message, onConfirm) {
  confirmModalRoot.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true">
        <h3>Confirm</h3>
        <p>${message}</p>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
          <button id="cancelModal" style="padding:8px 10px;border-radius:6px;border:1px solid #ccd;">Cancel</button>
          <button id="okModal" style="padding:8px 10px;border-radius:6px;background:#2ecc71;border:none;color:#fff;">Yes, finalize</button>
        </div>
      </div>
    </div>
  `;
  confirmModalRoot.style.display = 'block';
  document.getElementById('cancelModal').addEventListener('click', () => {
    confirmModalRoot.style.display = 'none';
    confirmModalRoot.innerHTML = '';
  });
  document.getElementById('okModal').addEventListener('click', () => {
    confirmModalRoot.style.display = 'none';
    confirmModalRoot.innerHTML = '';
    onConfirm();
  });
}

// finalize: mark all not-present students absent and save a summary doc
async function finalizeAttendance() {
  showConfirmationModal('This will finalize today\'s attendance. All unmarked students will be saved as Absent. Proceed?', async () => {
    // stop scanner while finalizing
    if (html5QrScanner) {
      try { await html5QrScanner.stop(); } catch(e) {}
      html5QrScanner = null;
    }

    const now = new Date();
    const time = now.toLocaleTimeString('en-GB');
    absentSet = new Set();

    // mark absent for each student not in presentSet
    for (const s of students) {
      if (!presentSet.has(s.studentId)) {
        absentSet.add(s.studentId);
        // save absent record to firestore
        await saveAttendanceRecord(s.studentId, s.name, s.section, 'Absent', todayStr, '—');
        markAbsentInUI(s.studentId);
      }
    }

    // save summary doc to attendance_summary collection
    try {
      const summaryId = `summary_${todayStr.replace(/\//g,'-')}`;
      await setDoc(doc(db, 'attendance_summary', summaryId), {
        date: todayStr,
        total: students.length,
        present: presentSet.size,
        absent: absentSet.size,
        finalizedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error saving summary', err);
    }

    qrResults.innerText = `Attendance finalized for ${todayStr}. Present: ${presentSet.size}, Absent: ${absentSet.size}`;
    updateStatsUI();
  });
}

// ---------- history loading ----------
async function loadHistoryForDate(dateStr) {
  // dateStr expected DD/MM/YYYY
  historyBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
  try {
    const q = query(collection(db,'attendance'), where('date','==',dateStr), orderBy('time','asc'));
    const snaps = await getDocs(q);
    if (snaps.empty) {
      historyBody.innerHTML = `<tr><td colspan="6">No records for ${dateStr}</td></tr>`;
      return;
    }
    historyBody.innerHTML = '';
    snaps.forEach(docSnap => {
      const d = docSnap.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.studentId}</td><td>${d.name}</td><td>${d.section}</td><td>${d.date}</td><td>${d.time || '—'}</td><td>${d.status}</td>`;
      historyBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading history', err);
    historyBody.innerHTML = `<tr><td colspan="6">Error loading history</td></tr>`;
  }
}

// ---------- tab switching (starts/stops scanner appropriately) ----------
tabs.forEach(btn => btn.addEventListener('click', async () => {
  tabs.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');

  tabContents.forEach(c=>c.classList.remove('active'));
  const id = btn.dataset.tab;
  document.getElementById(id).classList.add('active');

  // if scanner tab active => enumerate & start scanner
  if (id === 'scanner') {
    await enumerateCameras();
    if (currentCameraId) {
      await startScanner(currentCameraId);
    }
  } else {
    // stop scanner if running
    if (html5QrScanner) {
      try { await html5QrScanner.stop(); } catch(e){ }
      html5QrScanner = null;
    }
  }
}));

// ---------- auth ----------
loginBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider).then(result => {
    // user signed in
  }).catch(err => {
    console.error('Login error:', err);
    alert('Login failed: ' + (err?.message || 'unknown'));
  });
});

logoutBtn.addEventListener('click', () => {
  signOut(auth).then(()=> {
    // signed out
  }).catch(err => console.error('Logout err', err));
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    userInfo.innerText = `✅ Logged in as: ${user.email}`;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    welcomeText.innerText = `Welcome, ${user.displayName || user.email}`;
  } else {
    userInfo.innerText = 'Not signed in';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    welcomeText.innerText = 'Welcome, guest';
  }
});

// ---------- camera controls ----------
switchCameraBtn.addEventListener('click', async () => {
  if (!camerasList || camerasList.length === 0) return;
  // rotate to next
  const idx = camerasList.findIndex(c=>c.id===currentCameraId);
  const next = camerasList[(idx+1) % camerasList.length];
  currentCameraId = next.id;
  cameraSelect.value = currentCameraId;
  if (html5QrScanner) {
    await startScanner(currentCameraId);
  } else {
    // if not running, only set
    await startScanner(currentCameraId);
  }
});

cameraSelect.addEventListener('change', async (e) => {
  const val = e.target.value;
  if (!val) return;
  currentCameraId = val;
  if (html5QrScanner) {
    await startScanner(currentCameraId);
  }
});

// finalize button
finalizeBtn.addEventListener('click', finalizeAttendance);

// history load
loadHistoryBtn.addEventListener('click', () => {
  const iso = historyDate.value;
  if (!iso) { alert('Pick a date'); return; }
  const [y,m,d] = iso.split('-');
  const ddmmyy = `${d}/${m}/${y}`;
  loadHistoryForDate(ddmmyy);
});

// ---------- init ----------
async function initApp() {
  updateTodayUI();
  loadStudentTable();
  // default tab scanner - enumerate & start scanner (if allowed)
  try {
    await enumerateCameras();
    if (camerasList && camerasList.length) {
      currentCameraId = camerasList[0].id;
      cameraSelect.value = currentCameraId;
      await startScanner(currentCameraId);
    }
  } catch (e) {
    console.warn('Initial camera start suppressed:', e);
  }
  // set date input default for history
  const now = new Date();
  historyDate.value = now.toISOString().slice(0,10);
}

initApp();

// make stats live if Firestore changes later (optional)
// For now app uses local presentSet and Firestore writes when scanned / finalized.

