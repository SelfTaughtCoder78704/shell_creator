const express = require('express');
const router = express.Router();
const User = require('../models/user-model');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { user: req.user });
});





module.exports = router;