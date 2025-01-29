const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
app.use(express.static('public'));

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 세션 설정 (쿠키 대신 사용)
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60 // 1시간 동안 세션 유지
    }
}));

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./community.db');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

const USERS_JSON_FILENAME = 'users.json';

// 사용자 관련 함수들
async function fetchAllUsers() {
    try {
        const data = await fs.readFile(USERS_JSON_FILENAME);
        return JSON.parse(data.toString());
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(USERS_JSON_FILENAME, '[]');
            return [];
        }
        throw error;
    }
}

// 글 작성으로 이동
const realwriteRouter = require('./community/realwrite');
app.use('/plantowner/community', realwriteRouter);

//댓글 
const commentRouter = require('./community/comment');
app.use('/api/comments', commentRouter(db));


// 커뮤니티 글 상세 보기 루트
const postRouter = require('./community/postId');
app.use('/plantowner/community', postRouter);

async function fetchUser(ID) {
    const users = await fetchAllUsers();
    return users.find((user) => user.ID === ID);
}

async function fetchUserByEmail(email) {
    const users = await fetchAllUsers();
    return users.find(user => user.email === email);
}

async function createUser(newUser) {
    const users = await fetchAllUsers();
    users.push(newUser);
    await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
}

async function updateUserPassword(ID, newPassword) {
    const users = await fetchAllUsers();
    const index = users.findIndex(user => user.ID === ID);
    if (index !== -1) {
        users[index].password = newPassword;
        await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
    }
}

// 라우트 핸들러
app.get('/plantowner', (req, res) => {
    res.render('plantowner');
});

// 기본 커뮤니티방은 자유 게시판
app.get('/plantowner/community', (req, res) => {
    res.redirect('/plantowner/community/free');
});

// 특정 게시판 페이지
app.get('/plantowner/community/:boardId', (req, res) => {
    const boardId = req.params.boardId;
    let boardName;
    
    switch(boardId) {
        case 'free':
            boardName = '자유게시판';
            break;
        case 'plant':
            boardName = '식물 토크';
            break;
        case 'event':
            boardName = '이벤트';
            break;
        default:
            return res.status(404).send('게시판을 찾을 수 없습니다.');
        }
        
        res.render('community', { boardId, boardName, posts: [] });
    });

// 게시글 페이지네이션
app.get('/plantowner/community/:boardId/posts', (req, res) => {
    const boardId = req.params.boardId;
    const page = parseInt(req.query.page) || 1;
    
    res.render('community', { boardId, page, posts: [] });
});


// 마이페이지: 로그인이 안 되어있다면 로그인 창으로 바로 이동. 그 외에는 마이페이지로 이동.
app.get('/mypage', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.render('mypage.pug', { user: req.session.user });
});

app.post('/signup', async (req, res) => {
    const { ID, nickname, email, password, confirmPassword } = req.body;
    try {
        const exists = await fetchUser(ID);
        if (exists) {
            return res.json({ success: false, message: '이미 존재하는 ID입니다.' });
        }
        if (!ID || !nickname || !email || !password || !confirmPassword) {
            return res.json({ success: false, message: '모든 항목을 입력해주세요.' });
        }
        if (password !== confirmPassword) {
            return res.json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: '올바른 이메일 형식이 아닙니다.' });
        }
        const newUser = { ID, nickname, email, password, createdAt: new Date().toISOString() };
        await createUser(newUser);
        return res.json({ success: true, message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('회원가입 에러:', error);
        return res.status(500).json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
    }
});

app.get('/', (req, res) => {
    if (req.session.user) {
        res.status(200).send(`
            <h1>환영합니다 ${req.session.user.nickname}님!</h1>
            <div>
                <a href="/logout">로그아웃</a>
                <a href="/withdraw">회원탈퇴</a>
                <a href="/mypage">마이페이지</a>
            </div>
            <p>현재 로그인된 정보:</p>
            <p>아이디: ${req.session.user.ID}</p>
            <p>이름: ${req.session.user.nickname}</p>
        `);
    } else {
        res.status(200).send(`
            <h1>환영합니다!</h1>
            <div>
                <h2>로그인</h2>
                <form id="loginForm">
                    <div>
                        <label for="ID">ID</label><br>
                        <input type="text" id="ID" name="ID" placeholder="아이디 입력" required>
                    </div>
                    <div>
                        <label for="password">password</label><br>
                        <input type="password" id="password" name="password" placeholder="비밀번호 입력" required>
                    </div><br/>  
                    <button type="submit">로그인</button>
                    <div id="errorMessage" style="color: red; margin-top: 10px;"></div>
                </form>
            </div>
            <a href="/IDfind.html">아이디 찾기</a> <a href="/pwfind.html">비밀번호 찾기</a>
            <h6>계정이 없으신가요? <a href="/signup.html">회원가입</a> </h6>
            <script>
                document.getElementById('loginForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = {
                        ID: document.getElementById('ID').value,
                        password: document.getElementById('password').value
                    };
                    try {
                        const response = await fetch('/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(formData)
                        });
                        const data = await response.json();
                        if (!data.success) {
                            document.getElementById('errorMessage').textContent = data.message;
                        } else {
                            window.location.href = '/mypage';
                        }
                    } catch (error) {
                        document.getElementById('errorMessage').textContent = '로그인 처리 중 오류가 발생했습니다.';
                    }
                });
            </script>
        `);
    }
});

app.post('/login', async (req, res) => {
    const { ID, password } = req.body;
    try {
        const user = await fetchUser(ID);
        if (!user) {
            return res.json({ success: false, message: "존재하지 않는 아이디입니다." });
        }
        if (password !== user.password) {
            return res.json({ success: false, message: "비밀번호가 틀렸습니다." });
        }
        req.session.user = { ID: user.ID, nickname: user.nickname };
        res.json({ success: true, message: "로그인 성공" });
    } catch (error) {
        console.error('로그인 에러:', error);
        res.status(500).json({ success: false, message: "로그인 처리 중 오류가 발생했습니다." });
    }
});

app.post('/IDfind', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await fetchUserByEmail(email);
        if (user) {
            res.status(200).send(`아이디는 ${user.ID}입니다.`);
        } else {
            res.status(400).send('등록되지 않은 이메일입니다.');
        }
    } catch (error) {
        console.error('아이디 찾기 에러:', error);
        res.status(500).send('아이디 찾기 중 오류가 발생했습니다.');
    }
});

app.post('/pwfind', async (req, res) => {
    const { ID, email } = req.body;
    try {
        const user = await fetchUser(ID);
        if (!user || user.email !== email) {
            return res.status(400).send('아이디 또는 이메일이 일치하지 않습니다.');
        }
        res.status(200).send(`등록된 비밀번호는 ${user.password}입니다.`);
    } catch (error) {
        console.error('비밀번호 찾기 에러:', error);
        res.status(500).send('비밀번호 찾기 중 오류가 발생했습니다.');
    }
});

app.listen(3000, function(){
    console.log('server is running at 3000');
});