const express = require('express');
const router = express.Router();

router.get('/plantowner', (req, res) => res.render('homepage'));
router.get('/', (req, res) => res.redirect('login'));
router.get('/signup', (req, res) => res.redirect('signup'));
router.get('/mypage', (req, res) => res.redirect('mypage'));

router.get('/community', (req, res) => res.render('community'));
router.get('/plant-ai', (req, res) => res.render('plantAI'));
router.get('/shop', (req, res) => res.render('shop'));
router.get('/customer-service', (req, res) => res.render('customerService'));

module.exports = router;
