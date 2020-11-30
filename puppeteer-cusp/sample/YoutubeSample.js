const Promise = require('bluebird');
const puppeteer = require('puppeteer');
const cron = require('cron');
const { BU } = require('base-util-jh');

const url = 'https://imfreeterpartner.com/kr';

module.exports = class {
  constructor(params) {
    this.watchMovieScheduler = null;
    this.resetWatchMovieScheduler = null;

    this.resetWatchMovieStatus();
  }

  // TODO: 정해진 시간에 동작하는 스케줄러
  setScheduler() {
    if (this.watchMovieScheduler !== null) {
      this.watchMovieScheduler.stop();
    }
    // 1분마다 요청
    this.watchMovieScheduler = new cron.CronJob(
      process.env.WATCH_TIME,
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
      '0 0 0 * * *',
      () => {
        this.resetWatchMovieStatus();
      },
      null,
      true,
    );
  }

  // TODO: Cron >> 자정 초기화
  resetWatchMovieStatus() {
    this.watchMovieInfo = {
      // 남은 시간
      remainMin: 180,
      // 본 시간
      viewMin: 0,
      // 본 영상 Index
      movieIndex: 0,
      // 다음 영상 주소
      nextMovieHref: '',
    };
  }

  // TODO: Start Worker
  async watchMovie() {
    // Step: 1

    if (this.page === null || this.page === undefined) {
      await this.createPage();
      console.log('complete createPage');

      await this.login();
      console.log('complete login');
    }

    // await this.page.goto('https://imfreeterpartner.com/kr/video/detail/106');

    // Step: 2
    const isClear = await this.selectMovie();
    console.log('complete selectMovie');

    if (!isClear) return false;

    // Step: 3
    this.checkMovieStaus();
    await this.skipAd();
    console.log('complete checkMovieStaus');
  }

  /**
   * 페이지 생성
   */
  async createPage() {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: {
        width: 2000,
        height: 1024,
      },
      // devtools: true,
      // product: 'firefox',
    });

    // this.page2 = await browser.newPage();
    this.page = await browser.newPage();

    await this.page.goto(url);
    // await this.page2.goto(url);
    // await this.page.goto('https://www.youtube.com/');
  }

  // TODO: Login
  async login() {
    // BU.CLI(process.env);
    // id
    await this.page.focus('#user_username');
    await this.page.keyboard.type(process.env.ID);

    // pw
    await this.page.focus('#user_password');
    await this.page.keyboard.type(process.env.PW);
    await this.page.keyboard.press('Enter');

    await Promise.delay(1000 * 5);

    // 카드 Footer 있는지 확인
    const submitBtn = await this.page.$('input[type="submit"]');
    if (submitBtn !== null) {
      await submitBtn.click();
    }
  }

  // TODO: 시간 체크
  async updateRemainTime() {
    // FIXME: 홈으로 이동하지 않음.
    // TODO: 시간 데이터 추출
    // await this.page.goto('http://imfreeterpartner.com/');

    // 시간 못채웠을 경우
    if (this.watchMovieInfo.viewMin < this.watchMovieInfo.remainMin) {
      await this.watchMovie();
    } else {
      this.page.close();
    }

    // TODO: 남은 시간 - 현재 본 시간 업데이트
  }

  // TODO: 영상 선택 + 실행
  async selectMovie() {
    // 추천 영상으로 이동
    await this.page.goto('https://imfreeterpartner.com/kr/videoplay/recommand');

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
    // await children[this.watchMovieInfo.movieIndex].click();
    const nextUrl = await children[this.watchMovieInfo.movieIndex].$eval(
      'a',
      el => el.href,
    );

    // FIXME: 이짓을 안하면 영상 로딩이 안됨
    await this.page.waitForTimeout(1000 * 2);
    await this.page.goto(url);

    await this.page.waitForTimeout(1000 * 2);
    await this.page.goto(nextUrl);

    // 영상 로딩 대기
    await this.page.waitForTimeout(1000 * 3);

    const playSelector = '.ytp-cued-thumbnail-overlay';

    // TODO: (IM) 재생 버튼 클릭
    const videoEle = await this.page.$('iframe');
    // const playBtn = await this.page.$(playSelector);
    // const submitBtn = await this.page.$('button[aria-label="재생"]');
    console.log(videoEle);
    if (videoEle === null) {
      // return false;
      return this.selectMovie();
    }

    // await this.page.evaluateHandle(() => player.playVideo());

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

    const progressBarSelector = '.ytp-progress-bar';
    const progressSettingSelector = '.ytp-settings-button';

    const controlBtn = await this.page.$(progressSettingSelector);

    // FIXME: 프로그레스바를 보이기 위하여 설정 버튼 클릭 시행. 개선 필요
    await controlBtn.click();
    // 영상 시간
    const maxTime = await this.page.$eval(progressBarSelector, el =>
      el.getAttribute('aria-valuemax'),
    );
    // 현재 본 시간
    const nowTime = await this.page.$eval(progressBarSelector, el =>
      el.getAttribute('aria-valuenow'),
    );

    console.log('진행률:', (nowTime / maxTime) * 100);

    // 90% 이상 보았을 경우 평가
    if (nowTime >= maxTime) {
      // 종료 일시
      await this.evaluateStar();

      this.watchMovieInfo.viewMin += nowTime;

      return this.updateRemainTime();

      // await Promise.delay(1000 * 1);
      // // 재귀 체크
      // this.checkMovieStaus();
    } else {
      // 5초 대기 후 재확인
      await Promise.delay(1000 * 5);
      // 재귀 체크
      this.checkMovieStaus();
    }
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
    await children[3].click();

    const closeBtn = await this.page.$('.close');

    await closeBtn.click();
  }
};
