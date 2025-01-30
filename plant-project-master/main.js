const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

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

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//데이터 베이스 연결
mongoose.connect('mongodb://127.0.0.1:27017/writing_database', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // 내가 쓴 글
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }], // 내가 쓴 댓글
    scraps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }] // 스크랩한 글
});

const User = mongoose.model('User', userSchema);

module.exports = User;


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
    
        // 여기서 해당 게시판의 게시글 목록을 가져오는 로직을 구현해야 합니다.
        // 예: const posts = getPosts(boardId);
        
        res.render('community', { boardId, boardName, posts: [] });
    });

// 게시글 페이지네이션
app.get('/plantowner/community/:boardId/posts', (req, res) => {
    const boardId = req.params.boardId;
    const page = parseInt(req.query.page) || 1;
    
    // 여기서 페이지네이션된 게시글 목록을 가져오는 로직을 구현해야 합니다.
    // 예: const posts = getPagedPosts(boardId, page);
    
    res.render('community', { boardId, page, posts: [] });
});




const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  });
  
  const commentSchema = new mongoose.Schema({
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    createdAt: { type: Date, default: Date.now }
  });
  
  const Post = mongoose.model('Post', postSchema);
  const Comment = mongoose.model('Comment', commentSchema);
  
  module.exports = { Post, Comment };



  


// 마이페이지: 로그인이 안 되어있다면 로그인 창으로 바로 이동. 그 외에는 마이페이지로 이동.


app.get('/mypage', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  try {
    // 세션에 저장된 사용자 ID로 데이터 조회
    const user = await User.findById(req.session.user._id)
      .populate('posts') // 내가 쓴 글
      .populate('comments') // 내가 쓴 댓글
      .populate('scraps'); // 스크랩한 글

    if (!user) {
      return res.status(404).send('사용자를 찾을 수 없습니다.');
    }

    res.render('mypage.pug', {
      user: {
        nickname: user.username
      },
      posts: user.posts,
      comments: user.comments,
      scraps: user.scraps
    });
  } catch (error) {
    console.error('마이페이지 로드 에러:', error);
    res.status(500).send('서버 에러');
  }
});


//출석 기록을 위한 스키마
const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },

    type: {
        type: String,
        enum: ['solved', 'attempted'],
        default: 'solved'
    }
});

//같은 사용자가 같은 날짜에 중복 체크되지 않도록.
attendanceSchema.index({ user:1, date:1}, {unique: true});

const Attendance = mongoose.model('Attendance', attendanceSchema);



app.get('/attendance', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    try {
        const attendance = new Attendance({
            user: req.session.user._id,
            date: new Date(),
            type: req.body.type || 'solved'
        });

        await attendance.save();
        res.status(201).json({ success: true, message: '출석이 기록되었습니다.' });
    } catch (error) {
        if (error.code === 11000) { // 중복 키 에러
            return res.status(400).json({ success: false, message: '이미 오늘 출석했습니다.' });
        }
        console.error('출석체크 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});

// 특정 기간의 출석 기록 조회 API
app.get('/attendance-detail', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    try {
        const { startDate, endDate } = req.query;
        const query = {
            user: req.session.user._id
        };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const attendances = await Attendance.find(query)
            .sort({ date: 1 })
            .select('date type -_id');
        
            // 조회된 결과 반환
        res.json({ success: true, data: attendances });
    } catch (error) {
        console.error('출석 조회 에러:', error);
        res.status(500).json({ success: false, message: '서버 에러' });
    }
});
 
// 글 추가 API
app.get('/posts', async (req, res) => {
    if (!req.session.user) {
      return res.status(401).send('로그인이 필요합니다.');
    }
  
    try {
      const user = await User.findById(req.session.user._id);
  
      if (!user) {
        return res.status(404).send('사용자를 찾을 수 없습니다.');
      }
  
      const { title, content } = req.body;
  
      // 새로운 글 생성
      const post = new Post({
        title,
        content,
        author: user._id
      });
  
      await post.save();
  
      // 사용자의 posts 배열에 글 추가
      user.posts.push(post);
      await user.save();
  
      res.status(201).json({ success: true, message: '글이 추가되었습니다.', post });
    } catch (error) {
      console.error('글 추가 에러:', error);
      res.status(500).send('서버 에러');
    }
  });



// 댓글 추가 API
app.post('/comments', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('로그인이 필요합니다.');
  }

  try {
    const user = await User.findById(req.session.user._id);

    if (!user) {
      return res.status(404).send('사용자를 찾을 수 없습니다.');
    }

    const { postId, content } = req.body;

    // 댓글이 달릴 글 확인
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).send('게시글을 찾을 수 없습니다.');
    }

    // 새로운 댓글 생성
    const comment = new Comment({
      content,
      author: user._id,
      post: post._id
    });

    await comment.save();

    // 사용자의 comments 배열에 댓글 추가
    user.comments.push(comment);
    await user.save();

    res.status(201).json({ success: true, message: '댓글이 추가되었습니다.', comment });
  } catch (error) {
    console.error('댓글 추가 에러:', error);
    res.status(500).send('서버 에러');
  }
});






app.post('/signup', async (req, res) => {
    const { ID, nickname, email, password, confirmPassword } = req.body;
    try {
        const exists = await User.findOne({ username: ID });
        if (exists) {
            return res.json({ success: false, message: '이미 존재하는 ID입니다.' });
        }

        if (password !== confirmPassword) {
            return res.json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
        }

        const newUser = new User({
            username: ID,
            password: password,
            email: email
        });

        await newUser.save();
        return res.json({ success: true, message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('회원가입 에러:', error);
        return res.status(500).json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
    }
});

app.get('/', (req, res) => {
    if (req.session.user) {
        res.status(200).send(`
            <h1>환영합니다 ${req.session.user.username}님!</h1>
            <div>
                <a href="/logout">로그아웃</a>
                <a href="/withdraw">회원탈퇴</a>
                <a href="/mypage">마이페이지</a>
            </div>
            <p>현재 로그인된 정보:</p>
            <p>아이디: ${req.session.user.username}</p>
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
        const user = await User.findOne({ username: ID });
        if (!user) {
            return res.json({ success: false, message: "존재하지 않는 아이디입니다." });
        }
        if (password !== user.password) {
            return res.json({ success: false, message: "비밀번호가 틀렸습니다." });
        }
        req.session.user = {
            _id: user._id,
            username: user.username
        };
        res.json({ success: true, message: "로그인 성공" });
    } catch (error) {
        console.error('로그인 에러:', error);
        res.status(500).json({ success: false, message: "로그인 처리 중 오류가 발생했습니다." });
    }
});

app.post('/IDfind', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email });
        if (user) {
            res.status(200).send(`아이디는 ${user.username}입니다.`);
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
        const user = await User.findOne({ username: ID, email: email });
        if (!user) {
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
