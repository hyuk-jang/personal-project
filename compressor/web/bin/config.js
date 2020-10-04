const ENV = process.env;

/** ENV에 등록되는 설정 정보 나열. */
module.exports = {
  projectInfo: {
    projectMainId: ENV.PJ_MAIN_ID || 'CP',
    projectSubId: ENV.PJ_SUB_ID || 'CP',
    featureConfig: {
      apiConfig: {
        socketPort: ENV.PJ_API_PORT || 7510,
      },
    },
  },
  webServer: {
    httpPort: ENV.PJ_HTTP_PORT || 7500,
  },
  dbInfo: {
    port: ENV.PJ_DB_PORT || '3306',
    host: ENV.PJ_DB_HOST || 'localhost',
    user: ENV.PJ_DB_USER || 'root',
    password: ENV.PJ_DB_PW || 'hyuk1230',
    database: ENV.PJ_DB_DB || 'compressor',
  },
  dev: {
    devMode: ENV.NODE_ENV || 'production',
    devPage: ENV.DEV_PAGE || '/',
    isAutoAuth: ENV.DEV_AUTO_AUTH || 1,
    userId: ENV.DEV_USER_ID || 'admin',
    userPw: ENV.DEV_USER_PW || 't',
  },
};
