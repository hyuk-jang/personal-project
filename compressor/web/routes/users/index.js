const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const control = require('./control');

const commonUtil = require('../../models/templates/common.util');

// const domMakerMaster = require('../../models/domMaker/masterDom');

const DEFAULT_SITE_ID = 'all';

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'days';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';

// server middleware
router.get(
  [
    '/',
    '/:naviMenu',
    '/:naviMenu/:siteId',
    '/:naviMenu/:siteId/:subCategory',
    '/:naviMenu/:siteId/:subCategory/:subCategoryId',
    '/:naviMenu/:siteId/:subCategory/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    commonUtil.applyHasNumbericReqToNumber(req);

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    req.locals = {};

    // BU.CLI(req.params);
    /** @type {MEMBER} */
    const user = _.get(req, 'user', {});

    // 선택한 SiteId와 인버터 Id를 정의
    const {
      naviMenu = 'main',
      siteId = user.main_seq,
      subCategory,
      subCategoryId,
    } = req.params;

    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

    /** @type {MAIN[]} */
    const mainRows = await biModule.getTable('main', { is_deleted: 0 });

    _.set(req, 'locals.mainInfo.mainWhere', mainWhere);

    // BU.CLI(req.locals.siteId);
    next();
  }),
);

// Router 추가
router.use('/control', control);

module.exports = router;
