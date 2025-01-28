const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('./community.db');

// 게시글 상세 조회 라우트
router.get('/:boardId/:id', (req, res) => {
  const { boardId, id } = req.params; // boardId와 postId를 URL에서 가져옴
  const sql = `SELECT * FROM ${boardId}_posts WHERE id = ?`;

  // 데이터베이스에서 게시글 조회
  db.get(sql, [id], (err, post) => {
    if (err) {
      console.error('게시글 조회 오류:', err);
      return res.status(500).send('서버 오류가 발생했습니다.');
    }

    if (!post) {
      return res.status(404).send('게시글을 찾을 수 없습니다.');
    }

    // 조회수 증가
    const updateViewsSql = `UPDATE ${boardId}_posts SET views = views + 1 WHERE id = ?`;
    db.run(updateViewsSql, [id], (err) => {
      if (err) {
        console.error('조회수 업데이트 오류:', err);
        return res.status(500).send('서버 오류가 발생했습니다.');
      }

      // 게시글 상세 페이지 렌더링
      res.render('post', { post, boardId });
    });
  });
});

module.exports = router;

