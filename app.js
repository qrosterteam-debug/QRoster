// ✅ Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, setDoc, getDoc, getDocs, doc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { students } from "./students.js"; // ✅ keep your students.js

// ---------- Firebase Config (unchanged) ----------
const firebaseConfig = {
  apiKey: "AIzaSyDdTrOmPZzwW4LtMNQvPSSMNbz-r-yhNtY",
  authDomain: "qroster-4a631.firebaseapp.com",
  projectId: "qroster-4a631",
  storageBucket: "qroster-4a631.firebasestorage.app",
  messagingSenderId: "961257265744",
  appId: "1:961257265744:web:9f709bb6b6df541c8b8f55",
  measurementId: "G-63MXS6BHMK"
};

// ---------- Init ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// ---------- DOM ----------
const navLinks = document.querySelectorAll(".nav-link");
const panes = { scanner: document.getElementById("scanner"), attendance: document.getElementById("attendance"), history: document.getElementById("history") };
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const userInfo = document.getElementById("user-info");
const cameraSelect = document.getElementById("camera-select");
const startCameraBtn = document.getElementById("start-camera");
const stopCameraBtn = document.getElementById("stop-camera");
const qrResultEl = document.getElementById("qr-reader-results");
const studentBody = document.getElementById("student-body");
const statTotal = document.getElementById("stat-total");
const statPresent = document.getElementById("stat-present");
const statAbsent = document.getElementById("stat-absent");
const finalizeBtn = document.getElementById("finalizeBtn");
const historyTable = document.getElementById("historyTable");
const confirmFinalizeBtn = document.getElementById("confirmFinalize");

// ---------- Attendance Map ----------
const attendanceMap = {};
students.forEach(s => {
  attendanceMap[s.studentId] = { ...s, status:"", time:"—" };
});

// Helpers
function todayKey(){ return new Date().toLocaleDateString("en-GB"); }
function nowTime(){ return new Date().toLocaleTimeString("en-GB"); }

// Render
function renderTable(){
  studentBody.innerHTML="";
  let idx=1, present=0;
  students.forEach(s=>{
    const r=attendanceMap[s.studentId];
    if(r.status==="Present") present++;
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${idx++}</td><td>${s.name}</td><td>${r.status||""}</td><td>${r.time}</td>`;
    studentBody.appendChild(tr);
  });
  statTotal.textContent=students.length;
  statPresent.textContent=present;
  statAbsent.textContent=students.length-present;
}
renderTable();

// Tabs
let activeTab="scanner";
navLinks.forEach(l=>l.addEventListener("click",e=>{
  e.preventDefault();
  navLinks.forEach(n=>n.classList.remove("active"));
  l.classList.add("active");
  Object.values(panes).forEach(p=>p.style.display="none");
  activeTab=l.dataset.tab; panes[activeTab].style.display="";
  if(activeTab==="history") loadHistory();
  if(activeTab!=="scanner") stopScanner();
}));

// Auth
loginBtn.onclick=()=>signInWithPopup(auth,provider);
logoutBtn.onclick=()=>signOut(auth);
onAuthStateChanged(auth,u=>{
  if(u){
    loginBtn.classList.add("d-none"); logoutBtn.classList.remove("d-none");
    userInfo.textContent=`✅ ${u.email}`;
    populateCameras();
  }else{
    loginBtn.classList.remove("d-none"); logoutBtn.classList.add("d-none");
    userInfo.textContent="";
    stopScanner();
  }
});

// QR Scanner
let qr=null; let currentCam=null;
async function populateCameras(){
  cameraSelect.innerHTML="";
  const devs=await Html5Qrcode.getCameras();
  devs.forEach((d,i)=>{
    const opt=document.createElement("option");
    opt.value=d.id; opt.text=d.label||`Camera ${i+1}`;
    cameraSelect.appendChild(opt);
  });
  if(devs[0]) currentCam=devs[0].id;
}
startCameraBtn.onclick=()=>startScanner();
stopCameraBtn.onclick=()=>stopScanner();

function startScanner(){
  if(qr) stopScanner();
  qr=new Html5Qrcode("qr-reader");
  qr.start(
    cameraSelect.value||currentCam,
    {fps:10,qrbox:{width:250,height:100}},
    onScan
  ).then(()=>{ qrResultEl.textContent="Scanner ready."; })
   .catch(err=>console.error("Start failed",err));
}
function stopScanner(){ if(qr){ qr.stop().then(()=>qr.clear()); qr=null; } }

function onScan(decoded){
  if(!decoded) return;
  if(attendanceMap[decoded] && attendanceMap[decoded].status!=="Present"){
    attendanceMap[decoded].status="Present";
    attendanceMap[decoded].time=nowTime();
    renderTable();
    qrResultEl.textContent=`✅ Marked present: ${attendanceMap[decoded].name}`;
  }
}

// Finalize
finalizeBtn.onclick=()=>{
  new bootstrap.Modal(document.getElementById("finalizeModal")).show();
};
confirmFinalizeBtn.onclick=async()=>{
  // mark absentees
  students.forEach(s=>{
    if(!attendanceMap[s.studentId].status){
      attendanceMap[s.studentId].status="Absent";
      attendanceMap[s.studentId].time="—";
    }
  });
  renderTable();
  const present=Object.values(attendanceMap).filter(r=>r.status==="Present").length;
  const absent=students.length-present;
  await setDoc(doc(collection(db,"attendanceHistory"),todayKey()),{
    date:todayKey(), present, absent, savedAt:serverTimestamp()
  });
  bootstrap.Modal.getInstance(document.getElementById("finalizeModal")).hide();
  alert("Attendance finalized and saved.");
  // reset for next day
  students.forEach(s=>attendanceMap[s.studentId]={...s,status:"",time:"—"});
  renderTable();
  loadHistory();
};

// History
async function loadHistory(){
  historyTable.innerHTML="";
  const q=query(collection(db,"attendanceHistory"),orderBy("date","desc"));
  const snap=await getDocs(q);
  snap.forEach(docu=>{
    const d=docu.data();
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${d.date}</td><td>${d.present}</td><td>${d.absent}</td><td>${d.savedAt?.toDate().toLocaleString()||""}</td>`;
    historyTable.appendChild(tr);
  });
}
