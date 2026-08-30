/**
 * 영어과교육론1 조편성 & 배정 알고리즘 모듈
 * (Node.js & 브라우저 공용)
 */

const SKILLS_CONFIG = [
  {
    id: 'listening',
    category: '이해기능',
    skill: '듣기',
    fullName: '이해기능 - 듣기',
    week: 14,
    weekText: '14주차',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
    colorHex: '#2563eb'
  },
  {
    id: 'reading',
    category: '이해기능',
    skill: '읽기',
    fullName: '이해기능 - 읽기',
    week: 14,
    weekText: '14주차',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    colorHex: '#059669'
  },
  {
    id: 'speaking',
    category: '표현기능',
    skill: '말하기',
    fullName: '표현기능 - 말하기',
    week: 15,
    weekText: '15주차',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    colorHex: '#d97706'
  },
  {
    id: 'writing',
    category: '표현기능',
    skill: '쓰기',
    fullName: '표현기능 - 쓰기',
    week: 15,
    weekText: '15주차',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
    colorHex: '#7c3aed'
  }
];

const ROLES_4 = ['도입 및 정리 활동', '활동 1', '활동 2', '활동 3'];
const ROLES_3 = ['활동 1', '활동 2', '활동 3'];

const ROLE_ORDER = {
  '도입 및 정리 활동': 1,
  '활동 1': 2,
  '활동 2': 3,
  '활동 3': 4
};

function sortMembersByRole(members) {
  if (!members || !Array.isArray(members)) return [];
  return [...members].sort((a, b) => {
    const orderA = ROLE_ORDER[a.role] || 99;
    const orderB = ROLE_ORDER[b.role] || 99;
    return orderA - orderB;
  });
}

/**
 * 배열 무작위 셔플 (Fisher-Yates)
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 인원 수에 따른 그룹 크기 분할 계산
 * 기본 4인 1조, 나누어 떨어지지 않으면 3인 조 편성
 * @param {number} totalStudents
 * @returns {number[]} 각 조별 목표 인원 배열 (예: 19명 -> [4, 4, 4, 4, 3])
 */
function calculateGroupSizes(totalStudents) {
  if (totalStudents <= 0) return [];
  if (totalStudents < 3) return [totalStudents];

  const totalGroups = Math.ceil(totalStudents / 4);
  const num3PersonGroups = (4 * totalGroups) - totalStudents;
  const num4PersonGroups = totalGroups - num3PersonGroups;

  const sizes = [];
  for (let i = 0; i < num4PersonGroups; i++) sizes.push(4);
  for (let i = 0; i < num3PersonGroups; i++) sizes.push(3);

  return sizes;
}

/**
 * 전체 조들에 대해 4개 기능(듣기, 읽기, 말하기, 쓰기) 균등 배정
 * @param {number} numGroups 
 * @returns {Array} 조별 배정된 기능 정보 목록
 */
function assignSkillsToGroups(numGroups) {
  if (numGroups <= 0) return [];
  
  const assigned = [];
  const baseCount = Math.floor(numGroups / 4);
  const remainder = numGroups % 4;

  // 4개 기능 각각 baseCount만큼 추가
  for (let i = 0; i < 4; i++) {
    for (let c = 0; c < baseCount; c++) {
      assigned.push({ ...SKILLS_CONFIG[i] });
    }
  }

  // 나머지(remainder)를 기능 순서대로 1개씩 추가 후 전체 셔플
  const extraSkills = shuffle([...SKILLS_CONFIG]).slice(0, remainder);
  extraSkills.forEach(skill => assigned.push({ ...skill }));

  return shuffle(assigned);
}

/**
 * 조편성 메인 알고리즘
 * 1. 4/3인 조 크기 결정
 * 2. 남학생 균등 배치 (1명씩 또는 2명씩)
 * 3. 여학생 배치
 * 4. 각 조에 4대 기능 & 주차 배정
 * 5. 각 조 내 세부 역할(도입및정리, 활동1~3) 자동 무작위 배정
 * 
 * @param {Array<{id: string, studentId: string, name: string, gender: string}>} students 
 * @returns {Array<{groupNumber: number, skillInfo: Object, members: Array}>}
 */
function assignGroups(students) {
  if (!students || students.length === 0) return [];

  const total = students.length;
  const groupSizes = calculateGroupSizes(total);
  const numGroups = groupSizes.length;

  if (numGroups === 0) return [];

  // 남학생 / 여학생 분리 및 셔플
  const males = shuffle(students.filter(s => s.gender === '남' || s.gender === 'M' || s.gender === 'male'));
  const females = shuffle(students.filter(s => s.gender !== '남' && s.gender !== 'M' && s.gender !== 'male'));

  // 조 초기화
  const groups = groupSizes.map((targetSize, idx) => ({
    groupNumber: idx + 1,
    targetSize,
    members: []
  }));

  // 남학생 균등 분배
  // 1단계: 각 조에 1명씩 우선 배분
  // 2단계: 남은 남학생이 있으면 각 조에 2번째 남학생으로 배분
  let groupIdx = 0;
  // 남학생 배치를 위해 조 목록을 랜덤 순서로 순회
  const shuffledGroupIndices = shuffle([...Array(numGroups).keys()]);

  for (const male of males) {
    // 빈 자리가 있는 조 찾기
    let placed = false;
    for (let i = 0; i < numGroups; i++) {
      const gIdx = shuffledGroupIndices[(groupIdx + i) % numGroups];
      const g = groups[gIdx];
      if (g.members.length < g.targetSize) {
        g.members.push(male);
        groupIdx = (groupIdx + i + 1) % numGroups;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // 용량 초과 시 아무 조에 추가
      groups[0].members.push(male);
    }
  }

  // 여학생으로 나머지 빈자리 채우기
  let femaleIdx = 0;
  for (const female of females) {
    let placed = false;
    for (let i = 0; i < numGroups; i++) {
      const g = groups[i];
      if (g.members.length < g.targetSize) {
        g.members.push(female);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // 모든 조가 찼을 경우 마지막 조에 배치
      groups[groups.length - 1].members.push(female);
    }
  }

  // 조별 4대 언어기능(듣기/읽기/말하기/쓰기) 균등 배정
  const skillsForGroups = assignSkillsToGroups(numGroups);

  // 각 조에 기능 및 조원 역할 부여
  return groups.map((g, idx) => {
    const skillInfo = skillsForGroups[idx] || SKILLS_CONFIG[idx % 4];
    const memberCount = g.members.length;

    // 역할 목록 결정 (4인이면 도입+정리 포함, 3인이면 활동1~3)
    let availableRoles = memberCount >= 4 ? [...ROLES_4] : [...ROLES_3];
    // 만약 4인 초과(예: 5인)인 경우를 대비한 유연한 처리
    while (availableRoles.length < memberCount) {
      availableRoles.push(`활동 ${availableRoles.length}`);
    }
    const shuffledRoles = shuffle(availableRoles);

    // 각 조원에게 역할 무작위 부여 후, 역할 순서(도입및정리 -> 활동1 -> 활동2 -> 활동3)대로 정렬
    const assignedMembers = g.members.map((member, mIdx) => ({
      ...member,
      role: shuffledRoles[mIdx] || `활동 ${mIdx + 1}`
    }));

    const sortedMembers = sortMembersByRole(assignedMembers);

    return {
      groupNumber: g.groupNumber,
      targetSize: g.targetSize,
      skillInfo,
      members: sortedMembers
    };
  });
}

// Export for Node.js and Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SKILLS_CONFIG,
    ROLES_4,
    ROLES_3,
    ROLE_ORDER,
    sortMembersByRole,
    shuffle,
    calculateGroupSizes,
    assignSkillsToGroups,
    assignGroups
  };
} else if (typeof window !== 'undefined') {
  window.Assigner = {
    SKILLS_CONFIG,
    ROLES_4,
    ROLES_3,
    ROLE_ORDER,
    sortMembersByRole,
    shuffle,
    calculateGroupSizes,
    assignSkillsToGroups,
    assignGroups
  };
}
