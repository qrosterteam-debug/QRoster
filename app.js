// ✅ Import Firebase SDK from CDN
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

import { students } from "./students.js"; // 🔹 Import student list

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

// ✅ Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// HTML Elements
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const userInfo = document.getElementById("user-info");
const attendanceDiv = document.getElementById("attendance");
const studentBody = document.getElementById("student-body");
const historyBtn = document.getElementById("view-history");
const historyDiv = document.getElementById("history");
const finalizeBtn = document.getElementById("mark-absentees");

// 🔹 Login
loginBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then(result => {
      const user = result.user;
      userInfo.innerText = `✅ Logged in as: ${user.email}`;
    })
    .catch(err => console.error("Login error:", err));
});

// 🔹 Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    userInfo.innerText = "❌ Logged out.";
  });
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
      <td class="status"> </td>
      <td class="time">—</td>
    `;
    studentBody.appendChild(row);
  });
}

// ✅ Save Attendance + Update Table
async function markAttendance(studentId, name, section) {
  if (!isWithinClassHours()) {
    attendanceDiv.innerText = `⏰ Attendance closed. ${name} not recorded.`;
    return;
  }

  const now = new Date();
  const date = now.toLocaleDateString("en-GB");
  const time = now.toLocaleTimeString("en-GB");
  const dateTime = `${date} ${time}`;

  try {
    await setDoc(doc(db, "attendance", `${studentId}_${date}`), {
      studentId,
      name,
      section,
      date,
      time,
      timestamp: serverTimestamp(),
      status: "Present"
    });

    attendanceDiv.innerText = `📌 Marked Present: ${name}`;

    const row = document.getElementById(studentId);
    if (row) {
      row.querySelector(".status").innerText = "Present";
      row.querySelector(".status").classList.add("present");
      row.querySelector(".time").innerText = dateTime;
    }

  } catch (e) {
    console.error("Error adding attendance: ", e);
  }
}

// ✅ Mark Absentees
async function markAbsenteesForToday() {
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
        status: "Absent"
      });
      console.log(`🚨 Marked Absent: ${s.name}`);
    }
  }

  attendanceDiv.innerText = "✅ All absentees marked for today.";
}

// ✅ History
async function loadHistory() {
  historyDiv.innerHTML = "<h3>📜 Attendance History</h3>";

  const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    historyDiv.innerHTML += "<p>No attendance records found.</p>";
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <tr>
      <th>Student ID</th>
      <th>Name</th>
      <th>Section</th>
      <th>Date</th>
      <th>Time</th>
      <th>Status</th>
    </tr>
  `;

  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.studentId}</td>
      <td>${data.name}</td>
      <td>${data.section}</td>
      <td>${data.date || "—"}</td>
      <td>${data.time || "—"}</td>
      <td>${data.status}</td>
    `;
    table.appendChild(row);
  });

  historyDiv.appendChild(table);
}

// ✅ Timeframe checker
function isWithinClassHours() {
  const now = new Date();
  const start = new Date();
  start.setHours(7, 30, 0);
  const end = new Date();
  end.setHours(15, 50, 0);
  return now >= start && now <= end;
}

// ✅ QR Scanner Setup with Camera Selection
async function startQRScanner() {
  const cameraSelect = document.createElement("select");
  cameraSelect.id = "camera-select";
  document.getElementById("qr-reader").insertAdjacentElement("beforebegin", cameraSelect);

  try {
    const cameras = await Html5Qrcode.getCameras();
    if (cameras && cameras.length) {
      cameras.forEach((cam, idx) => {
        const option = document.createElement("option");
        option.value = cam.id;
        option.text = cam.label || `Camera ${idx + 1}`;
        cameraSelect.appendChild(option);
      });

      // Auto start first camera
      startScannerWithCamera(cameras[0].id);

      // Change camera on selection
      cameraSelect.addEventListener("change", (e) => {
        startScannerWithCamera(e.target.value);
      });
    } else {
      alert("No cameras found.");
    }
  } catch (err) {
    console.error("Camera error:", err);
  }
}

let qrReader; 
async function startScannerWithCamera(cameraId) {
  if (qrReader) {
    await qrReader.stop().catch(() => {});
  }
  qrReader = new Html5Qrcode("qr-reader");

  qrReader.start(
    { deviceId: { exact: cameraId } },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      try {
        const studentData = JSON.parse(decodedText);
        markAttendance(studentData.studentId, studentData.name, studentData.section);
        document.getElementById("qr-reader-results").innerText = 
          `✅ Scanned: ${studentData.name}`;
      } catch (err) {
        console.error("Invalid QR format", err);
      }
    }
  ).catch(err => {
    console.error("Camera start error:", err);
  });
}

// 🔹 Track Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.innerText = `✅ Logged in as: ${user.email}`;

    loadStudentTable();
    startQRScanner();
    scheduleAutoFinalize();

    historyBtn.style.display = "inline-block";
    finalizeBtn.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInfo.innerText = "";
    studentBody.innerHTML = "";
    historyBtn.style.display = "none";
    finalizeBtn.style.display = "none";
    historyDiv.innerHTML = "";
  }
});

// 🔹 Buttons
historyBtn.addEventListener("click", loadHistory);
finalizeBtn.addEventListener("click", markAbsenteesForToday);

// 🔹 Filter attendance by date
async function filterAttendanceByDate(selectedDate) {
  const filterBody = document.getElementById("filter-body");
  filterBody.innerHTML = "";

  try {
    const q = query(
      collection(db, "attendance"),
      where("date", "==", selectedDate),
      orderBy("time", "asc")
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      filterBody.innerHTML = `<tr><td colspan="6">No records found for ${selectedDate}</td></tr>`;
      return;
    }

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const row = `
        <tr>
          <td>${data.studentId}</td>
          <td>${data.name}</td>
          <td>${data.section}</td>
          <td>${data.date}</td>
          <td>${data.time}</td>
          <td>${data.status}</td>
        </tr>
      `;
      filterBody.innerHTML += row;
    });

  } catch (err) {
    console.error("Error filtering attendance:", err);
  }
}

document.getElementById("filter-btn").addEventListener("click", () => {
  const selectedDate = document.getElementById("filter-date").value;
  if (selectedDate) {
    const [year, month, day] = selectedDate.split("-");
    const formattedDate = `${day}/${month}/${year}`;
    filterAttendanceByDate(formattedDate);
  }
});

// ✅ Auto Finalize Attendance at 3:50 PM
function scheduleAutoFinalize() {
  const now = new Date();
  const target = new Date();

  target.setHours(15, 50, 0, 0);

  if (now > target) {
    console.log("⏰ Finalization time already passed today.");
    return;
  }

  const msUntilFinalize = target - now;

  setTimeout(() => {
    console.log("⏰ Auto-finalizing attendance...");
    markAbsenteesForToday();
  }, msUntilFinalize);
}
