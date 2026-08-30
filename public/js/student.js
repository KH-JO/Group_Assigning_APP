/**
 * 영어과교육론1 학생 접속 및 결과 확인 스크립트
 */

const socket = io();
let currentRoom = 'ENG-EDU-1';
let myInfo = null;

// DOM 요소
const elFormSection = document.getElementById('student-form-section');
const elWaitingSection = document.getElementById('student-waiting-section');
const elResultSection = document.getElementById('student-result-section');
const elStudentForm = document.getElementById('student-form');
const elWelcomeName = document.getElementById('welcome-name');
const elWelcomeId = document.getElementById('welcome-id');
const elMyGroupName = document.getElementById('my-group-name');
const elMySkillBadge = document.getElementById('my-skill-badge');
const elMyWeekBadge = document.getElementById('my-week-badge');
const elMyRoleBadge = document.getElementById('my-role-badge');
const elTeammatesList = document.getElementById('teammates-list');

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  currentRoom = urlParams.get('room') || 'ENG-EDU-1';

  // 로컬 스토리지에 저장된 이전 접속 정보 복원
  const savedInfo = localStorage.getItem(`edu_student_${currentRoom}`);
  if (savedInfo) {
    try {
      const parsed = JSON.parse(savedInfo);
      document.getElementById('input-student-id').value = parsed.studentId || '';
      document.getElementById('input-name').value = parsed.name || '';
      if (parsed.gender === '남') {
        document.getElementById('gender-male').checked = true;
      } else {
        document.getElementById('gender-female').checked = true;
      }
    } catch (e) {}
  }

  // 폼 제출 이벤트
  elStudentForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('input-student-id').value.trim();
    const name = document.getElementById('input-name').value.trim();
    const gender = document.querySelector('input[name="gender"]:checked')?.value || '여';

    if (!studentId || !name) {
      alert('학번과 이름을 입력해주세요.');
      return;
    }

    myInfo = { studentId, name, gender };
    localStorage.setItem(`edu_student_${currentRoom}`, JSON.stringify(myInfo));

    socket.emit('join_student', {
      roomId: currentRoom,
      studentId,
      name,
      gender
    });
  });

  // 소켓 이벤트 수신
  socket.on('join_success', ({ student, isAssigned, assignedGroups }) => {
    myInfo = student;
    showWaitingView();

    if (isAssigned && assignedGroups) {
      findAndShowMyGroup(assignedGroups);
    }
  });

  socket.on('join_error', ({ message }) => {
    alert(message);
  });

  socket.on('groups_assigned', ({ groups }) => {
    findAndShowMyGroup(groups);
    if (typeof confetti === 'function') {
      confetti({ particleCount: 50, spread: 60 });
    }
  });

  socket.on('groups_updated', ({ groups }) => {
    findAndShowMyGroup(groups);
  });

  socket.on('groups_reset', () => {
    if (myInfo) {
      showWaitingView();
    }
  });
}

function showWaitingView() {
  elFormSection?.classList.add('hidden');
  elResultSection?.classList.add('hidden');
  elWaitingSection?.classList.remove('hidden');

  if (elWelcomeName && myInfo) elWelcomeName.textContent = myInfo.name;
  if (elWelcomeId && myInfo) elWelcomeId.textContent = myInfo.studentId;
}

function findAndShowMyGroup(groups) {
  if (!myInfo || !groups) return;

  let myGroup = null;
  let myMemberData = null;

  for (const g of groups) {
    const member = g.members.find(m => m.studentId === myInfo.studentId);
    if (member) {
      myGroup = g;
      myMemberData = member;
      break;
    }
  }

  if (!myGroup) return;

  elFormSection?.classList.add('hidden');
  elWaitingSection?.classList.add('hidden');
  elResultSection?.classList.remove('hidden');

  if (elMyGroupName) elMyGroupName.textContent = `제 ${myGroup.groupNumber} 조`;
  
  if (elMySkillBadge) {
    elMySkillBadge.textContent = myGroup.skillInfo.fullName;
    elMySkillBadge.className = `px-3 py-1 rounded-full text-xs font-bold border ${myGroup.skillInfo.badgeClass}`;
  }

  if (elMyWeekBadge) {
    elMyWeekBadge.textContent = `🗓️ ${myGroup.skillInfo.weekText} 실연`;
  }

  if (elMyRoleBadge) {
    elMyRoleBadge.textContent = myMemberData.role || '역할 지정 중';
  }

  if (elTeammatesList) {
    const ROLE_ORDER = {
      '도입 및 정리 활동': 1,
      '활동 1': 2,
      '활동 2': 3,
      '활동 3': 4
    };
    const sortedMembers = [...myGroup.members].sort((a, b) => {
      return (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99);
    });

    elTeammatesList.innerHTML = sortedMembers.map(m => {
      const isMe = m.studentId === myInfo.studentId;
      return `
        <div class="flex items-center justify-between p-3 rounded-xl border ${isMe ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-400/20' : 'bg-slate-50 border-slate-200'}">
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-200 text-slate-700">
              ${m.gender}
            </span>
            <div>
              <span class="font-bold text-slate-800 text-sm">${m.name} ${isMe ? '<span class="text-xs text-indigo-600 font-semibold">(나)</span>' : ''}</span>
              <p class="text-[11px] text-slate-400 font-mono">${m.studentId}</p>
            </div>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-sm">
            ${m.role || '-'}
          </span>
        </div>
      `;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', init);
