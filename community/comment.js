const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // 댓글 작성
  router.post('/', (req, res) => {
    const { content, postId, parentId } = req.body;
    const userId = req.session?.user?.ID || null;
    const author = req.session?.user?.nickname || '익명';

    if (!content || !postId) {
      return res.status(400).json({ error: '내용과 게시글 ID는 필수입니다.' });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      const checkDuplicateSql = `
        SELECT COUNT(*) as count FROM comments
        WHERE user_id = ? AND post_id = ? AND content = ? AND created_at > datetime('now', '-10 seconds')
      `;

      db.get(checkDuplicateSql, [userId, postId, content], (err, row) => {
        if (err) {
          console.error('중복 확인 오류:', err.message);
          db.run('ROLLBACK');
          return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }

        if (row.count > 0) {
          db.run('ROLLBACK');
          return res.status(400).json({ error: '중복된 댓글입니다. 잠시 후 다시 시도해주세요.' });
        }

        const insertSql = `
          INSERT INTO comments (user_id, post_id, content, author, likes, created_at, parent_id)
          VALUES (?, ?, ?, ?, 0, datetime('now'), ?)
        `;

        db.run(insertSql, [userId, postId, content, author, parentId], function (err) {
          if (err) {
            console.error('댓글 작성 오류:', err.message);
            db.run('ROLLBACK');
            return res.status(500).json({ error: '댓글 작성 중 오류가 발생했습니다.' });
          }

          db.run('COMMIT');
          res.status(201).json({
            id: this.lastID,
            content,
            author,
            likes: 0,
            created_at: new Date().toISOString(),
            parent_id: parentId,
          });
        });
      });
    });
  });

  // 댓글 조회
  router.get('/', (req, res) => {
    const postId = req.query.postId;
    const userId = req.session?.user?.ID || null;
    const isLoggedIn = !!userId;
  
    const sql = `
      SELECT c.*, 
             CASE WHEN c.user_id = ? THEN 1 ELSE 0 END as isOwnComment
      FROM comments c
      WHERE c.post_id = ?
      ORDER BY c.parent_id NULLS FIRST, c.created_at ASC
    `;
  
    db.all(sql, [userId, postId], (err, rows) => {
      if (err) {
        console.error('댓글 조회 오류:', err.message);
        return res.status(500).json({ error: '댓글 조회 중 오류가 발생했습니다.' });
      }
  
      // 댓글 계층 구조 생성
      const commentMap = new Map();
      const rootComments = [];
  
      rows.forEach(row => {
        const comment = {
          ...row,
          author: row.content === '삭제된 댓글입니다.' ? '-' : row.author,
          replies: []
        };
  
        commentMap.set(comment.id, comment);
  
        if (comment.parent_id === null) {
          rootComments.push(comment);
        } else {
          const parentComment = commentMap.get(comment.parent_id);
          if (parentComment) {
            parentComment.replies.push(comment);
          }
        }
      });
  
      res.json({
        comments: rootComments,
        isLoggedIn: isLoggedIn
      });
    });
  });
  


// 좋아요 기능
router.post('/:id/like', (req, res) => {
  const commentId = req.params.id;
  const userId = req.session?.user?.ID;

  if (!userId) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  db.serialize(() => {
    // 댓글에서 좋아요를 누른 사용자 목록 가져오기
    const getLikesSql = `
      SELECT likes, liked_users FROM comments WHERE id = ?
    `;

    db.get(getLikesSql, [commentId], (err, row) => {
      if (err) {
        console.error('좋아요 상태 확인 오류:', err.message);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }

      if (!row) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }

      let likedUsers = row.liked_users ? JSON.parse(row.liked_users) : []; // liked_users는 JSON 문자열로 저장
      const isLiked = likedUsers.includes(userId);

      if (isLiked) {
        // 이미 좋아요를 눌렀다면 -> 좋아요 취소
        likedUsers = likedUsers.filter(id => id !== userId); // 사용자 ID 제거

        const updateLikesSql = `
          UPDATE comments SET likes = likes - 1, liked_users = ? WHERE id = ?
        `;

        db.run(updateLikesSql, [JSON.stringify(likedUsers), commentId], function (err) {
          if (err) {
            console.error('좋아요 취소 오류:', err.message);
            return res.status(500).json({ error: '좋아요 취소 중 오류가 발생했습니다.' });
          }

          res.json({ message: '좋아요가 취소되었습니다.', likes: row.likes - 1, liked: false });
        });
      } else {
        // 아직 좋아요를 누르지 않았다면 -> 좋아요 추가
        likedUsers.push(userId);

        const updateLikesSql = `
          UPDATE comments SET likes = likes + 1, liked_users = ? WHERE id = ?
        `;

        db.run(updateLikesSql, [JSON.stringify(likedUsers), commentId], function (err) {
          if (err) {
            console.error('좋아요 추가 오류:', err.message);
            return res.status(500).json({ error: '좋아요 추가 중 오류가 발생했습니다.' });
          }

          res.json({ message: '좋아요가 추가되었습니다.', likes: row.likes + 1, liked: true });
        });
      }
    });
  });
});

  // 댓글 삭제
  router.post('/:id/delete', (req, res) => {
    const commentId = req.params.id;
    const userId = req.session?.user?.ID;
  
    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
  
    const updateSql = `
      UPDATE comments 
      SET content = '삭제된 댓글입니다.' 
      WHERE id = ? AND user_id = ?
    `;
  
    db.run(updateSql, [commentId, userId], function(err) {
      if (err) {
        console.error('댓글 삭제 오류:', err.message);
        return res.status(500).json({ error: '댓글 삭제 중 오류가 발생했습니다.' });
      }
  
      if (this.changes === 0) {
        return res.status(403).json({ error: '삭제 권한이 없습니다.' });
      }
  
      res.json({ message: '댓글이 삭제되었습니다.' });
    });
  });

  return router;
};
