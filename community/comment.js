const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.post('/', (req, res) => {
    const { content, postId, parentId } = req.body;
    const userId = req.session?.user?.ID || null;
    const author = req.session?.user?.nickname || '익명';

    console.log('세션 데이터:', req.session);
    console.log('userId:', userId);
    console.log('요청 데이터:', { content, postId });

    if (!content || !postId) {
      return res.status(400).json({ error: '내용과 게시글 ID는 필수입니다.' });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // 중복 댓글 확인 SQL
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

        // 댓글 삽입 SQL
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

          // 트랜잭션 커밋
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

  return router;
};
