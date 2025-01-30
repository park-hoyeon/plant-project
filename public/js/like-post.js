document.addEventListener('DOMContentLoaded', () => {
    const likeButton = document.getElementById('like-button');
    const likesCount = document.getElementById('likes-count');
  
    if (likeButton) {
      likeButton.addEventListener('click', async () => {
        const postId = likeButton.dataset.postId;
        const boardId = likeButton.dataset.boardId;
  
        try {
          const response = await fetch(`/plantowner/community/${boardId}/${postId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
  
          if (response.ok) {
            const data = await response.json();
            likesCount.textContent = data.likes;
            likeButton.textContent = data.liked ? '공감 취소' : '공감';
          } else {
            console.error('좋아요 처리 실패');
          }
        } catch (error) {
          console.error('좋아요 처리 중 오류 발생:', error);
        }
      });
    }
  });
  