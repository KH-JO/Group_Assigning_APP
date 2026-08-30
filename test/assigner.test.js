const assert = require('assert');
const {
  calculateGroupSizes,
  assignSkillsToGroups,
  assignGroups,
  SKILLS_CONFIG
} = require('../public/js/assigner');

console.log('🧪 [테스트 시작] 영어과교육론1 조편성 알고리즘 테스트');

// Test 1: calculateGroupSizes
console.log('1. 그룹 크기 분할 테스트...');
assert.deepStrictEqual(calculateGroupSizes(16), [4, 4, 4, 4], '16명은 4인 4개조여야 함');
assert.deepStrictEqual(calculateGroupSizes(19), [4, 4, 4, 4, 3], '19명은 4인 4개조 + 3인 1개조여야 함');
assert.deepStrictEqual(calculateGroupSizes(18), [4, 4, 4, 3, 3], '18명은 4인 3개조 + 3인 2개조여야 함');
assert.deepStrictEqual(calculateGroupSizes(17), [4, 4, 3, 3, 3], '17명은 4인 2개조 + 3인 3개조여야 함');
assert.deepStrictEqual(calculateGroupSizes(20), [4, 4, 4, 4, 4], '20명은 4인 5개조여야 함');
assert.deepStrictEqual(calculateGroupSizes(3), [3], '3명은 3인 1개조여야 함');
assert.deepStrictEqual(calculateGroupSizes(4), [4], '4명은 4인 1개조여야 함');
console.log('✅ 그룹 크기 분할 테스트 통과!');

// Test 2: assignSkillsToGroups
console.log('2. 4대 기능 조 단위 균등 배정 테스트...');
const skills8 = assignSkillsToGroups(8);
const countListening8 = skills8.filter(s => s.id === 'listening').length;
const countReading8 = skills8.filter(s => s.id === 'reading').length;
const countSpeaking8 = skills8.filter(s => s.id === 'speaking').length;
const countWriting8 = skills8.filter(s => s.id === 'writing').length;
assert.strictEqual(countListening8, 2, '8개조 시 듣기는 2개여야 함');
assert.strictEqual(countReading8, 2, '8개조 시 읽기는 2개여야 함');
assert.strictEqual(countSpeaking8, 2, '8개조 시 말하기는 2개여야 함');
assert.strictEqual(countWriting8, 2, '8개조 시 쓰기는 2개여야 함');
console.log('✅ 4대 기능 배정 테스트 통과!');

// Test 3: assignGroups with gender balance and roles
console.log('3. 전체 학생 조편성 및 성별 균형, 역할 배정 테스트...');
// 19명 (남학생 4명, 여학생 15명)
const mockStudents19 = [];
for (let i = 1; i <= 4; i++) {
  mockStudents19.push({ id: `m${i}`, studentId: `2024000${i}`, name: `남학생${i}`, gender: '남' });
}
for (let i = 5; i <= 19; i++) {
  mockStudents19.push({ id: `f${i}`, studentId: `2024000${i}`, name: `여학생${i}`, gender: '여' });
}

const result19 = assignGroups(mockStudents19);
assert.strictEqual(result19.length, 5, '19명은 총 5개 조로 배정되어야 함');

// Check group sizes: 4 groups of 4, 1 group of 3
const sizes19 = result19.map(g => g.members.length).sort((a, b) => b - a);
assert.deepStrictEqual(sizes19, [4, 4, 4, 4, 3], '19명의 조별 인원은 [4, 4, 4, 4, 3]이어야 함');

// Check male distribution: 4 males across 5 groups -> each group has at most 1 male
const maleCounts19 = result19.map(g => g.members.filter(m => m.gender === '남').length);
assert.ok(maleCounts19.every(count => count <= 1), '남학생 4명이 5개 조에 1명씩 균등 분배되어야 함');

// Check roles in 4-person groups vs 3-person groups
result19.forEach(g => {
  assert.ok(g.skillInfo, '조별 기능 정보가 존재해야 함');
  assert.ok(g.skillInfo.week === 14 || g.skillInfo.week === 15, '주차는 14 또는 15주차여야 함');
  const roles = g.members.map(m => m.role);
  if (g.members.length === 4) {
    assert.ok(roles.includes('도입 및 정리 활동'), '4인조는 도입 및 정리 활동이 포함되어야 함');
    assert.ok(roles.includes('활동 1'), '4인조는 활동 1이 포함되어야 함');
    assert.ok(roles.includes('활동 2'), '4인조는 활동 2가 포함되어야 함');
    assert.ok(roles.includes('활동 3'), '4인조는 활동 3이 포함되어야 함');
  } else if (g.members.length === 3) {
    assert.ok(!roles.includes('도입 및 정리 활동'), '3인조는 도입 및 정리 활동이 제외되어야 함');
    assert.ok(roles.includes('활동 1'), '3인조는 활동 1이 포함되어야 함');
    assert.ok(roles.includes('활동 2'), '3인조는 활동 2가 포함되어야 함');
    assert.ok(roles.includes('활동 3'), '3인조는 활동 3이 포함되어야 함');
  }
});
console.log('✅ 19명 조편성 및 역할/성별 배정 검증 통과!');

// Test 4: More males (e.g. 7 males in 20 students -> 5 groups)
console.log('4. 남학생 비율이 높을 때(7명/20명) 균등 분배 테스트...');
const mockStudents20 = [];
for (let i = 1; i <= 7; i++) {
  mockStudents20.push({ id: `m${i}`, studentId: `2024010${i}`, name: `남학생${i}`, gender: '남' });
}
for (let i = 8; i <= 20; i++) {
  mockStudents20.push({ id: `f${i}`, studentId: `2024010${i}`, name: `여학생${i}`, gender: '여' });
}
const result20 = assignGroups(mockStudents20);
assert.strictEqual(result20.length, 5, '20명은 5개 조여야 함');
const maleCounts20 = result20.map(g => g.members.filter(m => m.gender === '남').length);
// With 7 males and 5 groups, two groups should have 2 males and three groups should have 1 male
maleCounts20.sort();
assert.deepStrictEqual(maleCounts20, [1, 1, 1, 2, 2], '7명 남학생은 [1, 1, 1, 2, 2]로 1~2명씩 균등 분배되어야 함');
console.log('✅ 남학생 7명/5개조 분배 검증 통과!');

console.log('🎉 [모든 테스트 완벽 통과!]');
