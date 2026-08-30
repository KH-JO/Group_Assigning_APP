/**
 * 영어과교육론1 교수자 대시보드 스크립트
 */

const socket = io();
let currentRoom = 'ENG-EDU-1';
let sessionData = {
  students: [],
  assignedGroups: null,
  isAssigned: false,
  courseTitle: '영어과교육론1',
  activityTitle: '그룹 수업 실연 조편성'
};

let draggedStudent = null;
let sourceGroupIndex = null;

// DOM 요소 참조
const elStudentCount = document.getElementById('student-count');
const elMaleCount = document.getElementById('male-count');
const elFemaleCount = document.getElementById('female-count');
const elStudentList = document.getElementById('student-list');
const elEmptyListState = document.getElementById('empty-list-state');
const elBtnAssign = document.getElementById('btn-assign');
const elWaitingSection = document.getElementById('waiting-section');
const elResultsSection = document.getElementById('results-section');
const elGroupsContainer = document.getElementById('groups-container');
const elQrCode = document.getElementById('qrcode');
const elJoinUrl = document.getElementById('join-url');
const elModalAddStudent = document.getElementById('modal-add-student');
const elShuffleModal = document.getElementById('shuffle-modal');
const elShuffleText = document.getElementById('shuffle-text');

// 1. 초기화 및 소켓 접속
function init() {
  const urlParams = new URLSearchParams(window.location.search);
  currentRoom = urlParams.get('room') || 'ENG-EDU-1';

  // QR 코드 생성
  generateQRCode();

  // 교수자로 방 입장
  socket.emit('join_instructor', { roomId: currentRoom });

  // 이벤트 리스너 등록
  bindEvents();
}

function generateQRCode() {
  const joinUrl = `${window.location.origin}/join?room=${currentRoom}`;
  if (elJoinUrl) elJoinUrl.textContent = joinUrl;

  if (elQrCode) {
    elQrCode.innerHTML = '';
    new QRCode(elQrCode, {
      text: joinUrl,
      width: 140,
      height: 140,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

// 2. 소켓 수신 이벤트 핸들러
socket.on('session_state', (data) => {
  sessionData = { ...sessionData, ...data };
  updateUI();
});

socket.on('students_updated', ({ students, count }) => {
  sessionData.students = students;
  updateRosterUI();
});

socket.on('groups_assigned', ({ groups }) => {
  sessionData.assignedGroups = groups;
  sessionData.isAssigned = true;
  showShuffleAnimation(() => {
    updateUI();
    triggerConfetti();
  });
});

socket.on('groups_updated', ({ groups }) => {
  sessionData.assignedGroups = groups;
  sessionData.isAssigned = true;
  updateUI();
});

socket.on('groups_reset', () => {
  sessionData.assignedGroups = null;
  sessionData.isAssigned = false;
  updateUI();
});

socket.on('assignment_error', ({ message }) => {
  alert(message);
});

// 3. UI 업데이트 함수들
function updateUI() {
  updateRosterUI();
  if (sessionData.isAssigned && sessionData.assignedGroups && sessionData.assignedGroups.length > 0) {
    if (elWaitingSection) elWaitingSection.classList.add('hidden');
    if (elResultsSection) elResultsSection.classList.remove('hidden');
    updateGroupsUI();
  } else {
    if (elWaitingSection) elWaitingSection.classList.remove('hidden');
    if (elResultsSection) elResultsSection.classList.add('hidden');
  }
}

function updateRosterUI() {
  const students = sessionData.students || [];
  const males = students.filter(s => s.gender === '남');
  const females = students.filter(s => s.gender === '여');

  if (elStudentCount) elStudentCount.textContent = students.length;
  if (elMaleCount) elMaleCount.textContent = males.length;
  if (elFemaleCount) elFemaleCount.textContent = females.length;

  if (students.length === 0) {
    if (elStudentList) elStudentList.innerHTML = '';
    if (elEmptyListState) elEmptyListState.classList.remove('hidden');
    if (elBtnAssign) {
      elBtnAssign.disabled = true;
      elBtnAssign.classList.add('opacity-50', 'cursor-not-allowed');
    }
  } else {
    if (elEmptyListState) elEmptyListState.classList.add('hidden');
    if (elBtnAssign) {
      elBtnAssign.disabled = students.length < 3;
      if (students.length < 3) {
        elBtnAssign.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        elBtnAssign.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }

    if (elStudentList) {
      elStudentList.innerHTML = students.map((s, idx) => `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow transition">
          <div class="flex items-center gap-3">
            <span class="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
              ${idx + 1}
            </span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 dark:text-white text-base">${s.name}</span>
                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  ${s.gender}
                </span>
                ${s.manual ? '<span class="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">수동</span>' : ''}
              </div>
              <p class="text-xs text-slate-500 font-mono">${s.studentId}</p>
            </div>
          </div>
          <button onclick="removeStudent('${s.studentId}')" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="학생 삭제">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      `).join('');
    }
  }
}

function updateGroupsUI() {
  if (!sessionData.assignedGroups || !elGroupsContainer) return;

  const groups = sessionData.assignedGroups;

  elGroupsContainer.innerHTML = groups.map((g, gIdx) => {
    const is14Week = g.skillInfo.week === 14;
    const weekBg = is14Week ? 'bg-sky-500 text-white' : 'bg-indigo-600 text-white';
    const borderAccent = is14Week ? 'border-sky-300 dark:border-sky-800' : 'border-indigo-300 dark:border-indigo-800';

    const membersHtml = g.members.map((m, mIdx) => {
      return `
        <div 
          class="draggable-card p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-2 hover:border-blue-400 transition"
          draggable="true"
          data-group-idx="${gIdx}"
          data-member-idx="${mIdx}"
          ondragstart="handleDragStart(event, ${gIdx}, ${mIdx})"
          ondragend="handleDragEnd(event)"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
              ${m.gender}
            </div>
            <div class="truncate">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-900 dark:text-white text-sm truncate">${m.name}</span>
                <span class="text-xs text-slate-400 font-mono">(${m.studentId.slice(-4)})</span>
              </div>
            </div>
          </div>
          
          <!-- 역할 변경 뱃지 드롭다운 버튼 -->
          <div class="relative group/role">
            <button class="role-badge bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-700 transition">
              <span>${m.role || '역할 지정'}</span>
              <svg class="w-3 h-3 ml-0.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div class="absolute right-0 mt-1 hidden group-hover/role:block bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 rounded-lg py-1 z-30 w-36 text-xs font-medium">
              <button onclick="changeRole(${gIdx}, ${mIdx}, '도입 및 정리 활동')" class="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700">도입 및 정리 활동</button>
              <button onclick="changeRole(${gIdx}, ${mIdx}, '활동 1')" class="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700">활동 1</button>
              <button onclick="changeRole(${gIdx}, ${mIdx}, '활동 2')" class="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700">활동 2</button>
              <button onclick="changeRole(${gIdx}, ${mIdx}, '활동 3')" class="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700">활동 3</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div 
        class="drop-zone bg-slate-50 dark:bg-slate-900/60 rounded-2xl border-2 ${borderAccent} p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition"
        data-group-idx="${gIdx}"
        ondragover="handleDragOver(event)"
        ondragleave="handleDragLeave(event)"
        ondrop="handleDrop(event, ${gIdx})"
      >
        <!-- 조 헤더 -->
        <div>
          <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl font-extrabold text-slate-900 dark:text-white">제 ${g.groupNumber} 조</span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                ${g.members.length}명
              </span>
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${weekBg} shadow-sm">
              🗓️ ${g.skillInfo.weekText}
            </span>
          </div>

          <!-- 기능 뱃지 및 변경 -->
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-lg text-xs font-bold border ${g.skillInfo.badgeClass}">
                ${g.skillInfo.fullName}
              </span>
            </div>
            
            <!-- 기능 빠른 변경 버튼 -->
            <div class="relative group/skill">
              <button class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                기능변경 ▾
              </button>
              <div class="absolute right-0 mt-1 hidden group-hover/skill:block bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg py-1 z-30 w-44 text-xs font-medium">
                ${Assigner.SKILLS_CONFIG.map(s => `
                  <button onclick="changeGroupSkill(${gIdx}, '${s.id}')" class="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between">
                    <span>${s.fullName}</span>
                    <span class="text-[10px] text-slate-400 font-bold">${s.weekText}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- 조원 목록 -->
          <div class="space-y-2 min-h-[140px] flex flex-col justify-start">
            ${membersHtml}
          </div>
        </div>

        <div class="mt-3 pt-2 text-[11px] text-slate-400 text-center border-t border-slate-200/60 dark:border-slate-800/60">
          💡 드래그하여 조원 이동 또는 교환 가능
        </div>
      </div>
    `;
  }).join('');
}

// 4. 드래그 앤 드롭 핸들러
function handleDragStart(e, groupIdx, memberIdx) {
  draggedStudent = {
    groupIdx,
    memberIdx,
    data: sessionData.assignedGroups[groupIdx].members[memberIdx]
  };
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const dropZone = e.currentTarget.closest('.drop-zone');
  if (dropZone) dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  const dropZone = e.currentTarget.closest('.drop-zone');
  if (dropZone) dropZone.classList.remove('drag-over');
}

function handleDrop(e, targetGroupIdx) {
  e.preventDefault();
  const dropZone = e.currentTarget.closest('.drop-zone');
  if (dropZone) dropZone.classList.remove('drag-over');

  if (!draggedStudent) return;
  const { groupIdx: srcGroupIdx, memberIdx: srcMemberIdx } = draggedStudent;

  if (srcGroupIdx === targetGroupIdx) return; // 동일 조 내 이동 무시

  const groups = [...sessionData.assignedGroups];
  const [movedMember] = groups[srcGroupIdx].members.splice(srcMemberIdx, 1);
  groups[targetGroupIdx].members.push(movedMember);

  sessionData.assignedGroups = groups;
  socket.emit('update_groups', { roomId: currentRoom, groups });
  updateGroupsUI();
  draggedStudent = null;
}

// 역할 및 기능 수동 변경 함수
function changeRole(groupIdx, memberIdx, newRole) {
  const groups = [...sessionData.assignedGroups];
  groups[groupIdx].members[memberIdx].role = newRole;
  sessionData.assignedGroups = groups;
  socket.emit('update_groups', { roomId: currentRoom, groups });
  updateGroupsUI();
}

function changeGroupSkill(groupIdx, skillId) {
  const newSkill = Assigner.SKILLS_CONFIG.find(s => s.id === skillId);
  if (!newSkill) return;

  const groups = [...sessionData.assignedGroups];
  groups[groupIdx].skillInfo = { ...newSkill };
  sessionData.assignedGroups = groups;
  socket.emit('update_groups', { roomId: currentRoom, groups });
  updateGroupsUI();
}

// 5. 셔플 애니메이션 및 사운드 특수효과
function showShuffleAnimation(callback) {
  if (!elShuffleModal) {
    if (callback) callback();
    return;
  }

  elShuffleModal.classList.remove('hidden');
  const names = (sessionData.students || []).map(s => s.name);
  const totalStudents = names.length;

  let currentTick = 0;
  const totalTicks = 48; // 약 4.5~5.0초 동안 재생
  
  function nextTick() {
    currentTick++;
    
    // 무작위 학생 및 기능 추출
    const rIdx1 = Math.floor(Math.random() * names.length);
    let rIdx2 = Math.floor(Math.random() * names.length);
    if (names.length > 1 && rIdx1 === rIdx2) {
      rIdx2 = (rIdx1 + 1) % names.length;
    }
    const randomName1 = names[rIdx1] || '학생 A';
    const randomName2 = names[rIdx2] || '학생 B';
    const randomSkill = Assigner.SKILLS_CONFIG[Math.floor(Math.random() * Assigner.SKILLS_CONFIG.length)];

    // 셔플 틱 효과음 재생 (점점 감속하며 피치 변화)
    const pitch = 0.85 + (currentTick / totalTicks) * 0.4;
    if (window.soundFX) {
      window.soundFX.playShuffleTick(pitch);
    }

    // 진행도에 따른 메시지 변경
    const progressPercent = Math.round((currentTick / totalTicks) * 100);
    let phaseTitle = '🎲 실시간 무작위 매칭 중...';
    let phaseSubtitle = '공정하고 균형잡힌 조를 조합하고 있습니다';

    if (progressPercent > 85) {
      phaseTitle = '🎯 배정 확정 완료!';
      phaseSubtitle = '결과를 강의실 화면에 공개합니다!';
    } else if (progressPercent > 55) {
      phaseTitle = '⚖️ 4대 언어기능 & 14/15주차 배분 중...';
      phaseSubtitle = '듣기 · 읽기 · 말하기 · 쓰기 최적 매칭';
    } else if (progressPercent > 30) {
      phaseTitle = '👥 조별 인원 및 역할 배정 중...';
      phaseSubtitle = `${totalStudents}명의 학생을 균형있게 분배 중입니다`;
    }

    if (elShuffleText) {
      elShuffleText.innerHTML = `
        <div class="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-2 transition-all">
          ${phaseTitle}
        </div>
        <div class="text-base text-slate-500 mb-4 font-medium">
          ${phaseSubtitle}
        </div>
        <div class="flex items-center justify-center gap-3 py-2 px-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner mb-3">
          <span class="text-lg font-extrabold text-slate-800 dark:text-white">${randomName1}</span>
          <span class="text-indigo-500 font-black animate-pulse">⇄</span>
          <span class="text-lg font-extrabold text-slate-800 dark:text-white">${randomName2}</span>
        </div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${randomSkill.badgeClass}">
          <span>📌 매칭 기능: ${randomSkill.fullName} (${randomSkill.weekText})</span>
        </div>
        <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-5 overflow-hidden">
          <div class="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-75" style="width: ${progressPercent}%"></div>
        </div>
      `;
    }

    if (currentTick < totalTicks) {
      // 감속 커브: 초반(0~30틱)은 65ms, 후반(30~48틱)은 점점 느려짐 (최대 360ms)
      let delay = 65;
      if (currentTick > 30) {
        const remainingFraction = (currentTick - 30) / (totalTicks - 30);
        delay = 65 + Math.pow(remainingFraction, 2) * 320;
      }
      setTimeout(nextTick, delay);
    } else {
      // 셔플 종료
      setTimeout(() => {
        elShuffleModal.classList.add('hidden');
        if (callback) callback();
      }, 400);
    }
  }

  nextTick();
}

function triggerConfetti() {
  // 축하 팡파레 & 파티 팝 사운드 동시 재생
  if (window.soundFX) {
    window.soundFX.playCelebrationFanfare();
  }

  if (typeof confetti === 'function') {
    // 1. 중앙 대형 버스트
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#2563eb', '#7c3aed', '#059669', '#d97706', '#ec4899']
    });

    // 2. 좌측 폭죽 캐논
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 }
      });
    }, 200);

    // 3. 우측 폭죽 캐논
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 }
      });
    }, 400);
  }
}

// 6. 이벤트 바인딩
function bindEvents() {
  // 소리 켜기/끄기 토글
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const soundIcon = document.getElementById('sound-icon');
  const soundText = document.getElementById('sound-text');

  btnToggleSound?.addEventListener('click', () => {
    if (!window.soundFX) return;
    window.soundFX.isMuted = !window.soundFX.isMuted;
    if (window.soundFX.isMuted) {
      if (soundIcon) soundIcon.textContent = '🔇';
      if (soundText) soundText.textContent = '소리 끔';
      btnToggleSound.classList.add('opacity-60');
    } else {
      if (soundIcon) soundIcon.textContent = '🔊';
      if (soundText) soundText.textContent = '소리 켬';
      btnToggleSound.classList.remove('opacity-60');
      // 오디오 컨텍스트 사전 활성화
      window.soundFX.getAudioContext();
    }
  });

  // 조편성 버튼 클릭
  elBtnAssign?.addEventListener('click', () => {
    if (sessionData.students.length < 3) {
      alert('최소 3명 이상의 학생이 접속해야 조편성이 가능합니다.');
      return;
    }
    // 오디오 컨텍스트 사전 초기화 (사용자 제스처 연동)
    if (window.soundFX) {
      window.soundFX.getAudioContext();
    }
    socket.emit('execute_assignment', { roomId: currentRoom });
  });

  // 재편성 버튼
  document.getElementById('btn-reassign')?.addEventListener('click', () => {
    if (confirm('현재 결과를 초기화하고 다시 조를 편성하시겠습니까?')) {
      socket.emit('execute_assignment', { roomId: currentRoom });
    }
  });

  // 대기화면으로 돌아가기
  document.getElementById('btn-back-to-waiting')?.addEventListener('click', () => {
    if (confirm('대기 화면으로 돌아가시겠습니까? (조편성 결과가 초기화됩니다)')) {
      socket.emit('reset_assignment', { roomId: currentRoom });
    }
  });

  // 전체 명단 초기화
  document.getElementById('btn-clear-all')?.addEventListener('click', () => {
    if (confirm('접속한 모든 학생 명단을 초기화하시겠습니까?')) {
      socket.emit('clear_all_students', { roomId: currentRoom });
    }
  });

  // 수동 학생 추가 모달 열기/닫기
  document.getElementById('btn-open-add-modal')?.addEventListener('click', () => {
    elModalAddStudent?.classList.remove('hidden');
  });

  document.getElementById('btn-close-add-modal')?.addEventListener('click', () => {
    elModalAddStudent?.classList.add('hidden');
  });

  document.getElementById('form-manual-add')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('input-manual-id').value;
    const name = document.getElementById('input-manual-name').value;
    const gender = document.querySelector('input[name="manual-gender"]:checked')?.value || '여';

    socket.emit('manual_add_student', {
      roomId: currentRoom,
      studentId,
      name,
      gender
    });

    document.getElementById('form-manual-add').reset();
    elModalAddStudent?.classList.add('hidden');
  });

  // 테스트용 모의 학생 생성 버튼 (19명 일괄 추가)
  document.getElementById('btn-add-mock-students')?.addEventListener('click', () => {
    const mockList = [
      { studentId: '20240101', name: '김민수', gender: '남' },
      { studentId: '20240102', name: '이준호', gender: '남' },
      { studentId: '20240103', name: '박도현', gender: '남' },
      { studentId: '20240104', name: '최서진', gender: '남' },
      { studentId: '20240105', name: '정지우', gender: '여' },
      { studentId: '20240106', name: '강예은', gender: '여' },
      { studentId: '20240107', name: '조수아', gender: '여' },
      { studentId: '20240108', name: '윤하은', gender: '여' },
      { studentId: '20240109', name: '장서윤', gender: '여' },
      { studentId: '20240110', name: '임채원', gender: '여' },
      { studentId: '20240111', name: '한소율', gender: '여' },
      { studentId: '20240112', name: '오다은', gender: '여' },
      { studentId: '20240113', name: '송유진', gender: '여' },
      { studentId: '20240114', name: '배서현', gender: '여' },
      { studentId: '20240115', name: '백지원', gender: '여' },
      { studentId: '20240116', name: '신민아', gender: '여' },
      { studentId: '20240117', name: '유하린', gender: '여' },
      { studentId: '20240118', name: '권시은', gender: '여' },
      { studentId: '20240119', name: '황가은', gender: '여' }
    ];

    mockList.forEach(m => {
      socket.emit('manual_add_student', {
        roomId: currentRoom,
        studentId: m.studentId,
        name: m.name,
        gender: m.gender
      });
    });
  });

  // PDF 다운로드
  document.getElementById('btn-download-pdf')?.addEventListener('click', () => {
    ExportManager.exportToPDF(
      sessionData.assignedGroups,
      sessionData.courseTitle,
      sessionData.activityTitle
    );
  });

  // CSV 다운로드
  document.getElementById('btn-download-csv')?.addEventListener('click', () => {
    ExportManager.exportToCSV(
      sessionData.assignedGroups,
      sessionData.courseTitle
    );
  });
}

// 개별 학생 삭제 글로벌 함수
window.removeStudent = function(studentId) {
  if (confirm(`해당 학생(${studentId})을 명단에서 삭제하시겠습니까?`)) {
    socket.emit('remove_student', { roomId: currentRoom, studentId });
  }
};

// 시작
document.addEventListener('DOMContentLoaded', init);
