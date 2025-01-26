const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;
const session = require('express-session');
var bodyParser = require('body-parser')

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));


// 사용자 정보를 저장할 데이터베이스
const db = new Map();
// KEY=VALUE 형태로 브라우저에 저장되는 쿠키의 KEY
const USER_COOKIE_KEY = 'USER';
const USERS_JSON_FILENAME = 'users.json';

// 위에서 작성한 html을 클라이언트에 제공하기 위한 미들웨어
app.use(express.static(path.join(__dirname, 'public')));
// 쿠키를 파싱하기 위한 미들웨어
app.use(cookieParser());
// x-www-form-urlencoded 타입의 form 데이터를 파싱하기 위한 미들웨어
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 세션 설정
app.use(session({
    secret: 'your_secret_key',  // 비밀 키
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // 로컬 환경에서는 secure를 false로 설정
}));


//users.json
async function fetchAllUsers() {
    try {
        const data = await fs.readFile(USERS_JSON_FILENAME);
        return JSON.parse(data.toString());
    } catch (error) {
        // 파일이 없는 경우 빈 배열 반환
        if (error.code === 'ENOENT') {
            await fs.writeFile(USERS_JSON_FILENAME, '[]');
            return [];
        }
        throw error;
    }
}

async function fetchUser(ID) {
    const users = await fetchAllUsers();
    const user = users.find((user) => user.ID === ID);
    return user;
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



app.post('/signup', async (req, res) => {
    const { ID, nickname,  email, password, confirmPassword } = req.body;
    try {
        const exists = await fetchUser(ID);

        if (exists) {
            // 이미 존재하는 ID에 대한 오류 메시지를 400 상태 코드로 전송
            return res.json({
                success: false,
                message: `이미 존재하는 ID입니다.`
            });
        }

        if (!ID || !nickname || !email || !password || !confirmPassword) {
            return res.json({
                success: false,
                message: '모든 항목을 입력해주세요.'
            });
        }

        if (password !== confirmPassword) {
            return res.json({
                success: false,
                message: '비밀번호가 일치하지 않습니다.'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: '올바른 이메일 형식이 아닙니다.'
            });
        }

        const newUser = {
            ID,
            nickname,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        await createUser(newUser);

        return res.json({
            success: true,
            message: '회원가입이 완료되었습니다.'
        });
    } catch (error) {
        console.error('회원가입 에러:', error);
        return res.status(500).json({
            success: false,
            message: '회원가입 처리 중 오류가 발생했습니다.'
        });
    }
});
    


app.get('/', (req, res) => {
    // 'user'라는 쿠키 데이터를 가져옴
    // 쿠키가 존재하지 않을 경우 로그인이 되지 않았다는 뜻
    const user = req.cookies[USER_COOKIE_KEY];
    
    if (user) {
        // 쿠키가 존재하는 경우, 쿠키 VALUE를 JS 객체로 변환
        const userData = JSON.parse(user);
        // user 객체에 저장된 username이 db에 존재하는 경우,
        // 유효한 user이며 로그인이 잘 되어 있다는 뜻.
        if (db.get(userData.ID)) {
            // JS 객체로 변환된 user 데이터에서 username, name, password를 추출하여 클라이언트에 렌더링
            res.status(200).send(`
                <h1>환영합니다 ${userData.nickname}님!</h1>
                <div>
                    <a href="/logout">로그아웃</a>
                    <a href="/withdraw">회원탈퇴</a>
                    <a href="/mypage">마이페이지</a>
                </div>
                <p>현재 로그인된 정보:</p>
                <p>아이디: ${userData.ID}</p>
                <p>이름: ${userData.nickname}</p>
            `);
            return;
        }
    }


    // 쿠키가 존재하지 않는 경우, 로그인 되지 않은 것으로 간주
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
                e.preventDefault(); // 폼 기본 제출 동작 방지
                
                const formData = {
                    ID: document.getElementById('ID').value,
                    password: document.getElementById('password').value
                };

                try {
                    const response = await fetch('/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });

                    const data = await response.json();
                    
                    if (!data.success) {
                        // 에러 메시지 표시
                        document.getElementById('errorMessage').textContent = data.message;
                    } else {
                        // 로그인 성공 시 페이지 새로고침
                        window.location.reload();
                    }
                } catch (error) {
                    document.getElementById('errorMessage').textContent = '로그인 처리 중 오류가 발생했습니다.';
                }
            });
        </script>
    `);
});




//로그인 기능!!!
app.post('/login', async (req, res) => {
    const { ID, password } = req.body;
    try {
        const user = await fetchUser(ID);

        if (!user) {
            return res.json({
                success: false,
                message: "존재하지 않는 아이디입니다."
            });
        }

        if (password !== user.password) {
            return res.json({
                success: false,
                message: "비밀번호가 틀렸습니다."
            });
        }

        req.session.user = {
            ID: user.ID,
            nickname: user.nickname
        };

        res.json({
            success: true,
            message: "로그인 성공"
        });
    } catch (error) {
        console.error('로그인 에러:', error);
        res.status(500).json({
            success: false,
            message: "로그인 처리 중 오류가 발생했습니다."
        });
    }
});

//아이디 찾기
app.post('/IDfind', async (req, res) => {
    const{ email } = req.body;
    try{
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


// 비밀번호 찾기
app.post('/pwfind', async (req, res) => {
    const { ID, email } = req.body; // 사용자 입력 받기
    try {
        const user = await fetchUser(ID); // ID로 사용자 찾기
        
        // 사용자 존재 여부 및 이메일 확인
        if (!user || user.email !== email) {
            return res.status(400).send('아이디 또는 이메일이 일치하지 않습니다.');
        }
        
        // 비밀번호를 사용자에게 출력
        res.status(200).send(`등록된 비밀번호는 ${user.password}입니다.`);
    } catch (error) {
        console.error('비밀번호 찾기 에러:', error);
        res.status(500).send('비밀번호 찾기 중 오류가 발생했습니다.');
    }
});







app.listen(3000, function(){
    console.log('server is running at 3000');
});
