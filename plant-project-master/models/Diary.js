const mongoose = require('mongoose');

const DiarySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, // 사용자의 ObjectId 참조
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Diary', DiarySchema);
