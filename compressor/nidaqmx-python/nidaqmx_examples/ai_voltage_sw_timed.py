﻿import sys
import pprint
import nidaqmx

pp = pprint.PrettyPrinter(indent=4)

with nidaqmx.Task() as task:
    task.ai_channels.add_ai_voltage_chan("cDAQ9185-1EE8DE7Mod1/ai0")

    print('1 Channel 1 Sample Read: ')
    data = task.read()
    pp.pprint(data)

    data = task.read(number_of_samples_per_channel=1)
    pp.pprint(data)

    print('1 Channel N Samples Read: ')
    data = task.read(number_of_samples_per_channel=8)
    pp.pprint(data)

    task.ai_channels.add_ai_voltage_chan("cDAQ9185-1EE8DE7Mod1/ai1:3")

    print('N Channel 1 Sample Read: ')
    data = task.read()
    pp.pprint(data)

    print('N Channel N Samples Read: ')
    data = task.read(number_of_samples_per_channel=2)
    pp.pprint(data)
