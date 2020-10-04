import nidaqmx
from nidaqmx.constants import (
    LineGrouping)

from .Controller import Controller


class DoSwTimedController(Controller):
    def __init__(self, cDaqInfo, slotInfo):
        super().__init__(cDaqInfo, slotInfo)

        # self.id = Controller.getDeviceId() + 'Mod' + str(self.slot)
        self.isMeasure = False

        # 4개의 CH 릴레이가 담김 >> binary --> (0: 모두 닫힘, 15: 모두 열림 )
        self.currChData = 0

    def executeMeasure(self):
        with nidaqmx.Task() as task:
            # print('릴레이 계측 시작')
            task.do_channels.add_do_chan(
                self.id + '/port0/line0:3', line_grouping=LineGrouping.CHAN_FOR_ALL_LINES)

            self.currChData = task.read()
        return self.currChData

    # ch: operation Channel Value
    def executeControl(self, setChData):
        # print('executeControl', setChData)
        if setChData == self.currChData:
            return setChData
        elif setChData >= 0 & setChData <= 15:
            with nidaqmx.Task() as task:
                # print('릴레이 제어 시작')
                task.do_channels.add_do_chan(
                    self.id + '/port0/line0:3', line_grouping=LineGrouping.CHAN_FOR_ALL_LINES)

                task.write(setChData, auto_start=True)

                self.currChData = task.read()
            return self.currChData
        else:
            pass

    def getData(self):
        return self.currChData

    def getSendData(self):
        # print('getSendData', self.getData())

        sendMsg = '#' + self.cDaqSerial + self.slotType + self.slotSerial + \
            format(self.getData(), '02')

        return self.getSendDataFrame(sendMsg)
