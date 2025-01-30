//로그인, 회원가입 라우트

const express = require('express');
const { fetchUser, fetchUserByEmail, createUser } = require('../utils/fileUtils');
const router = express.Router();

router.post('/signup', async (req, res) => {
    const { ID, nickname, email, password, confirmPassword } = req.body;

    try {
        const exists = await fetchUser(ID);
        if (exists) {
            return res.json({ success: false, message: '이미 존재하는 ID입니다.' });
        }
        if (password !== confirmPassword) {
            return res.json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
        }
        const newUser = { ID, nickname, email, password, createdAt: new Date().toISOString() };
        await createUser(newUser);
        return res.json({ success: true, message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('회원가입 에러:', error);
        return res.status(500).json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
    }
});

router.post('/login', async (req, res) => {
    const { ID, password } = req.body;
    try {
        const user = await fetchUser(ID);
        if (!user) return res.json({ success: false, message: '존재하지 않는 아이디입니다.' });
        if (password !== user.password) return res.json({ success: false, message: '비밀번호가 틀렸습니다.' });

        req.session.user = { ID: user.ID, nickname: user.nickname };
        res.json({ success: true, message: '로그인 성공' });
    } catch (error) {
        console.error('로그인 에러:', error);
        res.status(500).json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
