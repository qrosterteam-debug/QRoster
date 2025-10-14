// ✅ Firebase + students import
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, setDoc, getDoc, getDocs, query, where, orderBy, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { students } from "./students.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDdTrOmPZzwW4LtMNQvPSSMNbz-r-yhNtY",
  authDomain: "qroster-4a631.firebaseapp.com",
  projectId: "qroster-4a631",
  storageBucket: "qroster-4a631.firebasestorage.app",
  messagingSenderId: "961257265744",
  appId: "1:961257265744:web:9f709bb6b6df541c8b8f55",
  measurementId: "G-63MXS6BHMK"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// ✅ UI Elements
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
const toast = document.getElementById("toast");
const modal = document.getElementById("confirmModal");
const confirmBtn = document.getElementById("confirmFinalize");
const cancelBtn = document.getElementById("cancelFinalize");

// Sidebar toggle (collapsible by default)
menuToggle.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

// ✅ Toast message
function showToast(msg) {
  toast.innerText = msg;
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), 5000);
}

// ✅ Auth
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const userInfo = document.getElementById("user-info");

loginBtn.addEventListener("click", () =>
  signInWithPopup(auth, provider)
    .then((res) => showToast(`✅ Logged in as ${res.user.email}`))
    .catch((err) => console.error(err))
);

logoutBtn.addEventListener("click", () =>
  signOut(auth).then(() => {
    showToast("👋 Logged out");
    userInfo.innerText = "Not signed in";
  })
);

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.innerText = `Signed in as ${user.email}`;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

// ✅ Tabs
const tabs = document.querySelectorAll(".nav-btn");
const contents = document.querySelectorAll(".tab-content");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    contents.forEach((c) => c.classList.remove("active"));
    document.getElementById(tab.dataset.tab).classList.add("active");
    if (tab.dataset.tab !== "home") loadSubject(tab.dataset.tab);
  });
});

// ✅ Attendance data
const attendanceData = {};
const activeScanners = {};

// ✅ Load Subject Panels
function loadSubject(subject) {
  const container = document.getElementById(subject);
  if (container.innerHTML) return;

  attendanceData[subject] = {};

  container.innerHTML = `
    <div class="subject-panel">
      <div class="subject-header">
        <h2>${subject}</h2>
        <div class="controls">
          <button class="primary start-scan">Start Scanner</button>
          <button class="primary finalize">Finalize Attendance</button>
          <button class="primary export">Export CSV</button>
        </div>
      </div>
      <div class="stats">
        <div class="stat"><div>Total Students</div><div class="big">${students.length}</div></div>
        <div class="stat"><div>Present Today</div><div class="big" id="present-${subject}">-</div></div>
        <div class="stat"><div>Absent Today</div><div class="big" id="absent-${subject}">-</div></div>
      </div>
      <div class="scanner-wrap">
        <div class="scanner-box">
          <div id="qr-reader-${subject.replace(/\s/g, '')}"></div>
          <div class="camera-row">
            <label>Camera:</label>
            <select id="cameraSelect-${subject}"></select>
          </div>
        </div>
        <table class="attendance-table" id="table-${subject}">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Section</th><th>Status</th><th>Time</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = container.querySelector("tbody");
  students.forEach((s) => {
    const row = document.createElement("tr");
    row.id = `${subject}-${s.studentId}`;
    row.innerHTML = `
      <td>${s.studentId}</td>
      <td>${s.name}</td>
      <td>${s.section}</td>
      <td>-</td>
      <td>-</td>
    `;
    tbody.appendChild(row);
  });

  setupScanner(subject);
  container.querySelector(".finalize").addEventListener("click", () => openModal(subject));
  container.querySelector(".export").addEventListener("click", () => exportCSV(subject));
}

// ✅ Setup QR Scanner
async function setupScanner(subject) {
  const readerId = `qr-reader-${subject.replace(/\s/g, '')}`;
  const selectId = `cameraSelect-${subject}`;
  const startBtn = document.querySelector(`#${subject} .start-scan`);

  if (activeScanners[subject]) {
    await activeScanners[subject].stop();
    delete activeScanners[subject];
  }

  const qrReader = new Html5Qrcode(readerId);
  const cameraSelect = document.getElementById(selectId);

  const cameras = await Html5Qrcode.getCameras();
  cameraSelect.innerHTML = "";
  cameras.forEach((c, i) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.text = c.label || `Camera ${i + 1}`;
    cameraSelect.appendChild(opt);
  });

  startBtn.onclick = async () => {
    if (activeScanners[subject]) {
      await qrReader.stop();
      delete activeScanners[subject];
      startBtn.innerText = "Start Scanner";
      showToast("📴 Scanner stopped");
    } else {
      const camId = cameraSelect.value;
      qrReader
        .start(
          { deviceId: { exact: camId } },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => handleScan(decodedText, subject)
        )
        .then(() => {
          activeScanners[subject] = qrReader;
          startBtn.innerText = "Stop Scanner";
          showToast("📷 Scanner started");
        })
        .catch((err) => console.error("Camera start error:", err));
    }
  };
}

// ✅ Handle QR Scan
function handleScan(decodedText, subject) {
  try {
    const data = JSON.parse(decodedText);
    const student = students.find((s) => s.studentId === data.studentId);
    if (!student) return showToast("⚠️ Unknown student ID");

    const row = document.getElementById(`${subject}-${data.studentId}`);
    if (!row) return showToast("⚠️ Student not in this class");

    const now = new Date();
    const time = now.toLocaleTimeString();

    const cells = row.children;
    cells[3].innerText = "Present";
    cells[3].className = "present";
    cells[4].innerText = time;

    attendanceData[subject][data.studentId] = {
      ...data,
      subject,
      status: "Present",
      time,
      date: now.toLocaleDateString("en-GB"),
      timestamp: serverTimestamp(),
    };

    updateStats(subject);
    showToast(`✅ ${data.name} marked present`);
  } catch {
    showToast("⚠️ Invalid QR Code format");
  }
}

// ✅ Update Stats
function updateStats(subject) {
  const presentCount = Object.values(attendanceData[subject]).filter(
    (s) => s.status === "Present"
  ).length;
  const total = students.length;
  document.getElementById(`present-${subject}`).innerText = presentCount;
  document.getElementById(`absent-${subject}`).innerText = total - presentCount;
}

// ✅ Finalize Attendance
function openModal(subject) {
  modal.setAttribute("aria-hidden", "false");
  confirmBtn.onclick = () => finalizeAttendance(subject);
  cancelBtn.onclick = () => modal.setAttribute("aria-hidden", "true");
}

async function finalizeAttendance(subject) {
  modal.setAttribute("aria-hidden", "true");
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");

  for (const s of students) {
    if (!attendanceData[subject][s.studentId]) {
      attendanceData[subject][s.studentId] = {
        ...s,
        subject,
        status: "Absent",
        time: "-",
        date,
        timestamp: serverTimestamp(),
      };
      const row = document.getElementById(`${subject}-${s.studentId}`);
      if (row) {
        const cells = row.children;
        cells[3].innerText = "Absent";
        cells[3].className = "absent";
      }
    }

    await setDoc(
      doc(db, "attendance", `${subject}_${s.studentId}_${date}`),
      attendanceData[subject][s.studentId]
    );
  }

  updateStats(subject);
  showToast(`✅ Attendance finalized for ${subject}`);
}

// ✅ Export CSV
function exportCSV(subject) {
  const date = new Date().toLocaleDateString("en-GB");
  const rows = [["ID", "Name", "Section", "Status", "Time", "Date"]];
  students.forEach((s) => {
    const record = attendanceData[subject][s.studentId] || { status: "Absent", time: "-" };
    rows.push([s.studentId, s.name, s.section, record.status, record.time, date]);
  });

  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows.map((r) => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = encodeURI(csvContent);
  a.download = `${subject}_Attendance_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("📦 CSV exported successfully");
}
