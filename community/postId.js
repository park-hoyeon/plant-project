const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const dbPath = './community.db'; // 데이터베이스 파일 경로
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite 데이터베이스 연결 오류:', err.message);
  } else {
    console.log('SQLite 데이터베이스에 연결되었습니다.');
  }
});


router.get('/:boardId/:id', (req, res) => {
    const { boardId, id } = req.params;
    const currentId = parseInt(id);
    const userId = req.session.user ? req.session.user.id : null;
  
    // 현재 게시글 조회
    const sqlCurrent = `SELECT * FROM ${boardId}_posts WHERE id = ?`;
    
    // 이전 글과 다음 글의 ID 조회
    const sqlPrevNext = `
      SELECT 
        (SELECT MIN(id) FROM ${boardId}_posts WHERE id > ?) as prevId,
        (SELECT MAX(id) FROM ${boardId}_posts WHERE id < ?) as nextId
    `;
  
    db.get(sqlCurrent, [currentId], (err, post) => {
      if (err) {
        console.error('게시글 조회 오류:', err);
        return res.status(500).send('서버 오류가 발생했습니다.');
      }
  
      if (!post) {
        return res.status(404).send('게시글을 찾을 수 없습니다.');
      }
  
      // 이전 글과 다음 글의 ID 조회
      db.get(sqlPrevNext, [currentId, currentId], (err, prevNext) => {
        if (err) {
          console.error('이전/다음 글 ID 조회 오류:', err);
          return res.status(500).send('서버 오류가 발생했습니다.');
        }
  
        // 로그인한 사용자만 조회수 증가
        if (userId) {
          const checkViewSql = `
            SELECT viewed_at FROM user_views 
            WHERE user_id = ? AND post_id = ? AND board_id = ?
          `;
          db.get(checkViewSql, [userId, currentId, boardId], (err, viewRecord) => {
            if (err) {
              console.error('조회 기록 확인 오류:', err);
            } else {
              const now = new Date();
              if (!viewRecord || (now - new Date(viewRecord.viewed_at)) / (1000 * 60 * 60) >= 12) {
                // 12시간이 지났거나 처음 조회하는 경우
                const updateViewsSql = `
                  INSERT OR REPLACE INTO user_views (user_id, post_id, board_id, viewed_at)
                  VALUES (?, ?, ?, datetime('now'))
                `;
                db.run(updateViewsSql, [userId, currentId, boardId], (err) => {
                  if (err) {
                    console.error('조회 기록 업데이트 오류:', err);
                  } else {
                    // 기존 views 컬럼 1 증가
                    db.run(`UPDATE ${boardId}_posts SET views = views + 1 WHERE id = ?`, [currentId]);
                  }
                });
              }
            }
          });
        }
  
        res.render('postId', { 
          post, 
          boardId,
          prevPostId: prevNext.prevId,
          nextPostId: prevNext.nextId,
          user: req.session.user
        });
      });
    });
  });
  
module.exports = router;