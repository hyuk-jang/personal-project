import nidaqmx
import statistics

from threading import Timer

from .Controller import Controller


class AiVoltageSwController(Controller):
    def __init__(self, cDaqInfo, slotInfo):
        super().__init__(cDaqInfo, slotInfo)

        # 8개의 CH 데이터가 담김
        self.currChData = [0, 0, 0, 0, 0, 0, 0, 0]

    # pass

    def executeMeasure(self):
        # 계측 태스크 생성
        with nidaqmx.Task() as task:
            # 전압 8채널 읽어옴
            task.ai_channels.add_ai_voltage_chan(self.id + '/ai0:7')
            # 각 채널별 100개의 데이터를 계측
            data = task.read(number_of_samples_per_channel=100)
            # 각 채널 전압데이터는 100개의 데이터 중 중앙값을 사용하며 소수점 4자리까지 저장
            for i in range(len(data)):
                self.currChData[i] = round(statistics.median(data[i]), 4)

        return self.currChData

    def getData(self):
        return self.currChData

    def getSendData(self):
        # print('getSendData')
        dataList = []
        # (+-) 2자리.2자리 >> 총 6자리 사용
        for voltage in self.getData():
            dataList.append(
                f'+{format(voltage, "05.2f")}' if voltage >= 0 else format(voltage, "06.2f"))

        # 8채널데이터를 1채널부터 순차적으로 붙임
        sendMsg = '#' + self.cDaqSerial + self.slotType + \
            self.slotSerial + ''.join(dataList)

        return self.getSendDataFrame(sendMsg)
