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
const studentBody = document.getElementById("student-body");
const resultsDiv = document.getElementById("qr-reader-results");
const finalizeBtn = document.getElementById("finalize-btn");
const modal = document.getElementById("finalize-modal");
const confirmFinalize = document.getElementById("confirm-finalize");
const cancelFinalize = document.getElementById("cancel-finalize");

// Summary elements
const totalCount = document.getElementById("total-count");
const presentCount = document.getElementById("present-count");
const absentCount = document.getElementById("absent-count");

// 🔹 Auth
loginBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .catch(err => console.error("Login error:", err));
});
logoutBtn.addEventListener("click", () => signOut(auth));

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
  updateSummary();
}

// ✅ Mark Present
async function markAttendance(studentId, name, section) {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");
  const time = now.toLocaleTimeString("en-GB");

  try {
    await setDoc(doc(db, "attendance", `${studentId}_${date}`), {
      studentId, name, section, date, time,
      timestamp: serverTimestamp(),
      status: "Present"
    });

    const row = document.getElementById(studentId);
    if (row) {
      row.querySelector(".status").innerText = "Present";
      row.querySelector(".status").className = "status present";
      row.querySelector(".time").innerText = `${date} ${time}`;
    }
    updateSummary();

  } catch (err) {
    console.error("Error marking attendance:", err);
  }
}

// ✅ Finalize Attendance (absentees)
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
      const row = document.getElementById(s.studentId);
      if (row) {
        row.querySelector(".status").innerText = "Absent";
        row.querySelector(".status").className = "status absent";
        row.querySelector(".time").innerText = "—";
      }
    }
  }
  updateSummary();
  alert("✅ Attendance finalized for today.");
}

// ✅ Update Summary
function updateSummary() {
  totalCount.innerText = students.length;
  const present = [...document.querySelectorAll(".status")]
    .filter(cell => cell.innerText === "Present").length;
  presentCount.innerText = present;
  absentCount.innerText = students.length - present;
  finalizeBtn.style.display = present > 0 ? "inline-block" : "none";
}

// ✅ QR Scanner Setup
let qrReader;
let cameras = [];
let currentCam = 0;

async function startScanner() {
  if (qrReader) await qrReader.stop().catch(()=>{});
  qrReader = new Html5Qrcode("qr-reader");

  try {
    cameras = await Html5Qrcode.getCameras();
    if (!cameras.length) {
      resultsDiv.innerText = "No cameras found.";
      return;
    }

    qrReader.start(
      { deviceId: { exact: cameras[currentCam].id } },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      decodedText => {
        try {
          const data = JSON.parse(decodedText);
          markAttendance(data.studentId, data.name, data.section);
          resultsDiv.innerText = `✅ Scanned: ${data.name}`;
        } catch {
          resultsDiv.innerText = "Invalid QR format.";
        }
      }
    );

  } catch (err) {
    console.error("Scanner error:", err);
  }
}

document.getElementById("camera-switch").addEventListener("click", () => {
  if (!cameras.length) return;
  currentCam = (currentCam + 1) % cameras.length;
  startScanner();
});

// ✅ Modal controls
finalizeBtn.addEventListener("click", () => modal.style.display = "flex");
confirmFinalize.addEventListener("click", () => {
  finalizeAttendance();
  modal.style.display = "none";
});
cancelFinalize.addEventListener("click", () => modal.style.display = "none");

// 🔹 Track Auth
onAuthStateChanged(auth, user => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.innerText = `✅ Logged in as: ${user.email}`;
    loadStudentTable();
    startScanner();
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInfo.innerText = "Not signed in";
    studentBody.innerHTML = "";
  }
});
