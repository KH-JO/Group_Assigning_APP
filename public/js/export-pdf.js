/**
 * 조편성 결과 PDF 및 CSV 내보내기 모듈
 */

const ExportManager = {
  /**
   * PDF 다운로드 (브라우저 인쇄 엔진 및 html2pdf 활용하여 깨끗한 한글 지원)
   */
  exportToPDF(groups, courseTitle = '영어과교육론1', activityTitle = '그룹 수업 실연 조편성') {
    if (!groups || groups.length === 0) {
      alert('다운로드할 조편성 결과가 없습니다.');
      return;
    }

    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const totalStudents = groups.reduce((acc, g) => acc + g.members.length, 0);

    // 인쇄용 컨테이너 생성
    let printContainer = document.getElementById('pdf-export-container');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'pdf-export-container';
      document.body.appendChild(printContainer);
    }

    let groupsHtml = '';
    groups.forEach((g) => {
      const rows = g.members.map((m, idx) => `
        <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
          <td style="text-align:center; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px;">${idx + 1}</td>
          <td style="text-align:center; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; font-weight:600;">${m.studentId}</td>
          <td style="text-align:center; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; font-weight:700;">${m.name}</td>
          <td style="text-align:center; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px;">
            <span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight:600; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;">
              ${m.gender}
            </span>
          </td>
          <td style="text-align:center; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; font-weight:700; color: #1e293b;">
            <span style="display:inline-block; padding: 3px 10px; border-radius: 6px; background: #f1f5f9; border: 1px solid #e2e8f0;">
              ${m.role || '-'}
            </span>
          </td>
          <td style="text-align:center; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; font-weight:600; color: #0369a1;">
            ${g.skillInfo.fullName}
          </td>
          <td style="text-align:center; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; font-weight:700; color: #4338ca;">
            ${g.skillInfo.weekText}
          </td>
        </tr>
      `).join('');

      groupsHtml += `
        <div style="margin-bottom: 24px; break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="background: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 16px; font-weight: 800; color: #0f172a;">👥 제 ${g.groupNumber} 조 (${g.members.length}인)</span>
              <span style="font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">
                ${g.skillInfo.fullName}
              </span>
            </div>
            <div>
              <span style="font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe;">
                🗓️ 실연 일정: ${g.skillInfo.weekText}
              </span>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700;">
                <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; width: 45px;">No</th>
                <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; width: 100px;">학번</th>
                <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; width: 90px;">이름</th>
                <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; width: 60px;">성별</th>
                <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; width: 140px;">수업실연 역할</th>
                <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center;">실연 기능</th>
                <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; width: 80px;">실연 주차</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    });

    const fullContent = `
      <div id="pdf-printable-area" style="font-family: 'Pretendard', sans-serif; color: #1e293b; padding: 30px; max-width: 900px; margin: 0 auto; background: white;">
        <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 18px; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0;">
            [${courseTitle}] ${activityTitle} 결과표
          </h1>
          <div style="font-size: 13px; color: #64748b; display: flex; justify-content: center; gap: 20px;">
            <span>📅 <strong>편성 일자:</strong> ${today}</span>
            <span>👥 <strong>총 인원:</strong> ${totalStudents}명</span>
            <span>📊 <strong>편성 조 수:</strong> 총 ${groups.length}개 조</span>
            <span>📌 <strong>주차 안내:</strong> 이해기능(14주차) / 표현기능(15주차)</span>
          </div>
        </div>

        <div style="margin-bottom: 18px; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12px; color: #166534; line-height: 1.5;">
          <strong>💡 수업 실연 역할 안내:</strong><br>
          • <strong>4인 그룹:</strong> 도입 및 정리 활동 (1명), 활동 1 (1명), 활동 2 (1명), 활동 3 (1명)<br>
          • <strong>3인 그룹:</strong> 활동 1 (1명), 활동 2 (1명), 활동 3 (1명)
        </div>

        ${groupsHtml}

        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          영어과교육론1 자동 조편성 시스템 생성 문서 • ${today}
        </div>
      </div>
    `;

    printContainer.innerHTML = fullContent;

    // html2pdf 라이브러리가 로드되어 있으면 직접 PDF 파일 다운로드 실행
    if (typeof html2pdf !== 'undefined') {
      const element = document.getElementById('pdf-printable-area');
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${courseTitle}_수업실연_조편성결과_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 로딩 알림
      const originalText = document.getElementById('btn-download-pdf')?.innerHTML;
      if (document.getElementById('btn-download-pdf')) {
        document.getElementById('btn-download-pdf').innerHTML = '⏳ PDF 생성 중...';
      }

      html2pdf().set(opt).from(element).save().then(() => {
        if (document.getElementById('btn-download-pdf')) {
          document.getElementById('btn-download-pdf').innerHTML = originalText;
        }
      }).catch(err => {
        console.error('PDF export error:', err);
        // Fallback to window.print
        window.print();
        if (document.getElementById('btn-download-pdf')) {
          document.getElementById('btn-download-pdf').innerHTML = originalText;
        }
      });
    } else {
      // html2pdf 없을 시 브라우저 인쇄 다이얼로그 호출
      window.print();
    }
  },

  /**
   * 엑셀 호환 CSV 파일 다운로드
   */
  exportToCSV(groups, courseTitle = '영어과교육론1') {
    if (!groups || groups.length === 0) {
      alert('내보낼 조편성 결과가 없습니다.');
      return;
    }

    const headers = ['조', '수업실연 기능', '실연 주차', '순번', '학번', '이름', '성별', '배정 역할'];
    const rows = [];

    groups.forEach((g) => {
      g.members.forEach((m, idx) => {
        rows.push([
          `제 ${g.groupNumber} 조`,
          `"${g.skillInfo.fullName}"`,
          `"${g.skillInfo.weekText}"`,
          idx + 1,
          `\t${m.studentId}`, // 엑셀에서 학번 앞자리 0 보존을 위해 탭 추가
          `"${m.name}"`,
          m.gender,
          `"${m.role || ''}"`
        ]);
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${courseTitle}_조편성결과_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Export to window
if (typeof window !== 'undefined') {
  window.ExportManager = ExportManager;
}
