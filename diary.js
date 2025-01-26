const express = require('express');
const app = express();
const auth = require('./middleware/auth');
const Diary = require('./models/Diary');
const User = require('./models/User');

// 미들웨어 설정
app.use(express.json());


//마이페이지 정보 조회
app.get('/mypage', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // 비밀번호 제외하고 반환하기
        const diaryCount = await Diary.countDocuments({ user: req.user.id }); //Diary 개수 반환
        
        res.json({
            user: {
                level: user.level,
                point: user.point,
                nickname: user.nickname
            },
            diaryCount
        });
    } catch (err) {
        console.log('마이페이지 조회 에러:', err);
        res.status(500).send('Server Error');
    }
});






// 내가 쓴 글 목록 조회하기


app.listen(3000, function(){
    console.log('server is running at 3000');
});