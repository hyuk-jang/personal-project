import nidaqmx
import statistics

import pprint

from threading import Timer

from .Controller import Controller

pp = pprint.PrettyPrinter(indent=4)


class CiSwController(Controller):
    def __init__(self, cDaqInfo, slotInfo):
        super().__init__(cDaqInfo, slotInfo)

        pp.pprint('CiSwController Constructor')

        # 8개의 CH 데이터가 담김
        self.currChData = [0, 0, 0, 0, 0, 0, 0, 0]

    # pass

    def executeMeasure(self):
        pp.pprint('executeMeasure 9208')
        # 계측 태스크 생성
        with nidaqmx.Task() as task:
            # 전류 8채널 읽어옴
            task.ai_channels.add_ai_current_chan(self.id + '/ai0:7')
            # 각 채널별 3개의 데이터를 계측 (시간이 오래걸린관계로 3개로 함)
            data = task.read(number_of_samples_per_channel=1)
            # data = task.read(number_of_samples_per_channel=10)
            # 각 채널 전압데이터는 100개의 데이터 중 중앙값을 사용
            # 데이터 출력이 Amp로 나오기 때문에 mAmp 로 변환하여 저장
            for i in range(len(data)):
                self.currChData[i] = round(
                    statistics.median(data[i]) * 1000, 2) + 0

        pp.pprint(self.currChData)

        return self.currChData

    def getData(self):
        # pp.pprint('executeMeasure 9208' + self.currChData)
        return self.currChData

    def getSendData(self):
        # print('getSendData 9208')
        dataList = []
        # (+-) 2자리.2자리 >> 총 6자리 사용
        for current in self.getData():
            dataList.append(
                f'+{format(current, "05.2f")}' if current >= 0 else format(current, "06.2f"))

        # 8채널데이터를 1채널부터 순차적으로 붙임
        sendMsg = '#' + self.cDaqSerial + self.slotType + \
            self.slotSerial + ''.join(dataList)

        return self.getSendDataFrame(sendMsg)
