from binascii import unhexlify
import socket
import binascii
from socket import error

from config import config


def listenSocketServer(controllerList):
    # print(controllerList)
    # Socket Server 구동
    # 접속할 서버 주소입니다. 여기에서는 루프백(loopback) 인터페이스 주소 즉 localhost를 사용합니다.
    HOST = '127.0.0.1'

    # 클라이언트 접속을 대기하는 포트 번호입니다.
    PORT = config.get('socketPort', 9999)

    # 소켓 객체를 생성합니다.
    # 주소 체계(address family)로 IPv4, 소켓 타입으로 TCP 사용합니다.
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # 포트 사용중이라 연결할 수 없다는
    # WinError 10048 에러 해결를 위해 필요합니다.
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # bind 함수는 소켓을 특정 네트워크 인터페이스와 포트 번호에 연결하는데 사용됩니다.
    # HOST는 hostname, ip address, 빈 문자열 ""이 될 수 있습니다.
    # 빈 문자열이면 모든 네트워크 인터페이스로부터의 접속을 허용합니다.
    # PORT는 1-65535 사이의 숫자를 사용할 수 있습니다.
    server_socket.bind((HOST, PORT))

    # 서버가 클라이언트의 접속을 허용하도록 합니다.
    server_socket.listen()
    print(f'server listen {PORT}')

    # 무한루프를 돌면서
    while True:
        # accept 함수에서 대기하다가 클라이언트가 접속하면 새로운 소켓을 리턴합니다.
        client_socket, addr = server_socket.accept()
        # 접속한 클라이언트의 주소입니다.
        print('Connected by', addr)

        try:

            onData(client_socket, controllerList)

            # # 클라이언트가 보낸 메시지를 수신하기 위해 대기합니다.
            # data = client_socket.recv(1024)

            # # 수신받은 문자열을 출력합니다.
            # print('Received from', addr, data)

            # # receiveFrame: STX(#[1]) + cDaqSerial(A[8]) + modelType(A[4]) + slotSerial(A[8]) + FnCode(A[1]) + CMD(A[2]) + checksum(B[1]) + EOT(B[1])
            # # protocol: serialId(4byte) , fnCode(01: read, 02: write 1byte), cmd(1byte), checksum(1byte), EOT(1byte)
            # dataBody = data[0:24]
            # stx = data[0: 1]
            # cDaqSerial = data[1: 9]
            # modelType = data[9: 13]
            # slotSerial = data[13: 21]

            # print('cDaqSerial', cDaqSerial)
            # print('modelType', modelType)
            # print('slotSerial', slotSerial)

            # # M(계측), C(제어)
            # fnCode = data[21:22]
            # cmd = data[22:24]
            # checksum = data[24: 25]
            # eot = data[25:]

            # # 체크섬이 맞는지 확인
            # if checksum != calcChecksum256(dataBody):
            #     print(
            #         f'not matching checksum {checksum} != {calcChecksum256(dataBody)}')
            #     client_socket.close()
            #     continue

            # # serial과 일치하는 컨트롤러 가져옴
            # selectedcontrollerList = list(
            #     filter(lambda controller: controller.getSlotSerial() == slotSerial.decode().upper(), controllerList))

            # print(selectedcontrollerList)

            # # 존재하지 않을 경우 무시
            # if len(selectedcontrollerList) == 0:
            #     client_socket.close()
            #     continue

            # controller = selectedcontrollerList[0]

            # msg = ''

            # # fnCode가 계측(1)이라면 executeMeasure(), 제어라면 executeControl(cmd)
            # if fnCode.decode() == '1':
            #     # print('controller.executeMeasure()')
            #     msg = controller.executeMeasure()
            # elif fnCode.decode() == '2':
            #     # print('controller.executeControl(cmd)')
            #     msg = controller.executeControl(int(cmd.decode()))
            # else:
            #     print('not matching fnCode')

            # if msg == '':
            #     client_socket.close()
            #     continue

            # # sendFrame: #(A) + modelType(A) + slotSerial(A) + dataBody(B) + checksum(B) + EOT(B)
            # sendFrame = controller.getSendData()

            # print('sendFrame', sendFrame)

            # client_socket.send(sendFrame)

            # continue
            # client_socket.close()
        # 명령 결과 전송
        except error:
            print(error)
            client_socket.close()


def onData(client_socket, controllerList):
    # 클라이언트가 보낸 메시지를 수신하기 위해 대기합니다.
    data = client_socket.recv(1024)

    # 수신받은 문자열을 출력합니다.
    print('Received from', data)

    # receiveFrame: STX(#[1]) + cDaqSerial(A[8]) + modelType(A[4]) + slotSerial(A[8]) + FnCode(A[1]) + CMD(A[2]) + checksum(B[1]) + EOT(B[1])
    # protocol: serialId(4byte) , fnCode(01: read, 02: write 1byte), cmd(1byte), checksum(1byte), EOT(1byte)
    dataBody = data[0:24]
    stx = data[0: 1]
    cDaqSerial = data[1: 9]
    modelType = data[9: 13]
    slotSerial = data[13: 21]

    # print('cDaqSerial', cDaqSerial)
    # print('modelType', modelType)
    # print('slotSerial', slotSerial)

    # M(계측), C(제어)
    fnCode = data[21:22]
    cmd = data[22:24]
    checksum = data[24: 25]
    eot = data[25:]

    # 체크섬이 맞는지 확인
    if checksum != calcChecksum256(dataBody):
        print(
            f'not matching checksum {checksum} != {calcChecksum256(dataBody)}')
        client_socket.close()
        return

    # serial과 일치하는 컨트롤러 가져옴
    selectedcontrollerList = list(
        filter(lambda controller: controller.getSlotSerial() == slotSerial.decode().upper(), controllerList))

    # print(selectedcontrollerList)

    # 존재하지 않을 경우 무시
    if len(selectedcontrollerList) == 0:
        client_socket.close()
        return

    controller = selectedcontrollerList[0]

    msg = ''

    # fnCode가 계측(1)이라면 executeMeasure(), 제어라면 executeControl(cmd)
    if fnCode.decode() == '1':
        # print('controller.executeMeasure()')
        msg = controller.executeMeasure()
    elif fnCode.decode() == '2':
        # print('controller.executeControl(cmd)')
        msg = controller.executeControl(int(cmd.decode()))
    else:
        print('not matching fnCode')

    if msg == '':
        client_socket.close()
        return

    # sendFrame: #(A) + modelType(A) + slotSerial(A) + dataBody(B) + checksum(B) + EOT(B)
    sendFrame = controller.getSendData()

    print('sendFrame', sendFrame)

    client_socket.send(sendFrame)

    onData(client_socket, controllerList)


def calcChecksum256(bData):
    return unhexlify(hex(sum(bData) % 256)[2:])
    # data = binascii.a2b_hex(strData)
    # checksum = hex(sum(data) % 256)
    # print('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@', checksum)
    # return checksum[2:]

# # 소켓을 닫습니다.
# client_socket.close()
# server_socket.close()

# Socket Client 접속시 인증 시행
