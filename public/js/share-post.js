document.addEventListener('DOMContentLoaded', () => {
    const shareButton = document.getElementById('share-button');
  
    if (shareButton) {
      shareButton.addEventListener('click', async () => {
        const currentUrl = window.location.href;
  
        try {
          await navigator.clipboard.writeText(currentUrl);
          alert('링크가 복사되었습니다.');
        } catch (err) {
          console.error('링크 복사 실패:', err);
          alert('링크 복사에 실패했습니다. 수동으로 복사해주세요.');
        }
      });
    }
  });
  