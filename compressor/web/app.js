const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const favicon = require('serve-favicon');

const { BU } = require('base-util-jh');

const indexRouter = require('./routes/index');

const authRouter = require('./routes/auth');

// const listener = require('./bin/listener');
const passport = require('./bin/passport');
const {
  dbInfo,
  projectInfo: { projectMainId },
} = require('./bin/config');

const BiAuth = require('./models/templates/auth/BiAuth');
const BiModule = require('./models/templates/BiModule');

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    limit: 1024 * 1024 * 1, // 1mb 까지 허용
    extended: true,
  }),
);
app.use(methodOverride('_method'));

app.use(flash());

/**
 * Set Customize
 */

let faviPath = 'WWW.ico';

app.set('dbInfo', dbInfo);
app.set('biAuth', new BiAuth(dbInfo));
app.set('biModule', new BiModule(dbInfo));

// app.use(helmet());
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: [
//         "'self'",
//         "'unsafe-inline'",
//         'stackpath.bootstrapcdn.com',
//         'use.fontawesome.com',
//         'fonts.googleapis.com',
//         'fonts.gstatic.com',
//         'code.jquery.com',
//       ],
//       scriptSrc: [
//         "'self'",
//         "'unsafe-inline'",
//         "'unsafe-eval'",
//         'stackpath.bootstrapcdn.com',
//         'code.jquery.com',
//       ],
//       objectSrc: ["'self'"],
//       upgradeInsecureRequests: [],
//     },
//   }),
// );

// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: [
//         "'self'",
//         "'unsafe-inline'",
//         'maxcdn.bootstrapcdn.com',
//         'stackpath.bootstrapcdn.com',
//       ],
//       styleSrc: [
//         "'self'",
//         'use.fontawesome.com',
//         'fonts.googleapis.com',
//         'stackpath.bootstrapcdn.com',
//       ],
//       fontSrc: ["'self'", 'fonts.com'],
//       // imgSrc: ['img.com', 'data:'],
//       // sandbox: ['allow-forms', 'allow-scripts'],
//       // reportUri: '/report-violation',
//       // objectSrc: ["'none'"],
//       upgradeInsecureRequests: false,
//       // workerSrc: false, // This is not set.
//       // defaultSrc: ["'self'"],
//       // fontSrc: ["'self'"],
//       // styleSrc: [
//       //   "'self'",
//       //   'use.fontawesome.com',
//       //   'fonts.googleapis.com',
//       //   'stackpath.bootstrapcdn.com',
//       // ],

//       // scriptSrc: [
//       //   "'self'",
//       //   "'unsafe-inline'",
//       //   'maxcdn.bootstrapcdn.com',
//       //   'stackpath.bootstrapcdn.com',
//       // ],
//     },
//   }),
// );

// app.use(helmet.noSniff());
// app.use(helmet.xssFilter());
// const expiryDate = new Date(Date.now() + 60 * 1000); // 1 hour
const store = new MySQLStore(dbInfo);
const expiryDate = new Date(Date.now() + 60 * 1000); // 1 hour
// BU.CLI(expiryDate);
app.use(
  session({
    // secret: 'secret',
    secret: BU.GUID(),
    store,
    // 세션에 수정 사항이 생기지 않더라도 세션을 다시 저장할지에 대한 여부
    resave: false,
    // 세션에 저장할 내역이 없더라도 세션을 저장할지에 대한 설정 (방문자 추적에 사용)
    saveUninitialized: true,
    cookie: {
      // maxAge: null, // 1일
      // maxAge: 1000 * 60 * 60 * 24, // 1일
      // expires - 지속적 쿠키에 대한 만기 날짜를 설정하는 데 사용됩니다.
      // expires: expiryDate,
      // // secure - 브라우저가 HTTPS를 통해서만 쿠키를 전송하도록 합니다.
      secure: false,
      // httpOnly - 쿠키가 클라이언트 JavaScript가 아닌 HTTP(S)를 통해서만 전송되도록 하며, 이를 통해 XSS(Cross-site scripting) 공격으로부터 보호할 수 있습니다.
      httpOnly: true,
    },
  }),
);

// if (app.get('env') === 'production') {
//   app.set('trust proxy', 1) // trust first proxy
//   sess.cookie.secure = true // serve secure cookies
//  }

// app.use(listener(store));

app.set('passport', passport(app, dbInfo));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// app.engine('html', require('ejs').renderFile);

if (app.get('env') === 'development') {
  // app.use(logger('dev'));
  // app.use(
  //   logger('dev'),
  //   logger(':method :url :status :response-time ms - :res[content-length]'),
  //   (req, res, next) => {
  //     next();
  //   },
  // );
}

app.use(express.json());
// app.use(express.urlencoded({extended: `fa`lse}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// cctv 카메라 스냅샷 저장 경로
app.use(
  '/snapshot',
  express.static(path.join(__dirname, 'snapshot'), {
    extensions: ['jpg'],
  }),
);
// 사용자 취급 설명서 저장 경로
app.use(
  '/docs',
  express.static(path.join(process.cwd(), 'docs'), {
    extensions: ['pptx', 'hwp', 'docx'],
  }),
);
// 맵 이미지 저장 경로
app.use(
  '/map',
  express.static(path.join(__dirname, 'map'), {
    extensions: ['jpg', 'png', 'gif'],
  }),
);

app.use('/auth', authRouter);
app.use('/', indexRouter);
// app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // BU.CLI('error handler');
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // FIXME: 정상 요청일 경우에도 로드됨. 문제인지 아닌지 파악 필요
  if (app.get('env') === 'production') {
    return res
      .status(500)
      .send('페이지 요청 중에 문제가 발생하였습니다.\n관리자에게 문의하시기 바랍니다.');
  }

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
