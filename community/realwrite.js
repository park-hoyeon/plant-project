const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('./community.db', (err) => {
    if (err) {
        console.error('SQLite 연결 오류:', err.message);
    } else {
        console.log('SQLite 데이터베이스에 연결되었습니다.');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // 자유게시판 테이블
        db.run(`CREATE TABLE IF NOT EXISTS free_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tag TEXT NOT NULL,
            author TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run("DELETE FROM sqlite_sequence WHERE name='free_posts'");

        // 식물토크 게시판 테이블
        db.run(`CREATE TABLE IF NOT EXISTS plant_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tag TEXT NOT NULL,
            author TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run("DELETE FROM sqlite_sequence WHERE name='plant_posts'");

        // 이벤트 게시판 테이블
        db.run(`CREATE TABLE IF NOT EXISTS event_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tag TEXT NOT NULL,
            author TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run("DELETE FROM sqlite_sequence WHERE name='event_posts'");
    });
}

const boardNames = {
    'free': '자유게시판',
    'plant': '식물 토크',
    'event': '이벤트'
};

const boardTags = {
    'free': ['잡담', '질문', '유머'],
    'plant': ['식물 잡담', '식물 팁', '식물 공략', '내 식물 자랑'],
    'event': ['이벤트']
};

// 로그인 확인 미들웨어
const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/?redirect=' + encodeURIComponent(req.originalUrl));
    }
};

// 게시판 별 게시글 목록 조회
router.get('/:boardId', (req, res) => {
    const { boardId } = req.params;
    const tableName = `${boardId}_posts`;
    const sql = `SELECT * FROM ${tableName} ORDER BY createdAt DESC`;
    
    console.log('실행될 SQL 쿼리:', sql);

    db.all(sql, [], (err, posts) => {
        if (err) {
            console.error('게시글 목록 조회 오류:', err.message);
            return res.status(500).send('서버 오류가 발생했습니다: ' + err.message);
        }
        
        console.log('조회된 게시글:', posts);
        
        res.render('community', {
            boardId,
            boardName: boardNames[boardId],
            posts,
            user: req.session.user
        });
    });
});

// 글 작성 페이지 렌더링 (로그인 필요)
router.get('/:boardId/write', isLoggedIn, (req, res) => {
    const { boardId } = req.params;
    if (!boardNames[boardId]) {
        return res.status(404).send('유효하지 않은 게시판입니다.');
    }
    res.render('realwrite', { 
        boardId, 
        boardName: boardNames[boardId],
        tags: boardTags[boardId],
        user: req.session.user
    });
});


// 글 작성 처리 (로그인 필요)
router.post('/:boardId/post', isLoggedIn, (req, res) => {
    const { boardId } = req.params;
    let { title, content, tag } = req.body;

    if (!boardTags[boardId].includes(tag)) {
        return res.status(400).send('유효하지 않은 태그입니다.');
    }

    // 줄바꿈을 <br> 태그로 변환
    content = content.replace(/\r\n|\r|\n/g, '<br>');

    const author = req.session.user.nickname;
    const tableName = `${boardId}_posts`;

    const sql = `INSERT INTO ${tableName} (title, content, tag, author) VALUES (?, ?, ?, ?)`;
    db.run(sql, [title, content, tag, author], function(err) {
        if (err) {
            console.error('게시글 저장 오류:', err.message);
            return res.status(500).send(`게시글 저장 중 오류가 발생했습니다: ${err.message}`);
        }
        console.log('저장된 게시글 ID:', this.lastID);
        res.redirect(`/plantowner/community/${boardId}`);
    });
});



// 임시저장 목록 페이지 렌더링 (로그인 필요)
router.get('/drafts', isLoggedIn, (req, res) => {
    res.render('draft-list', { user: req.session.user });
});

module.exports = router;