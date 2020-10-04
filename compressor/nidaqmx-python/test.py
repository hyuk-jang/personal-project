import binascii
from binascii import hexlify, unhexlify


def calcChecksum256(strData):
    print('strData', strData)
    # try:
    hChecksum = hex(sum(bytes(strData.strip(), 'ascii')) % 256)[2:].zfill(2)
    # hChecksum = hex(sum(bytes(strData, 'ascii')) % 256)
    # hChecksum = unhexlify(hex(sum(bytes(strData.strip(), 'ascii')) % 256))

    print('hChecksum', hChecksum)

    print(type(hChecksum))

    return unhexlify(hChecksum)


print(calcChecksum256('#01EE8DE7948201EE186901'))
