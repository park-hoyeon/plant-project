let isSubmitting = false;

document.addEventListener('DOMContentLoaded', async () => {
  const commentForm = document.getElementById('comment-form');
  const commentsList = document.getElementById('comments-list');

  // 페이지 로드 시 댓글 불러오기
  await loadComments();

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
  
  async function loadComments() {
    const postId = window.location.pathname.split('/').pop();
    try {
      const response = await fetch(`/api/comments?postId=${postId}`);
      if (response.ok) {
        const comments = await response.json();
        const commentMap = new Map();
        const rootComments = [];

        // 댓글을 Map에 저장하고 루트 댓글 식별
        comments.forEach(comment => {
          commentMap.set(comment.id, { ...comment, replies: [] });
          if (!comment.parent_id) {
            rootComments.push(comment);
          }
        });

        // 부모-자식 관계 설정
        comments.forEach(comment => {
          if (comment.parent_id) {
            const parentComment = commentMap.get(comment.parent_id);
            if (parentComment) {
              parentComment.replies.push(comment);
            }
          }
        });

        // 루트 댓글부터 시작하여 DOM에 추가
        rootComments.forEach(comment => addCommentToDOM(commentMap.get(comment.id)));
      } else {
        console.error('댓글 로드 실패');
      }
    } catch (error) {
      console.error('댓글 로드 중 오류 발생:', error);
    }
  }

  function addCommentToDOM(comment, parentElement = commentsList) {
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    commentElement.dataset.commentId = comment.id;
    
    const formattedDate = new Date(comment.created_at).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const authorPrefix = comment.parent_id ? '(답글) ' : '';
    const indentation = comment.parent_id ? '&nbsp;'.repeat(10) : '';
    
    commentElement.innerHTML = `
      ${indentation}${authorPrefix}<span class="comment-author">${comment.author}</span> | 
      <span class="comment-date">${formattedDate}</span> | 
      <span class="comment-likes">좋아요: <span class="likes-count">${comment.likes}</span></span>
      <button class="like-button">👍</button>
      <button class="report-button">🚨 신고</button><br>
      ${indentation}<span class="comment-content">${comment.content}</span><br>
      ${indentation}<button class="reply-button">답글</button>
      <div class="replies"></div>
    `;
  
    const likeButton = commentElement.querySelector('.like-button');
    likeButton.addEventListener('click', () => handleLike(comment.id));
  
    const reportButton = commentElement.querySelector('.report-button');
    reportButton.addEventListener('click', () => handleReport());

    const replyButton = commentElement.querySelector('.reply-button');
    replyButton.addEventListener('click', () => showReplyForm(comment.id));
  
    parentElement.appendChild(commentElement);

    // 대댓글 추가
    if (comment.replies && comment.replies.length > 0) {
      const repliesContainer = commentElement.querySelector('.replies');
      comment.replies.forEach(reply => addCommentToDOM(reply, repliesContainer));
    }
  }

  function handleReport() {
    if (confirm("정말 신고하시겠습니까? 허위 신고일 경우 패널티가 부여됩니다.")) {
      alert("신고되었습니다.");
    }
  }
  
  async function handleLike(commentId) {
    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        const likesCountElement = commentElement.querySelector('.likes-count');
        likesCountElement.textContent = data.likes;
      } else {
        console.error('좋아요 업데이트 실패');
      }
    } catch (error) {
      console.error('좋아요 처리 중 오류 발생:', error);
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
        const parentComment = document.querySelector(`[data-comment-id="${parentId}"]`);
        const repliesContainer = parentComment.querySelector('.replies');
        addCommentToDOM(newComment, repliesContainer);
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
