let isSubmitting = false;
let isLoggedIn = false;

document.addEventListener('DOMContentLoaded', async () => {
    const commentForm = document.getElementById('comment-form');
    const commentsList = document.getElementById('comments-list');
  
    // 페이지 로드 시 댓글 불러오기
    await loadComments();
  

  if (commentForm) {
    commentForm.addEventListener('submit', async function (e) {
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
          addCommentToDOM(newComment, commentsList);
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
        const data = await response.json();
        isLoggedIn = data.isLoggedIn; // 서버에서 받은 로그인 상태 저장
        console.log('로그인 상태:', isLoggedIn); // 디버깅을 위해 로그 추가
        const comments = data.comments;
  
        // 댓글 리스트 초기화
        commentsList.innerHTML = '';
  
        // 루트 댓글부터 DOM에 추가
        comments.forEach(comment => addCommentToDOM(comment, commentsList));
      } else {
        console.error('댓글 로드 실패');
      }
    } catch (error) {
      console.error('댓글 로드 중 오류 발생:', error);
    }
  }
  

  function addCommentToDOM(comment, parentElement) {
    if (!parentElement) {
      console.error('부모 요소가 존재하지 않습니다.');
      return;
    }
  
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    commentElement.dataset.commentId = comment.id;
  
    const formattedDate = new Date(comment.created_at).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  
    const authorPrefix = comment.parent_id ? '(답글) ' : '';
    const indentation = comment.parent_id ? '&nbsp;'.repeat(4) : '';
  
    const formattedContent = comment.content
        .split('\n') // 줄바꿈 기준으로 나눔
        .map((line, index) => {
            // 첫 줄은 기본 들여쓰기, 이후 줄은 추가 들여쓰기
            return index === 0 ? line : `${indentation}${line}`;
        })
        .join('<br>'); // 다시 <br>로 합침

    commentElement.innerHTML = `
      ${indentation}${authorPrefix}<span class="comment-author">${comment.author}</span> | 
      <span class="comment-date">${formattedDate}</span> | 
      <span class="comment-likes">좋아요: <span class="likes-count">${comment.likes}</span></span>
      <button class="like-button">👍</button>
      <button class="report-button">🚨 신고</button>
      ${comment.isOwnComment ? '<button class="delete-button">🗑️ 삭제</button>' : ''}
      <br>
      ${indentation}<span class="comment-content">${formattedContent}</span><br>
      ${indentation}<button class="reply-button">답글</button>
      <div class="replies"></div>
    `;
  
    // 이벤트 리스너 추가
    commentElement.querySelector('.like-button').addEventListener('click', () => handleLike(comment.id));
    commentElement.querySelector('.report-button').addEventListener('click', () => handleReport());
  
    // 답글 버튼 이벤트 리스너 추가
    const replyButton = commentElement.querySelector('.reply-button');
    replyButton.addEventListener('click', () => {
      if (!isLoggedIn) {
        alert('답글을 작성하려면 로그인이 필요합니다.');
        window.location.href = '/';
        return;
      }
      showReplyForm(comment.id);
    });

    function showReplyForm(parentId) {
        const parentCommentEl = document.querySelector(`[data-comment-id="${parentId}"]`);
        if (!parentCommentEl) return;
    
        let replyForm = parentCommentEl.querySelector('.reply-form');
        if (!replyForm) {
          replyForm = document.createElement('form');
          replyForm.className = 'reply-form';
          replyForm.innerHTML = `
            <textarea name="content" placeholder="답글을 입력하세요" required></textarea>
            <button type="submit">답글 작성</button>
          `;
    
          replyForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            
            const content = replyForm.querySelector('textarea[name="content"]').value;
            const postId = window.location.pathname.split('/').pop();
    
            try {
              const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, postId, parentId }),
              });
    
              if (response.ok) {
                const newReply = await response.json();
                const repliesContainer = parentCommentEl.querySelector('.replies');
                addCommentToDOM(newReply, repliesContainer);
                replyForm.remove();
              } else if (response.status === 401) {
                alert('로그인이 필요합니다.');
                window.location.href = '/';
              } else {
                console.error('답글 작성 실패');
              }
            } catch (error) {
              console.error('답글 작성 중 오류 발생:', error);
            }
          });
    
          parentCommentEl.appendChild(replyForm);
        } else {
          replyForm.remove();
        }
      }
      
    
    if (comment.isOwnComment) {
      const deleteButton = commentElement.querySelector('.delete-button');
      deleteButton.addEventListener('click', () => handleDelete(comment.id));
    }
  
    parentElement.appendChild(commentElement);
  
    // 대댓글 추가
    if (comment.replies && comment.replies.length > 0) {
      const repliesContainer = commentElement.querySelector('.replies');
      comment.replies.forEach(reply => addCommentToDOM(reply, repliesContainer));
    }
  }
  

  async function handleDelete(commentId) {
    if (confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
      try {
        const response = await fetch(`/api/comments/${commentId}/delete`, {
          method: 'POST',
        });
        if (response.ok) {
          const updatedComment = await response.json();
          const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
          commentElement.querySelector('.comment-author').textContent = '-';
          commentElement.querySelector('.comment-content').textContent = '삭제된 댓글입니다.';
          commentElement.querySelector('.delete-button')?.remove();
        } else {
          console.error('댓글 삭제 실패');
          alert('댓글 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('댓글 삭제 중 오류 발생:', error);
        alert('댓글 삭제 중 오류가 발생했습니다.');
      }
    }
  }

  function handleReport() {
    if (confirm("정말 신고하시겠습니까? 허위 신고일 경우 패널티가 부여됩니다.")) {
      alert("신고되었습니다.");
    }
  }

  async function handleLike(commentId) {
    try {
      const response = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
  
      if (response.ok) {
        const data = await response.json();
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        const likesCountElement = commentElement.querySelector('.likes-count');
  
        // 좋아요 상태에 따라 메시지 표시
        if (data.liked) {
          alert('좋아요를 눌렀습니다.');
        } else {
          alert('좋아요를 취소했습니다.');
        }
  
        // 업데이트된 좋아요 수 반영
        likesCountElement.textContent = data.likes;
      } else if (response.status === 401) {
        alert('로그인이 필요합니다.');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('좋아요 처리 중 오류 발생:', error);
    }
  }
})
