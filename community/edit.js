const express = require('express');
const router = express.Router();
const db = require('../models/db');

const tagOptions = {
    'free': ['잡담', '질문', '유머'],
    'plant': ['식물 잡담', '식물 팁', '식물 공략', '내 식물 자랑'],
    'event': ['이벤트']
};

// 미들웨어: 로그인 확인
const isLoggedIn = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).send('로그인이 필요합니다.');
  }
};

// 미들웨어: 글 작성자 확인
const isAuthor = (req, res, next) => {
  const { boardId, postId } = req.params;
  const userId = req.session.user.ID; 

  db.get(`SELECT author_id FROM ${boardId}_posts WHERE id = ?`, [postId], (err, post) => {
    if (err) {
      console.error(err);
      return res.status(500).send('서버 오류');
    }
    if (!post || post.author_id !== userId) {
      return res.status(403).send('수정 권한이 없습니다.');
    }
    next();
  });
};

router.get('/:boardId/:postId', isLoggedIn, isAuthor, async (req, res) => {
  const { boardId, postId } = req.params;
  
  db.get(`SELECT * FROM ${boardId}_posts WHERE id = ?`, [postId], (err, post) => {
    if (err) {
      console.error(err);
      return res.status(500).send('서버 오류');
    }
    
    if (!post) {
      return res.status(404).send('게시글을 찾을 수 없습니다.');
    }
    
    post.content = post.content.replace(/<br>/g, '\n');
    
    res.render('edit', { 
      post, 
      boardId, 
      tagOptions: tagOptions[boardId],
      user: req.session.user // 현재 로그인한 사용자 정보 전달
    });
  });
});

router.post('/:boardId/:postId', isLoggedIn, isAuthor, async (req, res) => {
  const { boardId, postId } = req.params;
  let { title, content, tag } = req.body;
  
  content = content.replace(/\n/g, '<br>');
  
  db.run(`UPDATE ${boardId}_posts SET title = ?, content = ?, tag = ? WHERE id = ?`, 
    [title, content, tag, postId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('서버 오류');
    }
    
    res.redirect(`/plantowner/community/${boardId}/${postId}`);
  });
});


module.exports = router;
