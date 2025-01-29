const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const writeRouter = require('./realwrite');
router.use('/', writeRouter);
const totalPosts = row.total;
const totalPages = Math.max(1, Math.ceil(totalPosts / limit));
console.log('Total posts:', totalPosts, 'Total pages:', totalPages);

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('./community.db', (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
    } else {
        console.log('데이터베이스에 연결되었습니다.');
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
            author TEXT NOT NULL,
            tag TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            likes INTEGER DEFAULT 0,
            views INTEGER DEFAULT 0
        )`);
        db.run("DELETE FROM sqlite_sequence WHERE name='free_posts'");

        // 식물토크 게시판 테이블
        db.run(`CREATE TABLE IF NOT EXISTS plant_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author TEXT NOT NULL,
            tag TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            likes INTEGER DEFAULT 0,
            views INTEGER DEFAULT 0
        )`);
        db.run("DELETE FROM sqlite_sequence WHERE name='plant_posts'");

        // 이벤트 게시판 테이블
        db.run(`CREATE TABLE IF NOT EXISTS event_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author TEXT NOT NULL,
            tag TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            likes INTEGER DEFAULT 0,
            views INTEGER DEFAULT 0
        )`);
        db.run("DELETE FROM sqlite_sequence WHERE name='event_posts'");
    });
}

// 게시판 이름
const boardNames = {
    'free': '자유게시판',
    'plant': '식물 토크',
    'event': '이벤트'
};

// 일단 보류. 아직 완성하지 않은 기능
const boardTags = {
    'free': ['전체', '잡담', '질문', '유머'],
    'plant': ['전체', '식물잡담', '식물 팁', '식물 공략', '내 식물 자랑'],
    'event': ['전체', '이벤트']
};


router.get("/:boardId", async (req, res) => {
    const boardId = req.params.boardId;
    const currentPage = parseInt(req.query.page) || 1;
    const searchQuery = req.query.query || "";
    const itemsPerPage = 10;
    const offset = (currentPage - 1) * itemsPerPage;

    try {
        // 전체 게시글 개수 조회
        const countQuery = `SELECT COUNT(*) AS total FROM ${boardId}_posts`;
        const totalCount = await new Promise((resolve, reject) => {
            db.get(countQuery, [], (err, row) => {
                if (err) reject(err);
                else resolve(row.total);
            });
        });

        // 게시글 목록 조회
        const query = `SELECT * FROM ${boardId}_posts ORDER BY id DESC LIMIT ? OFFSET ?`;
        db.all(query, [itemsPerPage, offset], (err, posts) => {
            if (err) {
                console.error("❌ DB 조회 오류:", err);
                return res.status(500).send("게시글을 불러오는 중 오류 발생");
            }

            const totalPages = Math.ceil(totalCount / itemsPerPage);

            res.render("community", {
                boardName: boardNames[boardId],
                boardId,
                posts,
                currentPage,
                totalPages,
                searchQuery
            });
        });
    } catch (err) {
        console.error("❌ 페이지네이션 오류:", err);
        res.status(500).send("페이지네이션 중 오류 발생");
    }
});

module.exports = router;