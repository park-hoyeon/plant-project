const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    const token = req.cookies['USER'];  // USER 쿠키에서 토큰을 가져옴

    if (!token) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    try {
        const decoded = jwt.verify(token, 'YOUR_SECRET_KEY');  // 비밀키로 토큰 검증
        req.user = decoded;  // 디코딩된 사용자 정보 저장
        next();  // 다음 미들웨어로 넘어감
    } catch (err) {
        console.error(err);
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
};

module.exports = auth;

