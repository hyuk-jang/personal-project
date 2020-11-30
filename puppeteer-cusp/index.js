// const dotenv = require('dotenv');

const { BU } = require('base-util-jh');

const config = require(`${process.cwd()}/config`);

// BU.CLI(config);

// const path = `${process.cwd()}/.env`;

const Worker = require('./Worker');

// dotenv.config({ path });

const worker = new Worker(config);

worker.init();
// worker.setScheduler();

process.on('uncaughtException', err => {
  // BU.debugConsole();
  console.error(err.stack);
  console.log(err.message);
  BU.errorLog('uncaughtException', err.message);
  console.log('Node NOT Exiting...');
});

process.on('unhandledRejection', err => {
  // BU.debugConsole(10);
  BU.CLI(err);
  BU.errorLog('unhandledRejection', err.message);
  console.log('Node NOT Exiting...');
});
