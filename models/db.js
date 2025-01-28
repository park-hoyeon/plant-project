// db.js
const sqlite3 = require('sqlite3').verbose();

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


module.exports = db;
