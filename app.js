<<<<<<< HEAD
// Firebase Config - REPLACE WITH YOUR CONFIG
=======
// app.js - FINAL VERSION WITH ALL FIXES + REGISTRATION
// - Status "—" by default, "Present" when scanned, "Absent" after finalize
// - CSV export fixed (correct filename and data)
// - History load fixed
// - Registration modal + auto login after register

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

>>>>>>> parent of db2c21c (QRoster - Complete attendance system with Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyDdTrOmPZzwW4LtMNQvPSSMNbz-r-yhNtY",
    authDomain: "qroster-4a631.firebaseapp.com",
    projectId: "qroster-4a631",
    storageBucket: "qroster-4a631.appspot.com",
    messagingSenderId: "961257265744",
    appId: "1:961257265744:web:9f709bb6b6df541c8b8f55"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Constants
const ROLES_COLLECTION = 'users';

// Global State
let currentUser = null;
let currentRole = 'teacher'; // default, will be updated from DB
let html5QrCode = null;
let currentClassId = null;
let currentClassStudents = [];      // loaded dynamically from import
let scannedStudents = {};
let currentAttendance = {};
let isFinalized = false;

// DOM Elements
const elements = {
    authForm: document.getElementById('auth-form'),
    authSubmit: document.getElementById('auth-submit'),
    authText: document.getElementById('auth-text'),
    toggleAuth: document.getElementById('toggle-auth'),
    toggleText: document.getElementById('toggle-text'),
    classSelect: document.getElementById('class-select'),
    subjectSelect: document.getElementById('subject-select'),
    startScanner: document.getElementById('start-scanner'),
    finalizeAttendance: document.getElementById('finalize-attendance'),
    exportCsv: document.getElementById('export-csv'),
    scannerContainer: document.getElementById('scanner-container'),
    attendanceContainer: document.getElementById('attendance-table-container'),
    historyStartDate: document.getElementById('history-start-date'),
    historyEndDate: document.getElementById('history-end-date'),
    filterHistory: document.getElementById('filter-history'),
    historyList: document.getElementById('history-list'),
    qrName: document.getElementById('qr-name'),
    qrSection: document.getElementById('qr-section'),
    qrLrn: document.getElementById('qr-lrn'),
    generateQr: document.getElementById('generate-qr'),
    downloadQr: document.getElementById('download-qr'),
    printQr: document.getElementById('print-qr'),
    qrPreview: document.getElementById('qr-preview'),
    newClassName: document.getElementById('new-class-name'),
    createClass: document.getElementById('create-class'),
    csvImport: document.getElementById('csv-import'),
    importStudents: document.getElementById('import-students'),
    classesList: document.getElementById('classes-list'),
    newSubject: document.getElementById('new-subject'),
    addSubject: document.getElementById('add-subject'),
    subjectsList: document.getElementById('subjects-list'),
    mySubjectSelect: document.getElementById('my-subject-select'),
    myAttendanceList: document.getElementById('my-attendance-list'),
    analyticsDashboard: document.getElementById('analytics-dashboard'),
    adminUsersList: document.getElementById('admin-users-list')
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();
    auth.onAuthStateChanged(onAuthStateChanged);
});

function initEventListeners() {
    // Auth
    if (elements.authForm) elements.authForm.addEventListener('submit', handleAuth);
    if (elements.toggleAuth) elements.toggleAuth.addEventListener('click', toggleAuthMode);

    // Attendance
    if (elements.classSelect) elements.classSelect.addEventListener('change', loadClassStudents);
    if (elements.startScanner) elements.startScanner.addEventListener('click', toggleScanner);
    if (elements.finalizeAttendance) elements.finalizeAttendance.addEventListener('click', finalizeAttendance);
    if (elements.exportCsv) elements.exportCsv.addEventListener('click', exportCSV);

    // History
    if (elements.filterHistory) elements.filterHistory.addEventListener('click', loadHistory);

    // QR Code Creation
    if (elements.generateQr) elements.generateQr.addEventListener('click', generateQRCode);
    if (elements.downloadQr) elements.downloadQr.addEventListener('click', downloadQRCode);
    if (elements.printQr) elements.printQr.addEventListener('click', printQRCode);

    // Classes
    if (elements.createClass) elements.createClass.addEventListener('click', createClass);
    if (elements.importStudents) elements.importStudents.addEventListener('click', importStudentsFromCSV);
    if (elements.csvImport) elements.csvImport.addEventListener('change', validateCSVFile);

    // Subjects
    if (elements.addSubject) elements.addSubject.addEventListener('click', addSubject);

    // Password eye icons
    document.querySelectorAll('.eye-icon').forEach(icon => {
        icon.addEventListener('click', togglePasswordVisibility);
    });

    // Logout
    document.querySelector('.logout-btn')?.addEventListener('click', logout);
}

async function onAuthStateChanged(user) {
    currentUser = user;

<<<<<<< HEAD
    if (user) {
        await loadUserRole(user.uid);
        await checkAdminPromotion();
        await loadRoleSpecificUI();
        updateUserInfo();
        loadAllData();
    } else {
        showHomeTab();
        hideUserInfo();
    }
}

async function loadUserRole(uid) {
    try {
        const docRef = db.collection(ROLES_COLLECTION).doc(uid);
        const doc = await docRef.get();
        if (doc.exists) {
            currentRole = doc.data().role || 'teacher';
        } else {
            // Auto-assign based on email pattern or default to teacher
            currentRole = uid.includes('@student') || uid.includes('@pupil') ? 'student' : 'teacher';
            await docRef.set({
                email: currentUser.email,
                role: currentRole,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error loading role:', error);
        currentRole = 'teacher';
=======
  // Submit Login
  if (loginSubmit) {
    loginSubmit.addEventListener("click", async () => {
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();

      if (!email || !password) {
        showToast("⚠️ Please enter email and password!");
        return;
      }

      isLoading = true;
      loginSubmit.disabled = true;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("✅ Logged in successfully!");
        loginModal.style.display = "none";
      } catch (e) {
        console.error(e);
        showToast("❌ Login failed — check email/password");
      } finally {
        isLoading = false;
        loginSubmit.disabled = false;
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

      isLoading = true;
      registerSubmit.disabled = true;

      try {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("✅ Registration successful! Logging you in...");
        registerModal.style.display = "none";
      } catch (e) {
        console.error(e);
        if (e.code === "auth/email-already-in-use") {
          showToast("❌ Email already registered!");
        } else {
          showToast("❌ Registration failed — try again");
        }
      } finally {
        isLoading = false;
        registerSubmit.disabled = false;
      }
    });
  }

  // Cancel buttons
  if (loginCancel) loginCancel.addEventListener("click", () => loginModal.style.display = "none");
  if (registerCancel) registerCancel.addEventListener("click", () => registerModal.style.display = "none");

  // Close modals on outside click
  if (loginModal) loginModal.addEventListener("click", (e) => { if (e.target === loginModal) loginModal.style.display = "none"; });
  if (registerModal) registerModal.addEventListener("click", (e) => { if (e.target === registerModal) registerModal.style.display = "none"; });

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add("active");

      if (tab.dataset.target !== "attendance-tab" && scanner) stopScanner();
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
    currentSubject = SUBJECTS[idx];
    scannedStudents = {};
    isFinalized = false;
    showToast(`📘 ${currentSubject} selected`);
    document.getElementById("attendance-subject").innerText = currentSubject;
    renderAttendanceTable();
  }

  function renderAttendanceTable() {
    const tbody = document.getElementById("attendance-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const orderedStudents = students;

    orderedStudents.forEach(st => {
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

  function updateAttendanceSummary() {
    const present = Object.keys(scannedStudents).length;
    const total = students.length;
    const percent = total ? Math.round((present / total) * 100) : 0;
    const el = document.getElementById("attendance-summary");
    if (el) {
      el.innerHTML = `<strong>Present:</strong> ${present} <strong>Absent:</strong> ${total - present} <strong>Attendance:</strong> ${percent}%`;
>>>>>>> parent of db2c21c (QRoster - Complete attendance system with Firebase)
    }
}

async function checkAdminPromotion() {
    // Simple logic: first teacher becomes admin (for free plan)
    try {
        const teachers = await db.collection(ROLES_COLLECTION)
            .where('role', '==', 'teacher')
            .get();

        if (teachers.empty) {
            await db.collection(ROLES_COLLECTION).doc(currentUser.uid).update({
                role: 'admin'
            });
            currentRole = 'admin';
            showToast('You are now the first admin!', 'success');
        }
    } catch (error) {
        console.error('Admin promotion check failed:', error);
    }
}

<<<<<<< HEAD
function loadRoleSpecificUI() {
    const studentTabs = document.querySelector('[data-tab="myattendance"]');
    const adminTabs = document.querySelectorAll('[data-tab="analytics"], [data-tab="admin"]');
    const adminRoleBtn = document.querySelector('.role-btn[data-role="admin"]');

    if (studentTabs) studentTabs.style.display = currentRole === 'student' ? 'block' : 'none';
    adminTabs.forEach(tab => tab.style.display = currentRole === 'admin' ? 'block' : 'none');
    if (adminRoleBtn) adminRoleBtn.style.display = currentRole === 'admin' ? 'inline-flex' : 'none';
}

function updateUserInfo() {
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    const userInfoEl = document.querySelector('.user-info');

    if (userNameEl) userNameEl.textContent = currentUser.email;
    if (userRoleEl) userRoleEl.textContent = currentRole.toUpperCase();
    if (userInfoEl) userInfoEl.style.display = 'flex';
}

function hideUserInfo() {
    const userInfoEl = document.querySelector('.user-info');
    if (userInfoEl) userInfoEl.style.display = 'none';
}

// === AUTH FUNCTIONS ===
async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();

    if (!validateEmail(email)) {
        showToast('Please enter a valid email', 'error');
        return;
    }

    try {
        if (elements.authSubmit) elements.authSubmit.disabled = true;
        if (elements.authText) elements.authText.textContent = 'Signing in...';

        if (elements.authText.textContent.includes('Sign Up')) {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection(ROLES_COLLECTION).doc(userCredential.user.uid).set({
                email,
                role: currentRole,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }

        showToast('Welcome to QRoster!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
=======
    scannerBtn.innerText = "Stop Scanner";
    scannerBtn.disabled = true;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        handleScan
      );
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to start scanner!");
>>>>>>> parent of db2c21c (QRoster - Complete attendance system with Firebase)
    } finally {
        if (elements.authSubmit) elements.authSubmit.disabled = false;
        if (elements.authText) elements.authText.textContent = 'Sign In';
    }
}

<<<<<<< HEAD
function toggleAuthMode() {
    const isRegister = elements.authText.textContent === 'Sign In';
    if (elements.authText) elements.authText.textContent = isRegister ? 'Sign Up' : 'Sign In';
    if (elements.toggleText) elements.toggleText.textContent = isRegister ? 'Have an account?' : 'Need an account?';
    if (elements.toggleAuth) elements.toggleAuth.textContent = isRegister ? 'Sign In' : 'Register';
}
=======
  async function stopScanner() {
    if (scanner) {
      await scanner.stop();
      scanner.clear();
      scanner = null;
      scannerBtn.innerText = "📷 Start Scanner";
      showToast("⏹️ Scanner stopped.");
    }
  }
>>>>>>> parent of db2c21c (QRoster - Complete attendance system with Firebase)

function togglePasswordVisibility(e) {
    const targetId = e.target.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    e.target.className = isPassword ? 'fas fa-eye-slash eye-icon' : 'fas fa-eye eye-icon';
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// === TAB MANAGEMENT ===
function showTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');

    if (tabId === 'home') loadHomeTutorial();
}

<<<<<<< HEAD
function loadHomeTutorial() {
    const tutorialContent = document.getElementById('tutorial-content');
    const tutorialContainer = document.getElementById('tutorial-container');
    if (!tutorialContent || !tutorialContainer) return;

    const content = `
        <div class="tutorial-step">
            <h3>🚀 QRoster - Quick Start Guide</h3>
            <div class="role-selector">
                <h4>Select your role:</h4>
                <button class="role-btn active" data-role="teacher">👨‍🏫 Teacher</button>
                <button class="role-btn" data-role="student">👨‍🎓 Student</button>
            </div>
            <div id="teacher-tutorial" class="tutorial-panel active">
                <h4>👨‍🏫 TEACHER SETUP (5 minutes)</h4>
                <ol>
                    <li><strong>Register/Login</strong> → teacher@school.com</li>
                    <li><strong>Classes tab</strong> → "Import CSV" → Upload student list</li>
                    <li><strong>Subjects tab</strong> → Add "Math", "Science", etc.</li>
                    <li><strong>QR tab</strong> → Generate QR codes for students</li>
                    <li><strong>Attendance tab</strong> → Class + Subject → <strong>Start Scanner</strong></li>
                    <li>Students scan → <strong>Finalize</strong> → <strong>Export CSV</strong> ✅</li>
                </ol>
                <div class="demo-emails">
                    <strong>Example:</strong> teacher@school.com / password123
                </div>
            </div>
            <div id="student-tutorial" class="tutorial-panel">
                <h4>👨‍🎓 STUDENT (30 seconds)</h4>
                <ol>
                    <li><strong>Get QR code</strong> from teacher (print/phone)</li>
                    <li>Teacher says "Scanner ready" → Point camera at QR</li>
                    <li>✅ Green check = Present!</li>
                    <li>Check <strong>My Attendance</strong> anytime</li>
                </ol>
                <div class="demo-emails">
                    <strong>Example:</strong> student@test.com / password123
                </div>
            </div>
        </div>
    `;
=======
  if (finalizeBtn) {
    finalizeBtn.addEventListener("click", () => {
      if (!currentSubject || !currentUser || Object.keys(scannedStudents).length === 0) {
        showToast("⚠️ Complete requirements first!");
        return;
      }
      finalizeModal.style.display = "block";
    });
  }

  if (finalizeOk) {
    finalizeOk.addEventListener("click", async () => {
      finalizeModal.style.display = "none";
      isLoading = true;
      finalizeBtn.disabled = true;

      const date = new Date().toISOString().split("T")[0];
      const safeSubject = currentSubject.replace(/[^a-zA-Z0-9]/g, '_');
      const docId = `${safeSubject}_${date}_${currentUser.uid}`;
      const ref = doc(db, "attendance", docId);

      try {
        await setDoc(ref, {
          teacher: currentUser.email,
          subject: currentSubject,
          date,
          records: scannedStudents,
          timestamp: serverTimestamp()
        });
        showToast("✅ Attendance saved and finalized!");
        isFinalized = true;
        renderAttendanceTable();
      } catch (err) {
        console.error(err);
        showToast("❌ Unable to save attendance!");
      } finally {
        isLoading = false;
        finalizeBtn.disabled = false;
      }
    });
  }

  if (finalizeCancel) {
    finalizeCancel.addEventListener("click", () => {
      finalizeModal.style.display = "none";
    });
  }

  // Export CSV — fixed filename and data
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentSubject) return showToast("⚠️ Select a subject first!");

      let csv = "Student ID,Name,Section,Status,Time\n";
      students.forEach(st => {
        const rec = scannedStudents[st.studentid];
        const status = rec ? "Present" : (isFinalized ? "Absent" : "—");
        csv += `${st.studentid},${st.name},${st.section},${status},${rec ? rec.time : ""}\n`;
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

  // History load — fixed
  async function loadHistoryList() {
    if (!currentUser || !historyList) return;
    historyList.innerHTML = "<p>Loading history...</p>";
>>>>>>> parent of db2c21c (QRoster - Complete attendance system with Firebase)

    tutorialContent.innerHTML = content;
    tutorialContainer.style.display = 'block';

    // Role selector for tutorial
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const role = e.target.dataset.role;
            document.querySelectorAll('.tutorial-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(role === 'teacher' ? 'teacher-tutorial' : 'student-tutorial').classList.add('active');
            document.querySelector('.demo-emails strong').textContent = role === 'teacher' ? 'teacher@school.com' : 'student@test.com';
        });
    });
}

function showHomeTab() {
    showTab('home');
    const tutorialContainer = document.getElementById('tutorial-container');
    if (tutorialContainer) tutorialContainer.style.display = 'none';
}

// === SUBJECTS MANAGEMENT ===
async function loadSubjects() {
    try {
        const snapshot = await db.collection('subjects')
            .doc(currentUser.uid)
            .collection('subjectList')
            .get();

        elements.subjectSelect.innerHTML = '<option value="">Select Subject...</option>';
        elements.mySubjectSelect.innerHTML = '<option value="">All Subjects</option>';

        snapshot.forEach(doc => {
            const subject = doc.data().name;
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            elements.subjectSelect.appendChild(option.cloneNode(true));
            elements.mySubjectSelect.appendChild(option);
        });

        renderSubjectsList(snapshot.docs);
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

async function addSubject() {
    const name = elements.newSubject.value.trim();
    if (!name || name.length < 2) {
        showToast('Subject name must be 2+ characters', 'error');
        return;
    }

    const sanitizedName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();

    try {
<<<<<<< HEAD
        await db.collection('subjects')
            .doc(currentUser.uid)
            .collection('subjectList')
            .add({
                name: sanitizedName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        elements.newSubject.value = '';
        loadSubjects();
        showToast('Subject added!', 'success');
    } catch (error) {
        showToast('Error adding subject', 'error');
    }
}

function renderSubjectsList(docs) {
    elements.subjectsList.innerHTML = docs.length ?
        docs.map(doc => `
            <div class="list-item">
                <span>${doc.data().name}</span>
                <button onclick="deleteSubject('${doc.id}')" class="btn-danger small">Delete</button>
            </div>
        `).join('') : '<p>No subjects yet. Add your first subject!</p>';
}

// === CLASSES MANAGEMENT ===
async function loadClasses() {
    try {
        const snapshot = await db.collection('classes')
            .where('teacherUid', '==', currentUser.uid)
            .get();

        elements.classSelect.innerHTML = '<option value="">Select Class...</option>';

        elements.classesList.innerHTML = snapshot.empty ?
            '<p>No classes yet. Create or import your first class!</p>' :
            snapshot.docs.map(doc => {
                const data = doc.data();
                return `
                    <div class="list-item">
                        <div>
                            <strong>${data.name}</strong><br>
                            <small>${data.students?.length || 0} students</small>
                        </div>
                        <div>
                            <button class="btn-primary small" onclick="selectClass('${doc.id}')">Select</button>
                            <button class="btn-danger small" onclick="deleteClass('${doc.id}')">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

async function createClass() {
    const name = elements.newClassName.value.trim();
    if (!name || name.length < 2) {
        showToast('Class name must be 2+ characters', 'error');
        return;
    }

    try {
        await db.collection('classes').add({
            name: name.replace(/[^a-zA-Z0-9\s]/g, '').trim(),
            teacherUid: currentUser.uid,
            students: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        elements.newClassName.value = '';
        loadClasses();
        showToast('Class created!', 'success');
    } catch (error) {
        showToast('Error creating class', 'error');
    }
}

function validateCSVFile() {
    const file = elements.csvImport.files[0];
    if (file && file.size > 5 * 1024 * 1024) { // 5MB
        showToast('File too large (max 5MB)', 'error');
        elements.csvImport.value = '';
    }
}

async function importStudentsFromCSV() {
    const file = elements.csvImport.files[0];
    if (!file) {
        showToast('Please select a CSV file', 'error');
        return;
    }

    try {
        const text = await file.text();
        const lines = text.trim().split('\n').slice(1); // Skip header
        const students = [];

        for (let line of lines) {
            const [id, name, section, lrn] = line.split(',');
            if (id && name) {
                students.push({
                    id: id.trim(),
                    name: name.trim(),
                    section: section?.trim() || '',
                    lrn: lrn?.trim() || ''
                });
            }
        }

        if (students.length === 0) {
            showToast('No valid students found in CSV', 'error');
            return;
        }

        const className = prompt('Enter class name for these students:');
        if (!className) return;

        await db.collection('classes').add({
            name: className.trim(),
            teacherUid: currentUser.uid,
            students,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        elements.csvImport.value = '';
        loadClasses();
        showToast(`${students.length} students imported!`, 'success');
    } catch (error) {
        showToast('Error importing CSV', 'error');
=======
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        historyList.innerHTML = "<p>No past records found.</p>";
        return;
      }

      historyList.innerHTML = "";
      snapshot.forEach(docSnap => {
        const id = docSnap.id;
        const parts = id.split("_");
        if (parts.length < 3 || parts[parts.length - 1] !== currentUser.uid) return;

        const subject = parts.slice(0, -2).join("_").replace(/_/g, " ");
        const date = parts[parts.length - 2];

        const item = document.createElement("div");
        item.className = "history-item";
        item.innerHTML = `<strong>${subject}</strong> — ${date}`;
        item.addEventListener("click", () => loadSingleHistory(subject, date));
        historyList.appendChild(item);
      });
    } catch (err) {
      console.error(err);
      historyList.innerHTML = "<p>Failed to load history.</p>";
>>>>>>> parent of db2c21c (QRoster - Complete attendance system with Firebase)
    }
}

async function selectClass(classId) {
    currentClassId = classId;
    await loadClassStudents();
    showTab('attendance');
}

async function deleteClass(classId) {
    if (!confirm('Delete this class and all students?')) return;
    try {
<<<<<<< HEAD
        await db.collection('classes').doc(classId).delete();
        loadClasses();
        showToast('Class deleted', 'success');
    } catch (error) {
        showToast('Error deleting class', 'error');
=======
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        showToast("📭 No record found.");
        return;
      }

      const data = snap.data();
      currentSubject = data.subject;
      scannedStudents = data.records || {};
      isFinalized = true;

      document.getElementById("attendance-subject").innerText = `${data.subject} (${data.date})`;
      renderAttendanceTable();

      document.querySelector('.tab[data-target="attendance-tab"]').click();
      showToast(`✅ Loaded ${data.subject} - ${data.date}`);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to load record.");
>>>>>>> parent of db2c21c (QRoster - Complete attendance system with Firebase)
    }
}

// === ATTENDANCE ===
async function loadClassStudents() {
    if (!currentClassId) return;

    try {
        const doc = await db.collection('classes').doc(currentClassId).get();
        if (doc.exists) {
            currentClassStudents = doc.data().students || [];
            scannedStudents = {};
            currentAttendance = {};

            currentClassStudents.forEach(student => {
                currentAttendance[student.id] = 'pending';
            });

            renderAttendanceTable();
        }
    } catch (error) {
        showToast('Error loading class students', 'error');
    }
}

function renderAttendanceTable() {
    const container = elements.attendanceContainer;
    if (currentClassStudents.length === 0) {
        container.innerHTML = '<p>No students in this class</p>';
        return;
    }

    container.innerHTML = `
        <div class="attendance-stats">
            <span>Present: <strong id="present-count">0</strong></span>
            <span>Absent: <strong id="absent-count">0</strong></span>
            <span>Pending: <strong id="pending-count">${currentClassStudents.length}</strong></span>
        </div>
        <div class="attendance-grid">
            ${currentClassStudents.map(student => `
                <div class="student-card ${currentAttendance[student.id] || 'pending'}" data-id="${student.id}">
                    <div class="student-name">${student.name}</div>
                    <div class="student-id">${student.id}</div>
                    <div class="student-section">${student.section}</div>
                    <div class="status">${currentAttendance[student.id] || 'Pending'}</div>
                </div>
            `).join('')}
        </div>
    `;

    updateAttendanceButtons();
}

function updateAttendanceButtons() {
    const hasScanned = Object.values(scannedStudents).length > 0;
    const allLoaded = Object.keys(currentAttendance).length === currentClassStudents.length;

    elements.finalizeAttendance.disabled = !allLoaded || isFinalized;
    elements.exportCsv.disabled = !isFinalized;
}

async function toggleScanner() {
    if (!currentClassId) {
        showToast('Please select a class first', 'error');
        return;
    }

    if (html5QrCode) {
        stopScanner();
    } else {
        startScanner();
    }
}

async function startScanner() {
    html5QrCode = new Html5Qrcode(elements.scannerContainer);

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanError
        );
        elements.startScanner.innerHTML = '<i class="fas fa-stop"></i> Stop Scanner';
        showToast('Scanner started! Point camera at QR codes.', 'success');
    } catch (error) {
        showToast('Error starting scanner: ' + error, 'error');
    }
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            elements.scannerContainer.innerHTML = '';
            elements.startScanner.innerHTML = '<i class="fas fa-camera"></i> Start Scanner';
            html5QrCode = null;
        }).catch(err => console.error('Error stopping scanner:', err));
    }
}

function onScanSuccess(decodedText) {
    const parts = decodedText.split('|');
    const studentId = parts[0];

    if (!studentId || scannedStudents[studentId]) {
        showToast('Student already scanned or invalid QR', 'error');
        return;
    }

    const student = currentClassStudents.find(s => s.id === studentId || s.lrn === studentId);
    if (!student) {
        showToast('Student not found in class roster', 'error');
        return;
    }

    scannedStudents[studentId] = true;
    currentAttendance[studentId] = 'present';

    showToast(`${student.name} marked PRESENT! ✅`, 'success');
    renderAttendanceTable();
}

function onScanError() {
    // Silent
}

// === FINALIZE & EXPORT ===
async function finalizeAttendance() {
    if (!currentClassId || Object.keys(currentAttendance).length === 0) {
        showToast('No students loaded', 'error');
        return;
    }

    // Auto-mark absent
    Object.keys(currentAttendance).forEach(id => {
        if (currentAttendance[id] === 'pending') {
            currentAttendance[id] = 'absent';
        }
    });

    const subject = elements.subjectSelect.value;
    if (!subject) {
        showToast('Please select a subject', 'error');
        return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const docId = `${subject}_${dateStr}_${timeStr}_${currentUser.uid}`;

    try {
        await db.collection('attendance').doc(docId).set({
            teacherUid: currentUser.uid,
            teacherEmail: currentUser.email,
            classId: currentClassId,
            subject,
            date: now.toISOString().slice(0, 10),
            time: now.toTimeString().slice(0, 8),
            records: currentAttendance,
            stats: {
                present: Object.values(currentAttendance).filter(s => s === 'present').length,
                absent: Object.values(currentAttendance).filter(s => s === 'absent').length,
                total: Object.keys(currentAttendance).length
            },
            isFinalized: true,
            finalizedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        isFinalized = true;
        showToast('Attendance finalized! 📊', 'success');
        renderAttendanceTable();
        loadHistory();
    } catch (error) {
        showToast('Error finalizing: ' + error.message, 'error');
    }
}

function exportCSV() {
    if (!isFinalized) {
        showToast('Finalize attendance first', 'error');
        return;
    }

    let csv = 'ID,Name,Section,LRN,Status\n';
    currentClassStudents.forEach(student => {
        const status = currentAttendance[student.id] || 'unknown';
        csv += `"${student.id}","${student.name}","${student.section}","${student.lrn}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${elements.subjectSelect.value}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// === HISTORY ===
async function loadHistory() {
    const startDate = elements.historyStartDate.value;
    const endDate = elements.historyEndDate.value;

    let q = db.collection('attendance')
        .where('teacherUid', '==', currentUser.uid)
        .orderBy('finalizedAt', 'desc')
        .limit(50);

    if (startDate && endDate) {
        q = q.where('date', '>=', startDate).where('date', '<=', endDate);
    }

    try {
        const snapshot = await q.get();
        renderHistoryList(snapshot.docs);
    } catch (error) {
        showToast('Error loading history', 'error');
    }
}

function renderHistoryList(docs) {
    elements.historyList.innerHTML = docs.length ?
        docs.map(doc => {
            const data = doc.data();
            return `
                <div class="history-item">
                    <div class="history-header">
                        <strong>${data.subject}</strong> — ${data.date} ${data.time}
                    </div>
                    <div class="history-stats">
                        Present: ${data.stats?.present || 0}
                        | Absent: ${data.stats?.absent || 0}
                        | ${data.stats?.total || 0} total
                    </div>
                    <div class="history-actions">
                        <button class="btn-secondary small" onclick="viewHistory('${doc.id}')">View</button>
                        <button class="btn-primary small" onclick="exportHistory('${doc.id}')">Export</button>
                    </div>
                </div>
            `;
        }).join('') : '<p>No attendance records found</p>';
}

// === QR CODE GENERATION ===
async function generateQRCode() {
    const name = elements.qrName.value.trim();
    const section = elements.qrSection.value.trim();
    const lrn = elements.qrLrn.value.trim();

    if (!name || !lrn) {
        showToast('Name and LRN required', 'error');
        return;
    }

    const qrData = `${lrn}|${name}|${section}|${lrn}`;

    try {
        const qrContainer = elements.qrPreview;
        qrContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <strong>${name}</strong><br>
                <small>${section} | LRN: ${lrn}</small>
            </div>
            <div id="qrcode"></div>
        `;

        await QRCode.toCanvas(document.getElementById('qrcode'), qrData, {
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        elements.downloadQr.disabled = false;
        elements.printQr.disabled = false;
        window.currentQRData = qrData;
        window.currentQRName = name;

        showToast('QR Code generated!', 'success');
    } catch (error) {
        showToast('Error generating QR', 'error');
    }
}

function downloadQRCode() {
    const canvas = elements.qrPreview.querySelector('canvas');
    const link = document.createElement('a');
    link.download = `QR_${window.currentQRName}_${window.currentQRData.split('|')[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function printQRCode() {
    const qrContent = elements.qrPreview.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head><title>QR Code - ${window.currentQRName}</title></head>
            <body style="font-family: Arial; text-align: center; padding: 40px;">
                <h2>${window.currentQRName}</h2>
                ${qrContent}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// === STUDENT ATTENDANCE ===
async function loadMyAttendance() {
    try {
        const snapshot = await db.collection('studentAttendance')
            .doc(currentUser.uid)
            .collection('subjects')
            .get();

        elements.myAttendanceList.innerHTML = snapshot.empty ?
            '<p>No attendance records found</p>' :
            'Student attendance records...';
    } catch (error) {
        showToast('Error loading attendance', 'error');
    }
}

// === ANALYTICS ===
async function loadAnalytics() {
    try {
        const snapshot = await db.collection('attendance')
            .where('teacherUid', '==', currentUser.uid)
            .get();

        const totalSessions = snapshot.size;
        let totalPresent = 0, totalStudents = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            totalPresent += data.stats?.present || 0;
            totalStudents += data.stats?.total || 0;
        });

        const avgAttendance = totalStudents ? Math.round((totalPresent / totalStudents) * 100) : 0;

        document.getElementById('total-sessions').textContent = totalSessions;
        document.getElementById('avg-attendance').textContent = avgAttendance + '%';
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// === ADMIN MANAGEMENT ===
async function loadAdminManagement() {
    try {
        const snapshot = await db.collection('users').get();
        elements.adminUsersList.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="admin-user">
                    <div>
                        <strong>${data.email}</strong><br>
                        <small>Role: ${data.role || 'teacher'}</small>
                    </div>
                    <select onchange="updateUserRole('${doc.id}', this.value)">
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function updateUserRole(userId, role) {
    try {
        await db.collection(ROLES_COLLECTION).doc(userId).update({
            role: role
        });
        showToast(`User role updated to ${role}!`, 'success');
        loadAdminManagement();
    } catch (error) {
        showToast('Error updating role: ' + error.message, 'error');
    }
}

// === UTILITY FUNCTIONS ===
async function loadAllData() {
    await Promise.all([
        loadSubjects(),
        loadClasses(),
        loadHistory()
    ]);

    if (currentRole === 'student') loadMyAttendance();
    if (['teacher', 'admin'].includes(currentRole)) loadAnalytics();
    if (currentRole === 'admin') loadAdminManagement();
}

function logout() {
    scannedStudents = {};
    currentAttendance = {};
    currentClassStudents = [];
    isFinalized = false;
    currentClassId = null;
    auth.signOut();
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// Export functions for HTML onclick
window.deleteSubject = async function(subjectId) {
    if (confirm('Delete subject?')) {
        await db.collection('subjects').doc(currentUser.uid).collection('subjectList').doc(subjectId).delete();
        loadSubjects();
    }
};

window.selectClass = function(classId) {
    selectClass(classId);
};

window.deleteClass = async function(classId) {
    deleteClass(classId);
};

window.viewHistory = function(docId) {
    showToast('View history details (implement zoom view)', 'info');
};

window.exportHistory = function(docId) {
    showToast('Export single history (implement)', 'info');
};

window.updateUserRole = updateUserRole;