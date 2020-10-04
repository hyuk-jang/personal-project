from threading import Timer
import binascii
from binascii import hexlify, unhexlify

import math


class Controller:
    def __init__(self, cDaqInfo, slotInfo):
        self.cDaqModelType = cDaqInfo.get('model')
        self.cDaqSerial = cDaqInfo.get('serial')
        self.slot = slotInfo.get('slot')
        self.slotType = slotInfo.get('model')
        self.slotSerial = slotInfo.get('serial')

        self.id = self.cDaqModelType + '-' + \
            self.cDaqSerial[1:] + 'Mod' + str(self.slot)

        # 10초에 한번씩 계측
        self.measureInterval = 5

    def getSlotSerial(self):
        return self.slotSerial.upper()

    def getData(self):
        pass

    def getSendData(self):
        pass

    def runMeasureScheduler(self):
        self.executeMeasure()
        Timer(self.measureInterval, self.runMeasureScheduler).start()

    def executeMeasure(self):
        pass

    def executeControl(self, setChData):
        pass

    def calcChecksum256(self, strData):
        print('strData', strData)
        # try:
        hChecksum = hex(sum(bytes(strData, 'ascii')) % 256)[2:].zfill(2)

        # print('hChecksum', hChecksum)

        return unhexlify(hChecksum)

    def getEOT(self):
        return unhexlify('04')

    def getSendDataFrame(self, sendMsg):
        # sendFrame: #(A) + modelType(A) + slotSerial(A) + dataBody(B) + checksum(B) + EOT(B)
        # print('sendMsg.encode()', sendMsg.encode())
        return sendMsg.encode() + self.calcChecksum256(sendMsg) + self.getEOT()
