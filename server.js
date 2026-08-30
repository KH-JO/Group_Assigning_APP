const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { assignGroups, SKILLS_CONFIG } = require('./public/js/assigner');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 학생 접속 전용 라우트
app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'join.html'));
});

// 메모리 세션 저장소 (기본 룸: 'ENG-EDU-1')
const sessions = new Map();

function getOrCreateSession(roomId = 'ENG-EDU-1') {
  if (!sessions.has(roomId)) {
    sessions.set(roomId, {
      roomId,
      courseTitle: '영어과교육론1',
      activityTitle: '그룹 수업 실연 조편성',
      students: new Map(), // studentId -> { id, studentId, name, gender, socketId, joinedAt }
      assignedGroups: null,
      isAssigned: false
    });
  }
  return sessions.get(roomId);
}

// Socket.io 실시간 이벤트 처리
io.on('connection', (socket) => {
  let currentRoom = 'ENG-EDU-1';
  let clientRole = 'student'; // 'instructor' | 'student'
  let currentStudentId = null;

  // 1. 교수자 접속
  socket.on('join_instructor', ({ roomId = 'ENG-EDU-1' } = {}) => {
    currentRoom = roomId;
    clientRole = 'instructor';
    socket.join(roomId);
    socket.join(`${roomId}_instructor`);

    const session = getOrCreateSession(roomId);
    const studentsList = Array.from(session.students.values());

    socket.emit('session_state', {
      roomId,
      courseTitle: session.courseTitle,
      activityTitle: session.activityTitle,
      students: studentsList,
      assignedGroups: session.assignedGroups,
      isAssigned: session.isAssigned,
      skillsConfig: SKILLS_CONFIG
    });
  });

  // 2. 학생 접속/등록
  socket.on('join_student', ({ roomId = 'ENG-EDU-1', studentId, name, gender }) => {
    if (!studentId || !name || !gender) {
      socket.emit('join_error', { message: '학번, 이름, 성별을 모두 입력해주세요.' });
      return;
    }

    currentRoom = roomId;
    clientRole = 'student';
    currentStudentId = studentId.trim();

    socket.join(roomId);
    const session = getOrCreateSession(roomId);

    const studentData = {
      id: `std_${currentStudentId}`,
      studentId: currentStudentId,
      name: name.trim(),
      gender: gender === '남' ? '남' : '여',
      socketId: socket.id,
      joinedAt: new Date().toISOString()
    };

    session.students.set(currentStudentId, studentData);

    // 학생에게 접속 성공 응답
    socket.emit('join_success', {
      student: studentData,
      isAssigned: session.isAssigned,
      assignedGroups: session.assignedGroups
    });

    // 전체/교수자 화면에 학생 명단 갱신 알림
    io.to(currentRoom).emit('students_updated', {
      students: Array.from(session.students.values()),
      count: session.students.size
    });
  });

  // 3. 교수자 수동 학생 추가
  socket.on('manual_add_student', ({ roomId = 'ENG-EDU-1', studentId, name, gender }) => {
    if (clientRole !== 'instructor') return;
    if (!studentId || !name || !gender) return;

    const session = getOrCreateSession(roomId);
    const sId = studentId.trim();
    const studentData = {
      id: `std_${sId}`,
      studentId: sId,
      name: name.trim(),
      gender: gender === '남' ? '남' : '여',
      socketId: null,
      joinedAt: new Date().toISOString(),
      manual: true
    };

    session.students.set(sId, studentData);

    io.to(roomId).emit('students_updated', {
      students: Array.from(session.students.values()),
      count: session.students.size
    });
  });

  // 4. 교수자 학생 삭제
  socket.on('remove_student', ({ roomId = 'ENG-EDU-1', studentId }) => {
    if (clientRole !== 'instructor') return;
    const session = getOrCreateSession(roomId);
    if (session.students.has(studentId)) {
      session.students.delete(studentId);
      io.to(roomId).emit('students_updated', {
        students: Array.from(session.students.values()),
        count: session.students.size
      });
    }
  });

  // 5. 전체 학생 초기화 (Reset Roster)
  socket.on('clear_all_students', ({ roomId = 'ENG-EDU-1' }) => {
    if (clientRole !== 'instructor') return;
    const session = getOrCreateSession(roomId);
    session.students.clear();
    session.assignedGroups = null;
    session.isAssigned = false;

    io.to(roomId).emit('students_updated', {
      students: [],
      count: 0
    });
    io.to(roomId).emit('groups_reset');
  });

  // 6. 조편성 실행 트리거
  socket.on('execute_assignment', ({ roomId = 'ENG-EDU-1' }) => {
    if (clientRole !== 'instructor') return;
    const session = getOrCreateSession(roomId);
    const studentsList = Array.from(session.students.values());

    if (studentsList.length < 3) {
      socket.emit('assignment_error', { message: '조편성을 위해 최소 3명 이상의 학생이 필요합니다.' });
      return;
    }

    // 서버 측 배정 알고리즘 실행
    const groups = assignGroups(studentsList);
    session.assignedGroups = groups;
    session.isAssigned = true;

    // 조편성 결과 브로드캐스트 (애니메이션 동기화 포함)
    io.to(roomId).emit('groups_assigned', {
      groups,
      timestamp: new Date().toISOString()
    });
  });

  // 7. 교수자 조편성 결과 수동 수정 (드래그앤드롭 등)
  socket.on('update_groups', ({ roomId = 'ENG-EDU-1', groups }) => {
    if (clientRole !== 'instructor') return;
    const session = getOrCreateSession(roomId);
    session.assignedGroups = groups;
    session.isAssigned = true;

    // 업데이트된 조편성 결과 전파
    io.to(roomId).emit('groups_updated', {
      groups,
      timestamp: new Date().toISOString()
    });
  });

  // 8. 조편성 결과 초기화 (재편성 준비)
  socket.on('reset_assignment', ({ roomId = 'ENG-EDU-1' }) => {
    if (clientRole !== 'instructor') return;
    const session = getOrCreateSession(roomId);
    session.assignedGroups = null;
    session.isAssigned = false;

    io.to(roomId).emit('groups_reset');
  });

  // 접속 종료 처리
  socket.on('disconnect', () => {
    // 학생의 경우 연결 끊김 시에도 명단은 유지(새로고침/모바일 화면 전환 대비)
    // 원할 경우 교수자가 수동 삭제 가능
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 [영어과교육론1] 자동 조편성 웹앱 서버 실행 완료!`);
  console.log(`💻 교수자 대시보드 : http://localhost:${PORT}`);
  console.log(`📱 학생 접속 페이지 : http://localhost:${PORT}/join`);
  console.log(`====================================================`);
});
