// ✅ Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, setDoc, getDoc,
  getDocs, query, orderBy, doc, serverTimestamp
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

// HTML Elements
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const userInfo = document.getElementById("user-info");
const studentBody = document.getElementById("student-body");
const finalizeBtn = document.getElementById("finalize-btn");
const historyBody = document.getElementById("history-body");

// Stats
const statTotal = document.getElementById("stat-total");
const statPresent = document.getElementById("stat-present");
const statAbsent = document.getElementById("stat-absent");

// Modal
const modal = document.getElementById("confirm-modal");
const modalYes = document.getElementById("confirm-yes");
const modalNo = document.getElementById("confirm-no");

// QR Scanner
let qrReader;
let currentCameraId = null;
let cameras = [];

// 🔹 Login
loginBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch(err => console.error("Login error:", err));
});

// 🔹 Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

// ✅ Load Student Table
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
  updateStats();
}

// ✅ Save Attendance + Update Table
async function markAttendance(studentId, name, section) {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");
  const time = now.toLocaleTimeString("en-GB");
  const dateTime = `${date} ${time}`;

  try {
    await setDoc(doc(db, "attendance", `${studentId}_${date}`), {
      studentId, name, section, date, time,
      timestamp: serverTimestamp(),
      status: "Present"
    });

    const row = document.getElementById(studentId);
    if (row) {
      row.querySelector(".status").innerText = "Present";
      row.querySelector(".status").classList.add("present");
      row.querySelector(".time").innerText = dateTime;
    }

    updateStats();
  } catch (e) {
    console.error("Error marking attendance:", e);
  }
}

// ✅ Mark Absentees & Finalize
async function finalizeAttendance() {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");

  for (const s of students) {
    const docRef = doc(db, "attendance", `${s.studentId}_${date}`);
    const record = await getDoc(docRef);

    if (!record.exists()) {
      await setDoc(docRef, {
        studentId: s.studentId,
        name: s.name,
        section: s.section,
        date,
        time: "—",
        status: "Absent",
        timestamp: serverTimestamp()
      });
    }
  }

  updateStats();
  loadHistory();
  alert("✅ Attendance finalized for today.");
}

// ✅ History
async function loadHistory() {
  historyBody.innerHTML = "";

  const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach(docSnap => {
    const d = docSnap.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d.studentId}</td>
      <td>${d.name}</td>
      <td>${d.section}</td>
      <td>${d.date}</td>
      <td>${d.time}</td>
      <td>${d.status}</td>
    `;
    historyBody.appendChild(row);
  });
}

// ✅ Stats updater
async function updateStats() {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");

  let present = 0;
  let absent = 0;

  for (const s of students) {
    const docRef = doc(db, "attendance", `${s.studentId}_${date}`);
    const record = await getDoc(docRef);
    if (record.exists()) {
      if (record.data().status === "Present") present++;
      else absent++;
    }
  }

  statTotal.innerText = students.length;
  statPresent.innerText = present;
  statAbsent.innerText = students.length - present;
}

// ✅ QR Scanner Setup
async function startQRScanner() {
  try {
    cameras = await Html5Qrcode.getCameras();
    if (!cameras.length) {
      alert("No cameras found.");
      return;
    }
    currentCameraId = cameras[0].id;
    await startScannerWithCamera(currentCameraId);
  } catch (err) {
    console.error("Camera error:", err);
  }
}

async function startScannerWithCamera(cameraId) {
  if (qrReader) await qrReader.stop().catch(() => {});
  qrReader = new Html5Qrcode("qr-reader");

  qrReader.start(
    { deviceId: { exact: cameraId } },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      try {
        const studentData = JSON.parse(decodedText);
        markAttendance(studentData.studentId, studentData.name, studentData.section);
        document.getElementById("qr-reader-results").innerText = `✅ Scanned: ${studentData.name}`;
      } catch (err) {
        console.error("Invalid QR format", err);
      }
    }
  );
}

// Camera Switch
document.getElementById("camera-switch").addEventListener("click", async () => {
  if (!cameras.length) return;
  const idx = cameras.findIndex(c => c.id === currentCameraId);
  const nextIdx = (idx + 1) % cameras.length;
  currentCameraId = cameras[nextIdx].id;
  await startScannerWithCamera(currentCameraId);
});

// ✅ Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.innerText = `✅ ${user.email}`;

    loadStudentTable();
    startQRScanner();
    loadHistory();
    finalizeBtn.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInfo.innerText = "Not signed in";
    studentBody.innerHTML = "";
    historyBody.innerHTML = "";
    finalizeBtn.style.display = "none";
  }
});

// ✅ Finalize Confirmation Modal
finalizeBtn.addEventListener("click", () => {
  modal.style.display = "flex";
});
modalYes.addEventListener("click", () => {
  finalizeAttendance();
  modal.style.display = "none";
});
modalNo.addEventListener("click", () => {
  modal.style.display = "none";
});
