document.addEventListener('DOMContentLoaded', () => {
    const reportButton = document.getElementById('report-button');
  
    if (reportButton) {
      reportButton.addEventListener('click', () => {
        const confirmReport = confirm("정말 신고하시겠습니까? 허위 신고일 경우 패널티가 부여됩니다.");
        
        if (confirmReport) {
          // 실제 신고 처리 로직을 추가하면 되는데 지금은 운영을 안하니까 비워둠
          
          alert("신고되었습니다.");
        }
      });
    }
  });
  