import nidaqmx
from nidaqmx.constants import (
    LineGrouping)


with nidaqmx.Task() as task:
    # task.do_channels.add_do_chan(
    #     'cDAQ9185-1EE8DE7Mod4/port0/line0:3',
    #     line_grouping=LineGrouping.CHAN_FOR_ALL_LINES)

    # try:
    #     print('N Lines 1 Sample Boolean Write (Error Expected): ')
    #     print(task.write([True, False, False, True], auto_start=True))
    # except nidaqmx.DaqError as e:
    #     print(e)

    # print('1 Channel N Lines 1 Sample Unsigned Integer Write: ')
    # print(task.write(1))

    task.do_channels.add_do_chan(
        'cDAQ9185-1EE8DE7Mod4/port0/line0:3',
        line_grouping=LineGrouping.CHAN_FOR_ALL_LINES)

    print(task.write(15, auto_start=True))

    print(task.write(6, auto_start=True))

    data = task.read()
    print(data)

# print('1 Channel N Lines N Samples Unsigned Integer Write: ')
# print(task.write([1, 2, 4, 8], auto_start=True))
