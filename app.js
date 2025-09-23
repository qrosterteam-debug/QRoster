// ✅ Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, setDoc, getDoc,
  getDocs, query, orderBy, where, doc, serverTimestamp
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

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Elements
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const userInfo = document.getElementById("user-info");
const welcomeMsg = document.getElementById("welcome-msg");
const todayDateEl = document.getElementById("today-date");
const studentBody = document.getElementById("student-body");
const filterBody = document.getElementById("filter-body");
const qrResult = document.getElementById("qr-reader-results");
const markAbsenteesBtn = document.getElementById("mark-absentees");

// Stats elements
const totalStudentsEl = document.getElementById("total-students");
const presentCountEl = document.getElementById("present-count");
const absentCountEl = document.getElementById("absent-count");

// Globals
let qrReader = null;
let activeTab = "scanner";

// Set today’s date
const today = new Date();
todayDateEl.innerText = today.toLocaleDateString("en-US", {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});

// 🔹 Login
loginBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch(err => console.error("Login error:", err));
});

// 🔹 Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    userInfo.innerText = "❌ Logged out.";
    welcomeMsg.innerText = "Welcome to QRoster";
    stopScanner();
  });
});

// Load Student Table + Stats
function loadStudentTable() {
  studentBody.innerHTML = "";
  students.forEach(s => {
    const row = document.createElement("tr");
    row.id = s.studentId;
    row.innerHTML = `
      <td>${s.studentId}</td>
      <td>${s.name}</td>
      <td>${s.section}</td>
      <td class="status">—</td>
      <td class="time">—</td>
    `;
    studentBody.appendChild(row);
  });

  // Update stats initially
  updateStats();
}

// Mark Attendance
async function markAttendance(studentId, name, section) {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");
  const time = now.toLocaleTimeString("en-GB");

  await setDoc(doc(db, "attendance", `${studentId}_${date}`), {
    studentId, name, section,
    date, time,
    timestamp: serverTimestamp(),
    status: "Present"
  });

  qrResult.innerText = `📌 Marked Present: ${name}`;
  const row = document.getElementById(studentId);
  if (row) {
    row.querySelector(".status").innerText = "Present";
    row.querySelector(".status").classList.add("present");
    row.querySelector(".time").innerText = `${date} ${time}`;
  }

  // Refresh stats
  updateStats();
}

// ✅ Mark Absentees
markAbsenteesBtn.addEventListener("click", async () => {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");

  for (let s of students) {
    const docRef = doc(db, "attendance", `${s.studentId}_${date}`);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      await setDoc(docRef, {
        studentId: s.studentId,
        name: s.name,
        section: s.section,
        date,
        time: "—",
        timestamp: serverTimestamp(),
        status: "Absent"
      });

      const row = document.getElementById(s.studentId);
      if (row) {
        row.querySelector(".status").innerText = "Absent";
        row.querySelector(".status").classList.add("absent");
        row.querySelector(".time").innerText = "—";
      }
    }
  }

  alert("✅ Absentees marked.");
  updateStats();
});

// Update Statistics
async function updateStats() {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");

  let presentCount = 0;
  let absentCount = 0;

  for (let s of students) {
    const docRef = doc(db, "attendance", `${s.studentId}_${date}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.status === "Present") presentCount++;
      else if (data.status === "Absent") absentCount++;
    }
  }

  totalStudentsEl.innerText = students.length;
  presentCountEl.innerText = presentCount;
  absentCountEl.innerText = absentCount;
}

// Load History
async function loadHistory(selectedDate = null) {
  filterBody.innerHTML = "";
  let q;

  if (selectedDate) {
    q = query(collection(db, "attendance"), where("date", "==", selectedDate), orderBy("time", "asc"));
  } else {
    q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
  }

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    filterBody.innerHTML = `<tr><td colspan="6">No records found</td></tr>`;
    return;
  }

  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const row = `
      <tr>
        <td>${data.studentId}</td>
        <td>${data.name}</td>
        <td>${data.section}</td>
        <td>${data.date || "—"}</td>
        <td>${data.time || "—"}</td>
        <td>${data.status}</td>
      </tr>
    `;
    filterBody.innerHTML += row;
  });
}

// Scanner
async function startScanner() {
  try {
    if (qrReader) await qrReader.stop().catch(() => {});
    qrReader = new Html5Qrcode("qr-reader");

    const cameras = await Html5Qrcode.getCameras();
    if (cameras.length) {
      await qrReader.start(
        { deviceId: { exact: cameras[0].id } },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          try {
            const studentData = JSON.parse(decodedText);
            markAttendance(studentData.studentId, studentData.name, studentData.section);
          } catch (err) {
            console.error("Invalid QR format", err);
          }
        }
      );
    }
  } catch (err) {
    console.error("Camera error:", err);
  }
}

async function stopScanner() {
  if (qrReader) {
    try {
      await qrReader.stop();
      qrReader.clear();
    } catch {}
    qrReader = null;
  }
}

// Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.innerText = `✅ Logged in as: ${user.email}`;
    welcomeMsg.innerText = `Welcome, ${user.displayName || user.email}`;
    loadStudentTable();
    updateStats();
    if (activeTab === "scanner") startScanner();
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInfo.innerText = "Not signed in";
    welcomeMsg.innerText = "Welcome to QRoster";
    stopScanner();
    studentBody.innerHTML = "";
    filterBody.innerHTML = "";
    totalStudentsEl.innerText = "0";
    presentCountEl.innerText = "0";
    absentCountEl.innerText = "0";
  }
});

// Tabs
const tabs = document.querySelectorAll(".tab-btn");
tabs.forEach(tab => {
  tab.addEventListener("click", async () => {
    activeTab = tab.dataset.tab;
    if (activeTab === "scanner") {
      await startScanner();
    } else {
      await stopScanner();
      if (activeTab === "attendance") {
        loadStudentTable();
        updateStats();
      }
      if (activeTab === "history") loadHistory();
    }
  });
});

// Filter
document.getElementById("filter-btn").addEventListener("click", () => {
  const selectedDate = document.getElementById("filter-date").value;
  if (selectedDate) {
    const parts = selectedDate.split("-");
    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    loadHistory(formattedDate);
  }
});
