const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();

const dbPath = './community.db';

const isLoggedIn = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: '로그인이 필요합니다.' });
  }
};

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite 데이터베이스 연결 오류:', err.message);
  } else {
    console.log('SQLite 데이터베이스에 연결되었습니다.');
  }
});

// 조회 기록을 저장할 객체
const viewCache = {};

router.get('/:boardId/:id', (req, res) => {
  const { boardId, id } = req.params;
  const currentId = parseInt(id);
  const userId = req.session.user ? req.session.user.id : 'anonymous';

  // 현재 게시글 조회
  const sqlCurrent = `SELECT *, datetime(createdAt, 'localtime') as createdAt, datetime(updatedAt, 'localtime') as updatedAt FROM ${boardId}_posts WHERE id = ?`;

  
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

    // 작성자 정보 포맷팅 (이미 저장된 형식이므로 추가 처리 불필요)
    post.formattedAuthor = post.author;

    // 이전 글과 다음 글의 ID 조회
    db.get(sqlPrevNext, [currentId, currentId], (err, prevNext) => {
      if (err) {
        console.error('이전/다음 글 ID 조회 오류:', err);
        return res.status(500).send('서버 오류가 발생했습니다.');
      }

      // 로그인한 사용자만 조회수 증가
      if (userId !== 'anonymous') {
        updateViewCount(userId, currentId, boardId);
      }

      // 댓글 조회 쿼리 수정
      const sqlComments = `
          SELECT *
          FROM comments
          WHERE post_id = ?
          ORDER BY created_at DESC
      `;

      db.all(sqlComments, [currentId], (err, comments) => {
        if (err) {
            console.error('댓글 조회 오류:', err);
            return res.status(500).send('서버 오류가 발생했습니다.');
        }

        res.render('postId', { 
            post, 
            boardId,
            prevPostId: prevNext.prevId,
            nextPostId: prevNext.nextId,
            user: req.session.user,
            comments: comments
        });
      });
    });
  });
});


function updateViewCount(userId, postId, boardId) {
  const now = Date.now();
  const cacheKey = `${userId}:${boardId}:${postId}`;
  
  if (!viewCache[cacheKey] || now - viewCache[cacheKey] >= 60 * 60 * 1000) { // 1시간 제한
    viewCache[cacheKey] = now;
    
    const incrementViewsSql = `UPDATE ${boardId}_posts SET views = views + 1 WHERE id = ?`;
    
    db.run(incrementViewsSql, [postId], function(err) {
      if (err) {
        console.error('조회수 증가 오류:', err);
      } else {
        console.log(`조회수 업데이트 성공.`);
      }
    });
  } else {
    console.log('1시간 내 재조회로 조회수가 증가하지 않았습니다.');
  }
}

// 삭제 라우터
router.delete('/:boardId/:id', isLoggedIn, async (req, res) => {
  const { boardId, id } = req.params;
  const userId = req.session.user ? req.session.user.ID : null;

  db.get(`SELECT author_id FROM ${boardId}_posts WHERE id = ?`, [id], (err, post) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '서버 오류' });
    }
    if (!post || !userId || post.author_id !== userId.toString()) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '트랜잭션 시작 오류' });
      }

      db.run(`DELETE FROM ${boardId}_posts WHERE id = ?`, [id], (err) => {
        if (err) {
          console.error(err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: '삭제 중 오류 발생' });
        }

        db.run(`UPDATE ${boardId}_posts SET id = id - 1 WHERE id > ?`, [id], (err) => {
          if (err) {
            console.error(err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'ID 업데이트 중 오류 발생' });
          }

          db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM ${boardId}_posts) WHERE name = ?`, [`${boardId}_posts`], (err) => {
            if (err) {
              console.error(err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Sequence 업데이트 중 오류 발생' });
            }

            db.run('COMMIT', (err) => {
              if (err) {
                console.error(err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: '트랜잭션 커밋 중 오류 발생' });
              }
              res.json({ success: true });
            });
          });
        });
      });
    });
  });
});




module.exports = router;
