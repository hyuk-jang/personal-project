const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU, DU } = require('base-util-jh');

const users = require('./users');

const accountGradeList = ['admin', 'manager', 'owner', 'guest', 'awaiter'];
const AWAITER = 'awaiter';

let selectedRouter;
switch (process.env.PJ_MAIN_ID) {
  case 'FP':
    selectedRouter = users;
    break;
  default:
    selectedRouter = users;
    break;
}

// server middleware
let isRequestAuth = 0;

router.use((req, res, next) => {
  // BU.CLI('Main Middile Ware', req.user);
  const excludePathList = ['/favicon'];

  const isExclude = _.some(excludePathList, excludePath =>
    _.includes(req.path, excludePath),
  );

  if (isExclude) {
    return false;
  }

  if (!req.user && isRequestAuth === 0) {
    // BU.CLI('웹 자동 로그인');
    isRequestAuth = 1;
    return res.redirect('/auth/login');
  }

  next();
});

router.get('/intersection', (req, res) => {
  const grade = _.get(req, 'user.grade');

  // 사용자 권한 체크
  if (process.env.IS_CHECK_USER_GRADE !== '0') {
    // 승인 대기 시
    if (grade === AWAITER) {
      return res.send(
        DU.locationAlertBack('관리자의 승인을 기다리고 있습니다.', '/login'),
      );
    }
    // 설정 외 권한 발생 시
    if (!_.includes(accountGradeList, grade)) {
      return res.send(
        DU.locationAlertBack(
          '사용자 권한에 문제가 발생하였습니다. 관리자에게 연락하시기 바랍니다.',
          '/login',
        ),
      );
    }
  }

  switch (grade) {
    // case 'admin':
    //   router.use('/admin', admin);
    //   res.redirect('/admin');
    //   break;
    default:
      router.use('/', selectedRouter);
      // BU.CLI('intersection', process.env.DEV_PAGE);
      _.isString(process.env.DEV_PAGE)
        ? res.redirect(`/${process.env.DEV_PAGE}`)
        : res.redirect('/');
      break;
  }
});

module.exports = router;
