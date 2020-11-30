const _ = require('lodash');

const Promise = require('bluebird');
const puppeteer = require('puppeteer');
const cron = require('cron');

const { BU } = require('base-util-jh');

const url = 'https://imfreeterpartner.com';

module.exports = class {
  /**
   *
   * @param {config} config
   */
  constructor(config) {
    const {
      isAutoStart = 1,
      startWatchTime = '',
      userList = [],
      headless = 1,
      moviePath = '',
    } = config;

    // 설정 값 불러와서 정의
    this.isAutoStart = isAutoStart;
    this.startWatchTime = startWatchTime;
    this.userList = userList;
    this.headless = headless === 1;
    this.moviePath = moviePath;

    // 스케줄러 정의
    this.watchMovieScheduler = null;
    this.resetWatchMovieScheduler = null;

    this.userIndex = 0;

    /** @type {import('puppeteer').Browser} */
    this.browser;
    /** @type {import('puppeteer').Page} */
    this.page;
  }

  get user() {
    return this.userList[this.userIndex];
  }

  /**
   * @description Main
   * 프로그램 초기화 및 설정
   */
  init() {
    // 영상 정보 초기화
    this.resetWatchInfo();
    // 스케줄러 등록
    this.setScheduler();

    // isAutoStart 여부에 따라 실행
    if (this.isAutoStart) {
      this.startWatchWorker();
    }
  }

  /**
   * @description Main
   * 영상 뷰 알고리즘 진입점
   */
  async startWatchWorker() {
    // Exist Launcher
    if (this.browser !== undefined) {
      return false;
    }
    // Create Launcher
    this.browser = await puppeteer.launch({
      executablePath: './chromium/chrome.exe',
      headless: this.headless,
      defaultViewport: {
        width: 2000,
        height: 1024,
      },
      // devtools: true,
    });
    // 페이지 생성
    this.page = await this.browser.newPage();

    console.log('complete createPage');

    this.changeUser(false);
  }

  /**
   * @description Main
   * @param {boolean=} isNext userIndex 증가 여부
   * 사용자 변경 및 로그인
   */
  async changeUser(isNext = true) {
    if (isNext) {
      this.userIndex += 1;
    }
    // Get User
    const userInfo = this.user;
    // BU.CLI(userInfo);

    // Exist User
    if (userInfo === undefined) {
      console.log('모든 사용자 Watch 종료');
      BU.logFile('모든 사용자 Watch 종료');
      // Close Launcher
      await this.browser.close();

      this.browser = undefined;
      this.page = undefined;

      // Reset Config
      this.userIndex = 0;
    } else {
      await this.login();

      // Login
      await this.checkLoginUrl();

      this.checkWatchTime();
    }
  }

  /**
   * @description Main
   * 영상 시청 시간 체크
   */
  async checkWatchTime() {
    console.log('checkWatchTime');
    // 홈으로 이동
    await this.page.goto(url);

    // 로그인 버그 처리
    await this.checkLoginUrl();

    // 현재 본 시간 영역 추출 및 정제
    /** @type {string} '00시간 00분 00초 시청' or '달성' */
    const watchTime = await this.page.evaluate(
      () => document.querySelector('.info-title').innerText,
    );

    // 영상 시청 완료
    if (_.trim(watchTime) === '달성') {
      console.log('영상 시청 완료', this.user.id);
      BU.logFile(`=======   ${this.user.id} Watch 종료`);
      this.resetWatchInfo();

      // Logout
      await this.logout();

      // 사용자의 오늘 영상 시청을 마무리 하였을 경우
      return this.changeUser(true);
    }

    // 정규식을 이용하여 문자 제거
    const strWatchTime = watchTime.replace(/(?!\w)./g, '');

    if (strWatchTime.length === 6) {
      const hour = Number(strWatchTime.slice(0, 2));
      const min = Number(strWatchTime.slice(2, 4));
      const sec = Number(strWatchTime.slice(4, 6));

      // 본 시간 업데이트
      this.watchMovieInfo.viewMin = _.round(hour * 60 + min + sec / 60, 1);
      console.log('**************     시청 시간(분)', this.watchMovieInfo.viewMin);
    }

    return this.playWatch();
  }

  /**
   * @description Main
   * 영상 재생
   */
  async playWatch() {
    console.log('playWatch');
    // 다음에 볼 영상 주소 추출
    // await this.getNextMoviePath();
    // 우회하여 재생
    return this.playBypassWatch();
  }

  /**
   * @description Main
   * 다음에 볼 영상 Pathname 추출
   */
  async getNextMoviePath() {
    console.log('getNextMoviePath');
    // 영상 홈으로 이동
    await this.page.goto('http://imfreeterpartner.com/kr/videoplays');
    // 로그인 버그 처리
    await this.checkLoginUrl();

    // video pathname 추출
    const pathname = await this.page.evaluate(() =>
      document.querySelector('a.btn-hover[tabindex="0"]').getAttribute('href'),
    );

    // Fail Load pathname
    if (pathname.includes('/kr/video') === false) {
      return this.getNextMoviePath();
    }

    // 볼 영상경로 업데이트
    this.watchMovieInfo.moviePathname = pathname;
  }

  /**
   * @description Main
   * 영상 우회하여 실행
   */
  async playBypassWatch() {
    // 홈으로 이동하여야만 실행이됨.. 개같은 것
    await this.page.goto(url);
    // 로그인 버그 처리
    await this.checkLoginUrl();

    await this.page.goto(`${url}${this.watchMovieInfo.moviePathname}`);
    // 로그인 버그 처리
    await this.checkLoginUrl();

    // Youtube iframe 추출
    const videoEle = await this.page.$('iframe');
    // Loading Fail ?
    if (videoEle === null) {
      console.error('playBypassMovie Bug');
      return this.playBypassWatch();
    }

    // Do Play Movie(Youtube API)
    await this.page.evaluateHandle(() => player.playVideo());

    return this.checkWatchStatus();
  }

  /**
   * @description Main
   * 영상 재생 체크
   */
  async checkWatchStatus() {
    // 광고 진행 여부 확인(자체적으로 5초 대기를 가짐)
    const existAd = await this.checkWatchAd();

    // 광고가 있었다면 재귀
    if (existAd) {
      return this.checkMovieStaus();
    }

    const { durationMin, viewMin } = this.watchMovieInfo;

    // 영상 총 시간
    const maxRunningSec = await this.page.evaluate(() => player.getDuration());
    // 현재 본 시간(초)
    const nowRunningSec = await this.page.evaluate(() => player.getCurrentTime());
    // 현재 본 시간(분)
    const nowRunningMin = nowRunningSec / 60;

    const nowWatchViewMin = nowRunningMin + viewMin;

    // 현재 본 시간 달성률
    // const progressCurrWatchPer = Math.round((nowRunningSec / maxRunningSec) * 100);
    // 목표 시간 달성률
    const progressGoalWatchPer = _.round((nowWatchViewMin / durationMin) * 100, 1);

    console.log(
      `${this.user.id} >> 현재 영상: ${_.round(nowRunningSec)} / ${_.round(
        maxRunningSec,
      )}초`,
      `===> 남은 시간(분): ${_.round(durationMin - nowWatchViewMin, 1)}`,
    );

    // 현재 영상을 다 봤을 경우
    if (nowRunningSec >= maxRunningSec) {
      // 영상 시간 업데이트, checkWatch에서 영상 시간 정보가 있다면 갱신됨
      this.watchMovieInfo.viewMin += nowWatchViewMin;

      // 무한 반복
      await this.page.evaluate(() => player.playVideo());

      // 3 초 대기 후 재확인
      await Promise.delay(1000 * 3);

      return this.checkWatchStatus();
    }

    // 영상 재생 중 달성 목표보다 5%(10분) 더 봤을 경우
    if (progressGoalWatchPer > 105) {
      // 영상 시간 업데이트, checkWatch에서 영상 시간 정보가 있다면 갱신됨
      this.watchMovieInfo.viewMin += nowWatchViewMin;
      return this.evaluateStar();
    }
    // 5초 대기 후 재확인
    await Promise.delay(1000 * 3);
    // 재귀 체크
    this.checkWatchStatus();
  }

  /**
   * @description Main
   * 영상 재생 체크
   * @return {boolean} 광고가 없었다면 false, 있다면 true
   */
  async checkWatchAd() {
    const adAreaSelector = '.ytp-ad-player-overlay';
    const adSkipBtnSelector = '.ytp-ad-skip-button';
    // 광고 영역
    const adArea = await this.page.$(adAreaSelector);

    // 광고 영역이 없는지 확인
    if (adArea === null) {
      return false;
    }

    // 광고 버튼이 활성화 되어 있는지 확인
    const skipBtn = await this.page.$(adSkipBtnSelector);

    // Wait 5 Sec
    await this.page.waitForTimeout(1000 * 3);

    if (skipBtn !== null) {
      await skipBtn.click();
    }

    return true;
  }

  /**
   * @description Main
   * Evaluate Star
   */
  async evaluateStar() {
    // 별점 주기
    const listHandle = await this.page.evaluateHandle(
      () => document.getElementById('stars').children,
    );
    const properties = await listHandle.getProperties();
    const children = [];

    for (const property of properties.values()) {
      const element = property.asElement();
      if (element) children.push(element);
    }

    // 3~5점 주기
    const nowStar = _.random(2, 4);
    await this.page.evaluate(
      star => document.querySelector('#stars').children[star].click(),
      nowStar,
    );
    console.log('별점 주기 완료', nowStar + 1);
    // 3초 대기
    await this.page.waitForTimeout(1000 * 3);

    await this.page.evaluate(() => document.querySelector('.close').click());

    return this.checkWatchTime();
  }

  /**
   * @description Sub
   * 정해진 시간에 동작하는 스케줄러
   */
  setScheduler() {
    if (this.watchMovieScheduler !== null) {
      this.watchMovieScheduler.stop();
    }

    // 1분마다 요청
    this.watchMovieScheduler = new cron.CronJob(
      this.startWatchTime,
      () => {
        this.startWatchWorker();
      },
      null,
      true,
    );

    if (this.resetWatchMovieScheduler !== null) {
      this.resetWatchMovieScheduler.stop();
    }
    // 자정에 리셋
    this.resetWatchMovieScheduler = new cron.CronJob(
      '0 0 * * *',
      () => {
        this.resetWatchInfo();
      },
      null,
      true,
    );
  }

  /**
   * @description Sub
   * 영상 시청 정보 초기화
   */
  resetWatchInfo() {
    this.watchMovieInfo = {
      // 최종 볼 시간
      durationMin: 180,
      // 현재 본 시간
      viewMin: 0,
      // 이번에 볼 영상 경로
      moviePathname: this.moviePath,
    };
  }

  /**
   * @description Sub
   * Login
   */
  async login() {
    // 홈으로 이동
    await this.page.goto(url);

    await this.page.waitForTimeout(1000 * 3);
    // 현재 pathname 추출
    const pathname = await this.page.evaluate(() => window.location.pathname);

    // 현재 경로가 로그인 화면이 아닐 경우 이미 로그인 한것으로 판단
    const isLoginPathname = pathname === '/kr/login' || pathname === '/login';
    if (isLoginPathname === false) {
      console.error('Login Bug', pathname);
      return true;
    }

    // id
    await this.page.focus('#user_username');
    await this.page.keyboard.type(this.user.id);

    // pw
    await this.page.focus('#user_password');
    await this.page.keyboard.type(this.user.pw);
    await this.page.keyboard.press('Enter');

    await this.page.waitForTimeout(1000 * 3);

    // 카드 Footer 있는지 확인
    const submitBtn = await this.page.$('input[type="submit"]');
    if (submitBtn !== null) {
      await submitBtn.click();
    }

    // id 경로 받아오는 방법. 단 사이트 구조 바뀔수도 있으니.. 흠
    // document.querySelector('#main_profile').querySelectorAll('li')[1].querySelectorAll('span')[1].innerHTML

    console.log('===============   complete login:', this.user.id);
  }

  /**
   * @description Sub
   * Logout
   */
  async logout() {
    console.log('===============   try Logout');
    // 홈으로 이동
    await this.page.goto('http://imfreeterpartner.com/kr/videoplays');

    await this.page.waitForTimeout(1000 * 3);
    // Logout
    await this.page.evaluate(() =>
      document.querySelector('a[href="/kr/logout"]').click(),
    );

    await this.page.waitForTimeout(1000 * 3);

    // 현재 pathname 추출
    const pathname = await this.page.evaluate(() => window.location.pathname);

    const isLoginPathname = pathname === '/kr/login' || pathname === '/login';

    if (isLoginPathname) {
      console.log('===============   logout', this.user.id);
      return true;
    }
    return this.logout();
  }

  /**
   * @description Sub
   * Login
   */
  async checkLoginUrl() {
    // 한숨 돌리기
    await this.page.waitForTimeout(1000 * 3);

    const pathname = await this.page.evaluate(() => window.location.pathname);

    if (pathname === '/kr/login' || pathname === '/login') {
      console.error('Login Bug');
      await this.login();
    }
  }
};
