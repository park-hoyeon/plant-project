const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    console.log('User in session:', req.session.user); 
    res.render('plantowner', { user: req.session.user });
});

module.exports = router;
