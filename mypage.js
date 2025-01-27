const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();

// 세션 설정 (다른 미들웨어보다 먼저 설정)
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 24시간 동안 세션 유지
    }
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

const USERS_JSON_FILENAME = 'users.json';

//users.json
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

// 로그인 확인 미들웨어
function loggedin(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/'); // 로그인 페이지로 리다이렉트
    }
}

//마이페이지
app.get('/mypage', loggedin, function(req, res){
    const user = req.session.user;
    res.render('mypage.pug', { user });
});

app.get('/diary', loggedin, function(req, res) {
    const user = req.session.user;
    res.render('diary.pug', { user });
});

app.get('/write', loggedin, function(req, res){
    res.render('write.pug');
});

app.listen(3000, function(){
    console.log('server is running at 3000');
});
