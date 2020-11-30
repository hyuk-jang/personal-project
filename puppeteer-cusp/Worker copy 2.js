const Promise = require('bluebird');
const puppeteer = require('puppeteer');
const cron = require('cron');
const { BU } = require('base-util-jh');

const url = 'https://imfreeterpartner.com/kr';

const config = require('./config');

module.exports = class {
  /**
   *
   * @param {config} configInfo
   */
  constructor(configInfo) {
    const { isAutoStart = 1, startWatchTime = '', userList = [] } = config;

    // 설정 값 불러와서 정의
    this.isAutoStart = isAutoStart;
    this.startWatchTime = startWatchTime;
    this.userList = userList;

    // 스케줄러 정의
    this.watchMovieScheduler = null;
    this.resetWatchMovieScheduler = null;

    this.userIndex = 0;

    this.resetWatchMovieStatus();

    this.setScheduler();
  }

  // 정해진 시간에 동작하는 스케줄러
  setScheduler() {
    if (this.watchMovieScheduler !== null) {
      this.watchMovieScheduler.stop();
    }
    // 1분마다 요청
    this.watchMovieScheduler = new cron.CronJob(
      this.startWatchTime,
      () => {
        this.watchMovie();
      },
      null,
      true,
    );

    if (this.resetWatchMovieScheduler !== null) {
      this.resetWatchMovieScheduler.stop();
    }
    // 자정에 리셋
    this.resetWatchMovieScheduler = new cron.CronJob(
      '0 * * *',
      () => {
        this.resetWatchMovieStatus();
      },
      null,
      true,
    );
  }

  /** 영상 시청 정보 초기화 */
  resetWatchMovieStatus() {
    this.watchMovieInfo = {
      // 최종 볼 시간
      remainMin: 180,
      // 현재 본 시간
      viewMin: 0,
      // 영상 시청 여부
      isWatchFlag: false,
    };
  }

  /**
   * 다음 시청할 유저 가져옴. 다음 유저가 없을 경우 종료 패턴
   */
  async changeNextUser() {
    this.userIndex += 1;

    // 유저 가져옴
    const userInfo = this.userList[this.userIndex];
    // 유저가 없을 경우 종료 패턴
    if (userInfo === undefined) {
      // 브라우저가 살아있다면 종료
      if (this.browser !== null) {
        await this.browser.close();

        this.browser = null;
        this.page = null;
      }
    } else {
      await this.logout();
      // 영상 시청 로직
      this.watchMovie();
    }
  }

  // TODO: Start Worker
  async watchMovie() {
    // 금일 할당 영상 시청 유무
    const isComplete = await this.isCompleteWatchMovie();

    // 영상 다 봤다면 종료
    if (isComplete) return false;

    // 영상을 시청 로직이 활성화 중인데 watchMovie를 할 경우 종료
    if (this.watchMovieInfo.isWatchFlag) return false;

    if (this.browser === null || this.browser === undefined) {
      await this.createPage();
      console.log('complete createPage');

      await this.login();
      console.log('complete login');
    }

    console.log('watchMovie Start');

    // Step: 1
    BU.logFile('Watch Moive 시작');

    // Step: 2
    const isClear = await this.selectMovie();
    console.log('complete selectMovie');

    if (!isClear) return false;

    // Step: 3
    this.checkMovieStaus();
    // await this.skipAd();
    // console.log('complete checkMovieStaus');
  }

  /**
   * 페이지 생성
   */
  async createPage() {
    this.browser = await puppeteer.launch({
      executablePath: './chromium/chrome.exe',
      headless: process.env.HEADLESS === '1',
      defaultViewport: {
        width: 2000,
        height: 1024,
      },
      // devtools: true,
    });

    this.page = await this.browser.newPage();

    await this.page.goto(url);

    // 로그인 버그 처리
    await this.checkLogInUrl();
  }

  // TODO: Login
  async login() {
    // BU.CLI(process.env);
    await this.page.waitForTimeout(1000 * 5);
    // id
    await this.page.focus('#user_username');
    await this.page.keyboard.type(process.env.ID);

    // pw
    await this.page.focus('#user_password');
    await this.page.keyboard.type(process.env.PW);
    await this.page.keyboard.press('Enter');

    await this.page.waitForTimeout(1000 * 5);

    // 카드 Footer 있는지 확인
    const submitBtn = await this.page.$('input[type="submit"]');
    if (submitBtn !== null) {
      await submitBtn.click();
    }
  }

  async logout() {}

  // TODO: 시간 체크
  async isCompleteWatchMovie() {
    // FIXME: 홈으로 이동하지 않음.
    await this.page.goto('http://imfreeterpartner.com/');

    // TODO: 시간이 남아있는 영역 추출.
    const currViewMin = 0;

    // 남은 시간이 있을 경우 viewMin 으로 반영
    if (currViewMin > 0) {
      this.watchMovieInfo.viewMin = currViewMin;
      await this.watchMovie();
    } else {
      // 오늘의 영상 시청을 마무리 하였을 경우
      this.changeNextUser();
    }

    // 달성하였을 경우 changeNextUser() 호출

    // TODO: 시간 데이터 추출
    console.log('현재 시청시간(분):', Math.round(this.watchMovieInfo.viewMin));

    // 시간 못채웠을 경우
    if (this.watchMovieInfo.viewMin < this.watchMovieInfo.remainMin) {
      return false;
    }

    // 시간 채웠고 브라우저가 살아있다면 종료
    if (this.browser !== null) {
      await this.browser.close();

      this.browser = null;
      this.page = null;
    }

    BU.logFile('Watch Moive 종료');

    return true;

    // TODO: 남은 시간 - 현재 본 시간 업데이트
  }

  async checkLogInUrl() {
    const currUrl = this.page.url();

    if (
      currUrl === 'http://imfreeterpartner.com/kr/login' ||
      currUrl === 'https://imfreeterpartner.com/login'
    ) {
      await this.login();
    }
  }

  // TODO: 영상 선택 + 실행
  async selectMovie() {
    // 영상 시청 중으로 상태 변경
    this.watchMovieInfo.isWatchFlag = true;

    // 추천 영상으로 이동
    await this.page.goto('https://imfreeterpartner.com/kr/videoplay/recommand');
    // 로그인 버그 처리
    await this.checkLogInUrl();

    // 영상 선택
    const listHandle = await this.page.evaluateHandle(() =>
      document.querySelector('.block-space').querySelectorAll('.episode-play'),
    );

    // // 추천 영상으로 이동
    // await this.page.goto('https://www.youtube.com/feed/trending');

    // // 영상 선택
    // const listHandle = await this.page.evaluateHandle(
    //   () => document.getElementById('grid-container').children,
    // );

    const properties = await listHandle.getProperties();
    const children = [];
    for (const property of properties.values()) {
      const element = property.asElement();
      if (element) children.push(element);
    }

    // 영상 재생
    // children; // holds elementHandles to all children of document.body
    const nextUrl = await children[this.watchMovieInfo.movieIndex].$eval(
      'a',
      el => el.href,
    );

    // FIXME: 이짓을 안하면 영상 로딩이 안됨
    await this.page.waitForTimeout(1000 * 2);
    await this.page.goto(url);

    // 로그인 버그 처리
    await this.checkLogInUrl();

    await this.page.waitForTimeout(1000 * 2);
    await this.page.goto(nextUrl);

    // 로그인 버그 처리
    await this.checkLogInUrl();

    // 영상 로딩 대기
    await this.page.waitForTimeout(1000 * 3);

    // TODO: (IM) 재생 버튼 클릭
    const videoEle = await this.page.$('iframe');
    // const playBtn = await this.page.$(playSelector);
    // const submitBtn = await this.page.$('button[aria-label="재생"]');
    // console.log(videoEle);
    if (videoEle === null) {
      // return false;
      return this.selectMovie();
    }

    await this.page.evaluateHandle(() => player.playVideo());

    // await submitBtn.click();
    return true;
  }

  // TODO: 영상 진행 상태 확인
  async checkMovieStaus() {
    // 광고 진행 여부 확인
    const hasSkipAd = await this.skipAd();
    if (hasSkipAd) {
      return this.checkMovieStaus();
    }

    // FIXME: 프로그레스바를 보이기 위하여 설정 버튼 클릭 시행. 개선 필요
    // 영상 시간
    // // 현재 본 시간
    const maxRunningSec = await this.page.evaluate(() => player.getDuration());
    // // 현재 본 시간
    const nowRunningSec = await this.page.evaluate(() => player.getCurrentTime());

    console.log('진행률:', Math.round((nowRunningSec / maxRunningSec) * 100), '%');

    // 90% 이상 보았을 경우 평가
    if (nowRunningSec >= maxRunningSec) {
      // 종료 일시
      await this.evaluateStar();
      console.log('별주기 완료');

      this.watchMovieInfo.viewMin += nowRunningSec / 60;
      // 영상 시청 완료로 플래그 변경
      this.watchMovieInfo.isWatchFlag = false;
      return this.watchMovie();
    }
    // 5초 대기 후 재확인
    await Promise.delay(1000 * 5);
    // 재귀 체크
    this.checkMovieStaus();
  }

  // 광고 스킵
  async skipAd() {
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

    // 5초 대기
    await Promise.delay(1000 * 5);

    if (skipBtn !== null) {
      await skipBtn.click();
    }

    return true;
  }

  // TODO: 종료 체크 + 별점
  async evaluateStar() {
    // 영상 본거니까 Index 1 증가
    this.watchMovieInfo.movieIndex += 1;

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

    // 4점 주기
    await this.page.evaluate(() => document.querySelector('#stars').children[3].click());

    await this.page.evaluate(() => document.querySelector('.close').click());
  }
};
