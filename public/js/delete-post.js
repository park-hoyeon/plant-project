document.addEventListener('DOMContentLoaded', function() {
    const deleteBtn = document.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        if (confirm('정말로 이 글을 삭제하시겠습니까?')) {
          const boardId = this.dataset.boardId;
          const postId = this.dataset.postId;
          fetch(`/plantowner/community/${boardId}/${postId}`, {
            method: 'DELETE',
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              alert('글이 삭제되었습니다.');
              window.location.href = `/plantowner/community/${boardId}`;
            } else {
              alert(data.error || '삭제 중 오류가 발생했습니다.');
            }
          })
          .catch(error => {
            console.error('Error:', error);
            alert('삭제 중 오류가 발생했습니다.');
          });
        }
      });
    }
  });
  