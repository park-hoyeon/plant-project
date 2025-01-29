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
  
  function addCommentToDOM(comment, parentId = null) {
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    commentElement.dataset.commentId = comment.id;
    
    const formattedContent = comment.content.replace(/\n/g, '<br>');
    
    const authorPrefix = comment.parent_id ? '(답글) ' : '';
    const indentation = comment.parent_id ? '&nbsp;'.repeat(10) : ''; // 답글인 경우 10개의 공백 추가
    
    commentElement.innerHTML = `
      ${indentation}${authorPrefix}<span class="comment-author">${comment.author}</span> |
      <span class="comment-date">${new Date(comment.created_at).toLocaleString()}</span> |
      <span class="comment-likes">좋아요: ${comment.likes}</span><br>
      ${indentation}${formattedContent}<br>
      ${indentation}<button class="reply-button">답글</button>
      <div class="replies"></div>
    `;
  
    const replyButton = commentElement.querySelector('.reply-button');
    replyButton.addEventListener('click', () => showReplyForm(comment.id));
  
    if (parentId) {
      const parentComment = document.querySelector(`[data-comment-id="${parentId}"]`);
      parentComment.querySelector('.replies').appendChild(commentElement);
    } else {
      commentsList.prepend(commentElement);
    }
  }
  
  
  
  
  
  function showReplyForm(parentId) {
    const replyForm = document.createElement('form');
    replyForm.className = 'reply-form';
    replyForm.innerHTML = `
      <textarea name="content" placeholder="답글을 입력하세요" required></textarea>
      <button type="submit">답글 작성</button>
    `;
  
    replyForm.addEventListener('submit', (e) => handleReplySubmit(e, parentId));
  
    const parentComment = document.querySelector(`[data-comment-id="${parentId}"]`);
    parentComment.appendChild(replyForm);
  }
  
  async function handleReplySubmit(e, parentId) {
    e.preventDefault();
    const form = e.target;
    const content = form.content.value;
    const postId = window.location.pathname.split('/').pop();
  
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, postId, parentId }),
      });
  
      if (response.ok) {
        const newComment = await response.json();
        addCommentToDOM(newComment, parentId);
        form.remove();
      } else {
        const errorData = await response.json();
        alert(`답글 작성 실패: ${errorData.error}`);
      }
    } catch (error) {
      console.error('답글 작성 중 오류 발생:', error);
      alert('답글 작성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  }
  
  
  });
  