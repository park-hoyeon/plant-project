//모든 모델을 한 곳에서 불러오도록 설정
const User = require('./user');
const Post = require('./post');
const Comment = require('./comment');

module.exports = { User, Post, Comment };
