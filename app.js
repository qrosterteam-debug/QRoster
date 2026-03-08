// app.js - ONLY the two requested fixes applied
// 1. Export CSV only works if finalized (or when viewing history)
// 2. History now uses time in docID and display ("Subject — Date Time")

// module import for student data
import { students } from "./students.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdTrOmPZzwW4LtMNQvPSSMNbz-r-yhNtY",
  authDomain: "qroster-4a631.firebaseapp.com",
  projectId: "qroster-4a631",
  storageBucket: "qroster-4a631.firebasestorage.app",
  messagingSenderId: "961257265744",
  appId: "1:961257265744:web:9f709bb6b6df541c8b8f55"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const SUBJECTS = [
  "Computer Systems Services",
  "Media and Information Literacy",
  "Empowerment Technologies",
  "Personal Development",
  "Inquiries Investigations and Immersion",
  "Physical Education & Health",
  "Work Immersion Program"
];

let currentSubject = null;
let scannedStudents = {};
let scanner = null;
let currentUser = null;
let isLoading = false;
let isFinalized = false;
let isViewingHistory = false;

function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  const userInfoBtn = document.getElementById("user-info-btn");
  const loginBtn = document.getElementById("login");
  const registerBtn = document.getElementById("register");
  const logoutBtn = document.getElementById("logout");

  if (user) {
    if (userInfoBtn) userInfoBtn.style.display = "inline-block";
    if (loginBtn) loginBtn.style.display = "none";
    if (registerBtn) registerBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";

    // Home tab update...
    const homeDesc = document.getElementById("home-description");
    if (homeDesc) {
      homeDesc.innerHTML = `
        <h3>Step-by-Step Guide to Using QRoster</h3>
        <ol>
          <li><strong>Manage Your Profile:</strong> Click the user icon (👤) in the top-right corner to access User Info. Customize your Full Name, Birthday, Age, Gender, and Username. These settings are saved to your account.</li>
          <li><strong>Select a Subject:</strong> Click on one of the subject buttons in the "Take Attendance" tab to start a new session. This sets the current subject for attendance tracking.</li>
          <li><strong>Start the Scanner:</strong> Press the "Start Scanner" button to activate the QR code reader. Ensure your camera is enabled and point it at student QR codes.</li>
          <li><strong>Scan Student QR Codes:</strong> As students scan their codes, they are automatically marked as present. The attendance table updates in real-time.</li>
          <li><strong>Monitor Attendance:</strong> View the summary showing present and absent counts, along with the attendance percentage.</li>
          <li><strong>Finalize the Session:</strong> Once done, click "Finalize & Save Attendance" to save the record to the cloud. This action cannot be undone.</li>
          <li><strong>Export Data:</strong> Use the "Export as CSV" button to download the attendance data for your records or reports.</li>
          <li><strong>Review History:</strong> Switch to the "History" tab to view past attendance records. Click on any record to load and review it. You can also delete unwanted records.</li>
        </ol>
        <p><em>Tip: Always finalize sessions to save data securely. Update your profile information in User Info to keep your account personalized.</em></p>
      `;
    }
  } else {
    if (userInfoBtn) userInfoBtn.style.display = "none";
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (registerBtn) registerBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";

    // Update home tab for not logged-in
    const homeDesc = document.getElementById("home-description");
    if (homeDesc) {
      homeDesc.innerHTML = `
        <p>QRoster is a modern, efficient attendance management system designed for educational institutions. It leverages QR code technology to streamline the process of tracking student attendance, ensuring accuracy and speed.</p>
        <p><strong>Key Features:</strong></p>
        <ul>
          <li>Real-time QR code scanning for instant attendance marking.</li>
          <li>Secure cloud storage of attendance records.</li>
          <li>Comprehensive history and export options for reports.</li>
          <li>User-friendly interface for teachers and administrators.</li>
        </ul>
        <p>To get started, please log in or register an account. Once authenticated, you can begin taking attendance and managing records seamlessly.</p>
      `;
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const scannerBtn = document.getElementById("start-scan");
  const finalizeBtn = document.getElementById("finalize");
  const exportBtn = document.getElementById("export-csv");
  const historyList = document.getElementById("history-list");
  const loginBtn = document.getElementById("login");
  const registerBtn = document.getElementById("register");
  const logoutBtn = document.getElementById("logout");

  const finalizeModal = document.getElementById("finalizeModal");
  const finalizeOk = document.getElementById("finalizeOk");
  const finalizeCancel = document.getElementById("finalizeCancel");

  // Delete confirmation modal elements
  const deleteModal = document.getElementById("deleteModal");
  const deleteOk = document.getElementById("deleteOk");
  const deleteCancel = document.getElementById("deleteCancel");

  // User info modal elements
  const userInfoModal = document.getElementById("userInfoModal");
  const userInfoBtn = document.getElementById("user-info-btn");
  const userInfoSave = document.getElementById("userInfoSave");
  const userInfoClose = document.getElementById("userInfoClose");
  const userFullnameInput = document.getElementById("user-fullname-input");
  const userBirthdayInput = document.getElementById("user-birthday-input");
  const userAgeInput = document.getElementById("user-age-input");
  const userGenderInput = document.getElementById("user-gender-input");
  const userUsernameInput = document.getElementById("user-username-input");

  const loginModal = document.getElementById("loginModal");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginSubmit = document.getElementById("loginSubmit");
  const loginCancel = document.getElementById("loginCancel");

  const registerModal = document.getElementById("registerModal");
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = document.getElementById("registerPassword");
  const registerSubmit = document.getElementById("registerSubmit");
  const registerCancel = document.getElementById("registerCancel");

  // Password visibility toggles
  document.querySelectorAll('.eye-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      const input = icon.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await auth.signOut();
      showToast("👋 Logged out.");
    });
  }

  // Open Login Modal
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      loginModal.style.display = "block";
      loginEmail.value = "";
      loginPassword.value = "";
      loginEmail.focus();
    });
  }

  // Open Register Modal
  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      registerModal.style.display = "block";
      registerEmail.value = "";
      registerPassword.value = "";
      registerEmail.focus();
    });
  }

  // Submit Login
  if (loginSubmit) {
    loginSubmit.addEventListener("click", async () => {
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();

      if (!email || !password) {
        showToast("⚠️ Please enter email and password!");
        return;
      }

      try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast("✅ Logged in successfully!");
        loginModal.style.display = "none";
      } catch (e) {
        showToast("❌ Login failed — check email/password");
      }
    });
  }

  // Submit Register
  if (registerSubmit) {
    registerSubmit.addEventListener("click", async () => {
      const email = registerEmail.value.trim();
      const password = registerPassword.value.trim();

      if (!email || !password) {
        showToast("⚠️ Please enter email and password!");
        return;
      }

      if (password.length < 6) {
        showToast("⚠️ Password must be at least 6 characters!");
        return;
      }

      try {
        await auth.createUserWithEmailAndPassword(email, password);
        showToast("✅ Registration successful! Logging you in...");
        registerModal.style.display = "none";
      } catch (e) {
        showToast("❌ Registration failed — try again");
      }
    });
  }

  // Cancel buttons
  if (loginCancel) loginCancel.addEventListener("click", () => loginModal.style.display = "none");
  if (registerCancel) registerCancel.addEventListener("click", () => registerModal.style.display = "none");

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add("active");

      if (tab.dataset.target === "history-tab" && currentUser) loadHistoryList();
    });
  });

  // Subject buttons
  const container = document.getElementById("subjects-container");
  if (container) {
    SUBJECTS.forEach((subject, idx) => {
      const btn = document.createElement("button");
      btn.className = "subject-btn";
      btn.innerText = subject;
      btn.addEventListener("click", () => selectSubject(idx));
      container.appendChild(btn);
    });
  }

  function selectSubject(idx) {
    isViewingHistory = false;
    currentSubject = SUBJECTS[idx];
    scannedStudents = {};
    isFinalized = false;
    if (finalizeBtn) finalizeBtn.style.display = 'inline-block'; // show finalize button for new session
    showToast(`📘 ${currentSubject} selected`);
    document.getElementById("attendance-subject").innerText = currentSubject;
    showAttendanceUI(); // show all UI elements for taking new attendance
    renderAttendanceTable();
  }

  function renderAttendanceTable() {
    const tbody = document.getElementById("attendance-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    students.forEach(st => {
      const rec = scannedStudents[st.studentid];
      const tr = document.createElement("tr");

      let statusText = "—";
      let statusClass = "";

      if (rec) {
        statusText = "Present";
        statusClass = "present";
      } else if (isFinalized) {
        statusText = "Absent";
        statusClass = "absent";
      }

      tr.innerHTML = `
        <td>${st.studentid}</td>
        <td>${st.name}</td>
        <td>${st.section}</td>
        <td class="${statusClass}">${statusText}</td>
        <td>${rec ? rec.time : "—"}</td>
      `;

      tbody.appendChild(tr);
    });

    updateAttendanceSummary();
  }

  function updateAttendanceSummary() {    // Skip summary update if viewing history
    if (isViewingHistory) return;
        const present = Object.keys(scannedStudents).length;
    const total = students.length;
    const percent = total ? Math.round((present / total) * 100) : 0;
    const el = document.getElementById("attendance-summary");
    if (el) {
      el.innerHTML = `<strong>Present:</strong> ${present} <strong>Absent:</strong> ${total - present} <strong>Attendance:</strong> ${percent}%`;
    }
  }

  async function startScanner() {
    if (!currentSubject) return showToast("⚠️ Select a subject first!");
    if (typeof Html5Qrcode === 'undefined') return showToast("❌ Scanner library not loaded!");

    if (!scanner) scanner = new Html5Qrcode("qr-video");

    scannerBtn.innerText = "⏹️ Stop Scanner";
    scannerBtn.disabled = true;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        handleScan
      );
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to start scanner! Try again.");
    } finally {
      scannerBtn.disabled = false;
    }
  }

  async function stopScanner() {
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch (err) {
        console.error("Scanner stop error:", err);
      }
      scanner = null;
      scannerBtn.innerText = "📷 Start Scanner";
      showToast("⏹️ Scanner stopped.");
    }
  }

  if (scannerBtn) {
    scannerBtn.addEventListener("click", () => {
      scanner ? stopScanner() : startScanner();
    });
  }

  function handleScan(decodedText) {
    try {
      const data = JSON.parse(decodedText);
      if (!data.studentid) return showToast("⚠️ Invalid QR Code data!");

      const student = students.find(s => s.studentid === data.studentid);
      if (!student) return showToast("⚠️ Student not in roster!");

      if (scannedStudents[data.studentid]) return showToast(`⚠️ ${data.name || student.name} already scanned!`);

      scannedStudents[data.studentid] = {
        ...data,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      showToast(`✅ ${data.name || student.name} marked present!`);
      renderAttendanceTable();
    } catch (e) {
      showToast("⚠️ Invalid QR Code format!");
    }
  }

  if (finalizeBtn) {
    finalizeBtn.addEventListener("click", () => {
      if (!currentSubject) return showToast("⚠️ Select a subject first!");
      if (!currentUser) return showToast("⚠️ Please login first!");
      if (Object.keys(scannedStudents).length === 0) return showToast("⚠️ Scan at least one student first!");
      
      finalizeModal.style.display = "block";
    });
  }

  if (finalizeOk) {
    finalizeOk.addEventListener("click", async () => {
      finalizeModal.style.display = "none";
      const now = new Date();
      const date = now.toISOString().split("T")[0];
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).replace(":", "-");
      const safeSubject = currentSubject.replace(/[^a-zA-Z0-9]/g, '_');
      const docId = `${safeSubject}_${date}_${time}_${currentUser.uid}`;
      const ref = db.collection("attendance").doc(docId);

      try {
        await ref.set({
          teacher: currentUser.email,
          subject: currentSubject,
          date,
          time,
          records: scannedStudents,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast("✅ Attendance saved and finalized!");
        isFinalized = true;
        renderAttendanceTable();
      } catch (err) {
        console.error(err);
        showToast("❌ Unable to save attendance!");
      }
    });
  }

  if (finalizeCancel) {
    finalizeCancel.addEventListener("click", () => finalizeModal.style.display = "none");
  }

  // Delete modal buttons
  if (deleteOk) deleteOk.addEventListener('click', deleteConfirmed);
  if (deleteCancel) deleteCancel.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    pendingDelete.id = null;
    pendingDelete.elem = null;
  });

  // User info modal
  if (userInfoBtn) userInfoBtn.addEventListener('click', () => {
    loadUserProfile();
    userInfoModal.style.display = 'block';
  });
  if (userInfoSave) userInfoSave.addEventListener('click', saveUserProfile);
  if (userInfoClose) userInfoClose.addEventListener('click', () => {
    userInfoModal.style.display = 'none';
  });

  // EXPORT CSV - ONLY WORKS IF FINALIZED (or when viewing history)
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentSubject) return showToast("⚠️ Select a subject first!");
      if (!isFinalized) return showToast("⚠️ Finalize attendance first!");

      let csv = "Student ID,Name,Section,Status,Time\n";
      students.forEach(st => {
        const rec = scannedStudents[st.studentid];
        const status = rec ? "Present" : "Absent";
        const time = rec ? rec.time : "";
        // Escape names that might contain commas
        const name = st.name.includes(",") ? `"${st.name}"` : st.name;
        csv += `${st.studentid},${name},${st.section},${status},${time}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${currentSubject}_attendance_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast("📄 CSV exported!");
    });
  }

  // HISTORY - WITH TIME IN DOCID AND DISPLAY
  async function loadHistoryList() {
    if (!currentUser || !historyList) return;
    historyList.innerHTML = "<p>Loading history...</p>";

    try {
      const snapshot = await db.collection("attendance")
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();

      if (snapshot.empty) {
        historyList.innerHTML = "<p>No past records found.</p>";
        return;
      }

      historyList.innerHTML = "";
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const subject = data.subject || "Unknown";
        const date = data.date || "Unknown";
        const time = data.time || "Unknown";
        const id = docSnap.id; // use actual Firestore document ID

        const item = document.createElement("div");
        item.className = "history-item";
        // make container flex to position delete icon
        item.innerHTML = `
          <span class="history-label"><strong>${subject}</strong> — ${date} ${time}</span>
          <button class="delete-history" title="Delete record">🗑️</button>
        `;
        item.addEventListener("click", () => loadSingleHistory(id));
        // wire up delete button separately
        const delBtn = item.querySelector('.delete-history');
        if (delBtn) {
          delBtn.addEventListener('click', e => {
            e.stopPropagation();
            showDeleteModal(id, subject, date, time, item);
          });
        }
        historyList.appendChild(item);
      });
    } catch (err) {
      console.error(err);
      historyList.innerHTML = "<p>Failed to load history.</p>";
    }
  }

  // delete modal handling state
  let pendingDelete = { id: null, elem: null };

  function showDeleteModal(docId, subject, date, time, elem) {
    pendingDelete.id = docId;
    pendingDelete.elem = elem;
    const msg = deleteModal.querySelector('.modal-message');
    if (msg) msg.innerText = `Delete attendance record for ${subject} — ${date} ${time}?`;
    deleteModal.style.display = 'block';
  }

  async function deleteConfirmed() {
    deleteModal.style.display = 'none';
    if (!pendingDelete.id) return;
    try {
      await db.collection('attendance').doc(pendingDelete.id).delete();
      showToast('🗑️ Record deleted');
      if (pendingDelete.elem) pendingDelete.elem.remove();
    } catch (e) {
      console.error(e);
      showToast('❌ Delete failed');
    } finally {
      pendingDelete.id = null;
      pendingDelete.elem = null;
    }
  }

  function hideAttendanceUI() {
    // Hide subjects section
    const subjectsSection = document.getElementById("subjects-section");
    if (subjectsSection) subjectsSection.style.display = 'none';
    
    // Hide scanner controls
    const scannerBtn = document.getElementById("start-scan");
    if (scannerBtn) scannerBtn.style.display = 'none';
    const qrVideo = document.getElementById("qr-video");
    if (qrVideo) qrVideo.style.display = 'none';
    
    // Hide finalize button
    if (finalizeBtn) finalizeBtn.style.display = 'none';
    
    // Change heading to indicate viewing mode
    const h2 = document.querySelector('#attendance-tab h2');
    if (h2) h2.textContent = 'Viewing Previous/Recorded Attendance';
    
    // Hide the h3 Current Session heading
    const h3 = document.querySelector('#attendance-tab h3');
    if (h3) h3.style.display = 'none';
  }

  function showAttendanceUI() {
    // Show subjects section
    const subjectsSection = document.getElementById("subjects-section");
    if (subjectsSection) subjectsSection.style.display = 'block';
    
    // Show scanner controls
    const scannerBtn = document.getElementById("start-scan");
    if (scannerBtn) scannerBtn.style.display = 'inline-block';
    const qrVideo = document.getElementById("qr-video");
    if (qrVideo) qrVideo.style.display = 'block';
    
    // Restore heading to Take Attendance
    const h2 = document.querySelector('#attendance-tab h2');
    if (h2) h2.textContent = 'Take Attendance';
    
    // Show and restore the h3 Current Session heading
    const h3 = document.querySelector('#attendance-tab h3');
    if (h3) {
      h3.style.display = 'block';
      h3.innerHTML = 'Current Session: <span id="attendance-subject" style="color:var(--primary);font-weight:bold;">—</span>';
    }
  }

  async function loadSingleHistory(docId) {
    try {
      const doc = await db.collection("attendance").doc(docId).get();
      if (!doc.exists) { // property, not function
        showToast("📭 No record found.");
        return;
      }

      const data = doc.data();
      isViewingHistory = true;
      currentSubject = data.subject || "";
      scannedStudents = data.records || {};
      isFinalized = true;   // ← This makes Export CSV work when viewing history
      
      // Hide subject selection and scanner when viewing history
      hideAttendanceUI();
      
      // Clear the h3 element that shows "Current Session: —"
      const h3 = document.querySelector('#attendance-tab h3');
      if (h3) {
        h3.style.display = 'none';
        h3.innerHTML = ''; // Clear the content completely
      }
      
      // Format the display with summary inline
      const present = Object.keys(scannedStudents).length;
      const total = students.length;
      const percent = total ? Math.round((present / total) * 100) : 0;
      
      const summaryEl = document.getElementById("attendance-summary");
      if (summaryEl) {
        summaryEl.style.display = 'block';
        summaryEl.innerHTML = `<strong>Current Session:</strong> ${data.subject || ""} (${data.date || ""} ${data.time || ""}) <br> <strong>Present:</strong> ${present} <strong>Absent:</strong> ${total - present} <strong>Attendance:</strong> ${percent}%`;
      }
      
      renderAttendanceTable();
      // Keep History tab selected, don't switch to Take Attendance tab
      const historyTab = document.querySelector('.tab[data-target="history-tab"]');
      if (historyTab) historyTab.classList.add('active');
      const attendanceTab = document.querySelector('.tab[data-target="attendance-tab"]');
      if (attendanceTab) attendanceTab.classList.remove('active');
      const historyContent = document.getElementById('history-tab');
      if (historyContent) historyContent.classList.remove('active');
      const attendanceContent = document.getElementById('attendance-tab');
      if (attendanceContent) attendanceContent.classList.add('active');
      showToast(`✅ Loaded ${data.subject || ""} - ${data.date || ""} ${data.time || ""}`);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to load record.");
    }
  }

  // User profile functions
  async function loadUserProfile() {
    if (!currentUser) return;
    
    // Set defaults first
    userFullnameInput.value = currentUser.displayName || '';
    userBirthdayInput.value = '';
    userAgeInput.value = '';
    userGenderInput.value = '';
    userUsernameInput.value = 'TEACHER';
    
    try {
      const doc = await db.collection('users').doc(currentUser.uid).get();
      if (doc.exists) {
        const data = doc.data();
        userFullnameInput.value = data.fullname || currentUser.displayName || '';
        userBirthdayInput.value = data.birthday || '';
        userAgeInput.value = data.age || '';
        userGenderInput.value = data.gender || '';
        userUsernameInput.value = data.username || 'TEACHER';
      }
    } catch (e) {
      console.error('Error loading profile:', e);
      // Silently fail - defaults are already set
    }
  }

  async function saveUserProfile() {
    if (!currentUser) return;
    const profile = {
      fullname: userFullnameInput.value.trim() || currentUser.displayName || '',
      birthday: userBirthdayInput.value || '',
      age: userAgeInput.value ? parseInt(userAgeInput.value) : null,
      gender: userGenderInput.value || '',
      username: userUsernameInput.value.trim() || 'TEACHER',
      updatedAt: new Date().toISOString()
    };
    try {
      await db.collection('users').doc(currentUser.uid).set(profile, { merge: true });
      showToast('✅ Profile saved');
      userInfoModal.style.display = 'none';
    } catch (e) {
      console.error('Error saving profile:', e);
      showToast('⚠️ Profile saved locally (cloud sync may be pending)');
      userInfoModal.style.display = 'none';
    }
  }

  updateAttendanceSummary();
});