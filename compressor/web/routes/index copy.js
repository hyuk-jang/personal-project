const _ = require('lodash');
const express = require('express');
// const asyncHandler = require('express-async-handler');

const { BU } = require('base-util-jh');

const map = require('../public/js/map/compressor.map');

const router = express.Router();

router.use((req, res, next) => {
  BU.error('?????????');
  next();
  // res.redirect('/');
});

router.get('/', (req, res) => {
  _.set(req, 'locals.map', map);

  res.render('./control/command', req.locals);
});

module.exports = router;
