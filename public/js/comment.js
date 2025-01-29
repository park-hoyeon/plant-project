let isSubmitting = false;

document.addEventListener('DOMContentLoaded', () => {
  const commentForm = document.getElementById('comment-form');
  const commentsList = document.getElementById('comments-list');

  if (commentForm) {
    commentForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (isSubmitting) {
        console.log('이미 제출 중입니다.');
        return;
      }
      
      isSubmitting = true;
      
      const content = commentForm.querySelector('textarea[name="content"]').value;
      const postId = window.location.pathname.split('/').pop();

      if (!content) {
        console.error('댓글 내용이 비어있습니다.');
        isSubmitting = false;
        return;
      }

      try {
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content, postId }),
        });

        if (response.ok) {
          const newComment = await response.json();
          addCommentToDOM(newComment);
          commentForm.reset();
        } else {
          const errorData = await response.json();
          console.error('댓글 작성 실패:', errorData.error);
          alert(`댓글 작성 실패: ${errorData.error}`);
        }
      } catch (error) {
        console.error('댓글 작성 중 오류 발생:', error);
        alert('댓글 작성 중 오류가 발생했습니다. 다시 시도해 주세요.');
      } finally {
        isSubmitting = false;
      }
    });
  }
  
    function addCommentToDOM(comment) {
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.innerHTML = `
        <p class="comment-content">${comment.content}</p>
        <p class="comment-author">${comment.author}</p>
        <p class="comment-date">${new Date(comment.created_at).toLocaleString()}</p>
        <p class="comment-likes">좋아요: ${comment.likes}</p>
      `;
      commentsList.prepend(commentElement);
    }
  });
  