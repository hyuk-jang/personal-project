const { BU } = require('base-util-jh');

const Control = require('./Control');

/**
 * 프로젝트에 따라 Control과 Model을 생성.
 */
class Main {
  /**
   * @param {Object} config
   * @param {Object} config.projectInfo
   * @param {string} config.projectInfo.projectMainId
   * @param {string} config.projectInfo.projectSubId
   * @param {dbInfo} config.dbInfo
   */
  createControl(config = {}) {
    const mainControl = new Control(config);

    return mainControl;
  }
}
module.exports = Main;
