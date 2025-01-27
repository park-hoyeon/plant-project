const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// MongoDB 연결
mongoose.connect('mongodb://localhost/plantowner');

// 게시글 스키마 정의
const postSchema = new mongoose.Schema({
    boardId: String,
    title: String,
    content: String,
    author: String,
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    comments: [{
        author: String,
        content: String,
        createdAt: { type: Date, default: Date.now }
    }]
});

const Post = mongoose.model('Post', postSchema);

// 게시판 이름 매핑
const boardNames = {
    'free': '자유게시판',
    'plant': '식물 토크',
    'event': '이벤트'
};

// 게시판 별 게시글 조회 (및 검색 결과 조회)
router.get('/:boardId', async (req, res) => {
    const boardId = req.params.boardId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // 페이지당 게시글 수
    const { query } = req.query;

    try {
        let searchQuery = { boardId };
        if (query && query.length >= 2) {
            searchQuery.$or = [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } }
            ];
        }

        const totalPosts = await Post.countDocuments(searchQuery);
        const totalPages = Math.max(1, Math.ceil(totalPosts / limit)); // 최소 1페이지 보장

        const posts = await Post.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('community', {
            boardId,
            boardName: boardNames[boardId],
            posts,
            currentPage: page,
            totalPages,
            searchQuery: query
        });
    } catch (error) {
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});


// 게시글 상세 조회
router.get('/:boardId/:postId', async (req, res) => {
    const { boardId, postId } = req.params;
    
    try {
        const post = await Post.findById(postId);
        if (!post || post.boardId !== boardId) {
            return res.status(404).send('게시글을 찾을 수 없습니다.');
        }
        
        res.render('post', { post, boardName: boardNames[boardId] });
    } catch (error) {
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});

// 새 게시글 작성 페이지
router.get('/:boardId/write', (req, res) => {
    const { boardId } = req.params;
    res.render('write', { boardId, boardName: boardNames[boardId] });
});

// 새 게시글 작성 처리
router.post('/post', async (req, res) => {
    const { boardId, title, content } = req.body;
    const newPost = new Post({
        boardId,
        title,
        content,
        author: req.session.user.nickname // 세션에서 사용자 정보 가져오기
    });
    
    try {
        const savedPost = await newPost.save();
        res.redirect(`/plantowner/community/${boardId}/${savedPost._id}`);
    } catch (error) {
        res.status(500).send('게시글 저장 중 오류가 발생했습니다.');
    }
});

// 게시글 수정 페이지
router.get('/:boardId/:postId/edit', async (req, res) => {
    const { boardId, postId } = req.params;
    
    try {
        const post = await Post.findById(postId);
        if (!post || post.boardId !== boardId) {
            return res.status(404).send('게시글을 찾을 수 없습니다.');
        }
        
        res.render('edit', { post, boardName: boardNames[boardId] });
    } catch (error) {
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});

// 게시글 수정 처리
router.put('/post/:postId', async (req, res) => {
    const { postId } = req.params;
    const { title, content } = req.body;
    
    try {
        const updatedPost = await Post.findByIdAndUpdate(postId, { title, content }, { new: true });
        if (!updatedPost) {
            return res.status(404).send('게시글을 찾을 수 없습니다.');
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).send('게시글 수정 중 오류가 발생했습니다.');
    }
});

// 게시글 삭제
router.delete('/post/:postId', async (req, res) => {
    const { postId } = req.params;
    
    try {
        const deletedPost = await Post.findByIdAndDelete(postId);
        if (!deletedPost) {
            return res.status(404).send('게시글을 찾을 수 없습니다.');
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).send('게시글 삭제 중 오류가 발생했습니다.');
    }
});

// 게시글 검색 (특정 게시판 내에서만 가능: 이건 보수해야 함)
router.get('/:boardId/search', async (req, res) => {
    const { boardId } = req.params;
    const { query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // 페이지당 게시글 수
    
    if (!query || query.length < 2) {
        return res.status(400).send('검색어는 2글자 이상 입력해주세요.');
    }

    try {
        const searchQuery = {
            boardId,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } }
            ]
        };

        const totalPosts = await Post.countDocuments(searchQuery);
        const posts = await Post.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('community', {
            boardId,
            boardName: boardNames[boardId],
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            searchQuery: query
        });
    } catch (error) {
        console.error('검색 오류:', error);
        res.status(500).send('검색 중 오류가 발생했습니다.');
    }
});
