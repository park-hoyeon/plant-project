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

  // 댓글 가져오기
  router.get('/', (req, res) => {
    const postId = req.query.postId;

    const sql = `
      SELECT * FROM comments 
      WHERE post_id = ? 
      ORDER BY created_at DESC
    `;
    
    db.all(sql, [postId], (err, rows) => {
      if (err) {
        console.error('댓글 조회 오류:', err.message);
        return res.status(500).json({ error: '댓글 조회 중 오류가 발생했습니다.' });
      }
      res.json(rows);
    });
  });

  // 좋아요 기능
  router.post('/:id/like', (req, res) => {
    const commentId = req.params.id;

    db.get('SELECT likes FROM comments WHERE id = ?', [commentId], (err, row) => {
      if (err) {
        console.error('댓글 조회 오류:', err.message);
        return res.status(500).json({ error: '댓글 조회 중 오류가 발생했습니다.' });
      }

      if (!row) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }

      const currentLikes = row.likes || 0;
      const newLikes = currentLikes % 2 === 0 ? currentLikes + 1 : currentLikes - 1;

      db.run('UPDATE comments SET likes = ? WHERE id = ?', [newLikes, commentId], function (err) {
        if (err) {
          console.error('좋아요 업데이트 오류:', err.message);
          return res.status(500).json({ error: '좋아요 업데이트 중 오류가 발생했습니다.' });
        }

        res.json({ likes: newLikes });
      });
    });
  });

  return router;
};
