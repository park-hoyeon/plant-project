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


// 로그인 했는지 확인하는 미들웨어
function loggedin(req, res, next) {
    if (req.session.user) {
        next(); // 로그인된 사용자라면 계속 진행
    } else {
        res.send('먼저 로그인 해주세요.');
    }
}


//마이페이지
app.get('/mypage', loggedin, function(req, res){
    const user = req.session.user; //세션에서 사용자 정보 가져오기

    res.render('mypage.pug', { user });
});


app.get('/diary', loggedin, function(req, res) {
    const user = req.session.user;
    res.render('diary.pug', { user });
});


app.get('/write', loggedin, function(req, res){
    var title = req.query.title;
    var description = req.query.description;
    res.render('write.pug');
});



app.listen(3000, function(){
    console.log('server is running at 3000');
});
