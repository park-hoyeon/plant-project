const express = require('express');
const router = express.Router();

// 로그인 확인 미들웨어
function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
}

// 댓글 작성 라우트
router.post('/create', isLoggedIn, (req, res) => {
  const { content, postId } = req.body;
  const userId = req.session.user.id;

  const sql = `INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)`;
  db.run(sql, [userId, postId, content], function(err) {
    if (err) {
      console.error('댓글 작성 오류:', err);
      res.status(500).json({ error: '댓글 작성 중 오류가 발생했습니다.' });
    } else {
      res.status(201).json({ message: '댓글이 성공적으로 작성되었습니다.', commentId: this.lastID });
    }
  });
});

module.exports = router;


document.addEventListener('DOMContentLoaded', () => {
    const commentForm = document.getElementById('comment-form');
    const commentsList = document.getElementById('comments-list');
  
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitComment(e.target);
    });
  
    commentsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('like-button')) {
          await likeComment(e.target.dataset.id);
        } else if (e.target.classList.contains('reply-button')) {
          showReplyForm(e.target.dataset.id);
        } else if (e.target.classList.contains('report-button')) {
          reportComment(e.target.dataset.id);
        }
      });
  
      async function submitComment(form, parentId = null) {
        const content = form.content.value;
        const postId = window.location.pathname.split('/').pop();
      
        try {
          const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, postId, parentId }),
          });
      
          if (response.ok) {
            const newComment = await response.json();
            addCommentToDOM(newComment, parentId);
            form.reset();
          } else if (response.status === 401) {
            // 로그인되지 않은 경우
            alert('댓글을 작성하려면 로그인이 필요합니다.');
            window.location.href = '/'; // 로그인 페이지로 리다이렉트
          } else {
            console.error('댓글 작성 실패');
          }
        } catch (error) {
          console.error('댓글 작성 중 오류 발생:', error);
        }
      }
  
    async function likeComment(commentId) {
      try {
        const response = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
        if (response.ok) {
          const { likes } = await response.json();
          updateLikesCount(commentId, likes);
        }
      } catch (error) {
        console.error('공감 처리 중 오류 발생:', error);
      }
    }
  
    function showReplyForm(parentId) {
      const replyForm = document.createElement('form');
      replyForm.innerHTML = `
        <textarea name="content" placeholder="답글을 입력하세요"></textarea>
        <button type="submit">답글 작성</button>
      `;
      replyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitComment(e.target, parentId);
        replyForm.remove();
      });
      document.getElementById(`comment-${parentId}`).appendChild(replyForm);
    }
  
    function showReportForm(commentId) {
      const reportForm = document.createElement('form');
      reportForm.innerHTML = `
        <textarea name="reason" placeholder="신고 사유를 입력하세요"></textarea>
        <button type="submit">신고하기</button>
      `;
      reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await reportComment(commentId, e.target.reason.value);
        reportForm.remove();
      });
      document.getElementById(`comment-${commentId}`).appendChild(reportForm);
    }
  
    async function reportComment(commentId, reason) {
      try {
        const response = await fetch('/api/comments/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId, reason }),
        });
        if (response.ok) {
          alert('신고가 접수되었습니다.');
        }
      } catch (error) {
        console.error('신고 처리 중 오류 발생:', error);
      }
    }
  
    function addCommentToDOM(comment, parentId) {
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.id = `comment-${comment.id}`;
      commentElement.innerHTML = `
        <p class="comment-content">${comment.content}</p>
        <p class="comment-author">${comment.user_nickname}</p>
        <p class="comment-date">${comment.created_at}</p>
        <p class="comment-likes">Likes: ${comment.likes}</p>
        <button class="like-button" data-id="${comment.id}">공감</button>
        <button class="reply-button" data-id="${comment.id}">답글</button>
        <button class="report-button" data-id="${comment.id}">신고</button>
      `;
      if (parentId) {
        const parentComment = document.getElementById(`comment-${parentId}`);
        let repliesContainer = parentComment.querySelector('.replies');
        if (!repliesContainer) {
          repliesContainer = document.createElement('div');
          repliesContainer.className = 'replies';
          parentComment.appendChild(repliesContainer);
        }
        repliesContainer.appendChild(commentElement);
      } else {
        commentsList.prepend(commentElement);
      }
    }
  
    function updateLikesCount(commentId, likes) {
      const likesElement = document.querySelector(`#comment-${commentId} .comment-likes`);
      likesElement.textContent = `Likes: ${likes}`;
    }
  });
  