import socket
from config import config
from socketServer import listenSocketServer

# FIXME: Test를 위한 Import
import time
import random
from threading import Timer
# FIXME: Test를 위한 Import

from nidaqmx_examples.Controller import Controller
from nidaqmx_examples.AiVoltageSwController import AiVoltageSwController
from nidaqmx_examples.DoSwTimedController import DoSwTimedController

# 이 프로그램은 cDAQ 1대와 통신하는것을 가정한다.
# 설정파일에서 정의한 모델명과 시리얼 정보를 입력
Controller.deviceId = config.get('model')
Controller.serial = config.get('serial')
# cDAQ 슬롯별 컨트롤러 리스트
controllers = []


def createController():
    """ 설정 파일을 순회하면서 모델명과 일치하는 컨트롤러를 정의 """
    for slotInfo in config.get('slots'):
        model = slotInfo.get('model')
        # 기본 설정 컨트롤러
        controller = Controller(config, slotInfo)
        if model == '9201':    # 전압 ai_voltage_sw_timed 모듈을 실행
            controller = AiVoltageSwController(config, slotInfo)
        elif model == '9482':  # 릴레이 do_sw_timed 모듈 실행
            controller = DoSwTimedController(config, slotInfo)
        else:
            pass
        # 슬롯 컨트롤러를 컨트롤러 리스트에 추가
        controllers.append(controller)
        # 계측 시작
        # controller.runMeasureScheduler()

    print(f'maked {len(controllers)} controller.')
    pass


def testMeasure():
    # FIXME: 계측 테스트 코드
    for controller in controllers:
        # start_time = time.time()
        # controller.executeMeasure()
        # controller.runMeasureScheduler()
        # print("---{}s seconds---".format(time.time()-start_time))
        pass


# ni9482List =list(filter(lambda controller: controller.model == '9482', controllers))

def testWriteDate():
    # FIXME: 랜덤 값 쓰기 테스트 코드
    Timer(1, testWriteDate).start()
    for c in controllers:
        result = c.executeControl(random.randint(0, 15))
        print(result)
        print(c.getData())


# 명령 요청 시 해석하여 해당 명령 시행 후 결과 반환

createController()

# print('frameData: ', controllers[0].getSendData())
# print('frameData: ', controllers[1].getSendData())
# print('frameData: ', controllers[2].getSendData())


listenSocketServer(controllers)
