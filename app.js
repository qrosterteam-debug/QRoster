// app.js
let students = [
  { id: "001", name: "Alice Johnson", section: "A", status: "Pending", time: "" },
  { id: "002", name: "Bob Smith", section: "A", status: "Pending", time: "" },
  { id: "003", name: "Charlie Brown", section: "B", status: "Pending", time: "" }
];
let history = JSON.parse(localStorage.getItem("attendanceHistory")) || [];
let qrScanner;
let currentCamera = { facingMode: "environment" };

// Utility
function todayDate() {
  return new Date().toLocaleDateString();
}

// Render students
function renderStudents() {
  const tbody = document.getElementById("student-body");
  tbody.innerHTML = "";
  students.forEach(stu => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${stu.id}</td>
      <td>${stu.name}</td>
      <td>${stu.section}</td>
      <td class="${stu.status === "Present" ? "present" : stu.status === "Absent" ? "absent" : ""}">${stu.status}</td>
      <td>${stu.time}</td>
    `;
    tbody.appendChild(row);
  });
  updateStats();
  document.getElementById("finalize-btn").style.display = "block";
}

// Update stats
function updateStats() {
  document.getElementById("total-students").textContent = students.length;
  document.getElementById("present-students").textContent = students.filter(s => s.status === "Present").length;
  document.getElementById("absent-students").textContent = students.filter(s => s.status === "Absent").length;
}

// Mark attendance from QR scan
function markAttendance(id) {
  const student = students.find(s => s.id === id);
  if (student && student.status === "Pending") {
    student.status = "Present";
    student.time = new Date().toLocaleTimeString();
    renderStudents();
  }
}

// Initialize QR scanner
function initScanner() {
  const qrRegion = document.getElementById("qr-reader");
  if (qrScanner) {
    qrScanner.stop().then(() => {
      qrScanner.clear();
      startScanner();
    });
  } else {
    startScanner();
  }
}
function startScanner() {
  qrScanner = new Html5Qrcode("qr-reader");
  qrScanner.start(
    currentCamera,
    { fps: 10, qrbox: { width: 250, height: 250 } },
    qrCodeMessage => {
      document.getElementById("qr-reader-results").textContent = `Scanned: ${qrCodeMessage}`;
      markAttendance(qrCodeMessage.trim());
    }
  ).catch(err => console.error("QR Scanner error:", err));
}

// Camera switch
document.getElementById("switch-front").addEventListener("click", () => {
  currentCamera = { facingMode: "user" };
  initScanner();
});
document.getElementById("switch-back").addEventListener("click", () => {
  currentCamera = { facingMode: "environment" };
  initScanner();
});

// Finalize attendance with confirmation
document.getElementById("finalize-btn").addEventListener("click", () => {
  document.getElementById("confirm-modal").style.display = "flex";
});
document.getElementById("cancel-finalize").addEventListener("click", () => {
  document.getElementById("confirm-modal").style.display = "none";
});
document.getElementById("confirm-finalize").addEventListener("click", () => {
  students.forEach(s => {
    if (s.status === "Pending") {
      s.status = "Absent";
      s.time = new Date().toLocaleTimeString();
    }
  });

  // Save to history
  const record = students.map(s => ({
    ...s,
    date: todayDate()
  }));
  history.push(...record);
  localStorage.setItem("attendanceHistory", JSON.stringify(history));

  // Reset students for next day
  students = students.map(s => ({ ...s, status: "Pending", time: "" }));

  renderStudents();
  document.getElementById("confirm-modal").style.display = "none";

  // Show banner
  const banner = document.getElementById("success-banner");
  banner.style.display = "block";
  setTimeout(() => banner.style.display = "none", 3000);
});

// History filter
document.getElementById("filter-btn").addEventListener("click", () => {
  const date = document.getElementById("filter-date").value;
  const tbody = document.getElementById("filter-body");
  tbody.innerHTML = "";
  history.filter(h => h.date === date).forEach(stu => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${stu.id}</td>
      <td>${stu.name}</td>
      <td>${stu.section}</td>
      <td>${stu.date}</td>
      <td>${stu.time}</td>
      <td class="${stu.status === "Present" ? "present" : "absent"}">${stu.status}</td>
    `;
    tbody.appendChild(row);
  });
});

// Reset if new day
function checkNewDay() {
  const lastSavedDate = localStorage.getItem("lastAttendanceDate");
  const today = todayDate();
  if (lastSavedDate !== today) {
    students = students.map(s => ({ ...s, status: "Pending", time: "" }));
    localStorage.setItem("lastAttendanceDate", today);
  }
}

// Initialize page
checkNewDay();
renderStudents();
initScanner();
