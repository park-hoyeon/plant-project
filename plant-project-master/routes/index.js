//모든 라우트 파일을 불러오는 곳

const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/posts', require('./posts'));

module.exports = router;
