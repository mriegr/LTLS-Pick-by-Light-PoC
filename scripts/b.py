#!/usr/bin/env python
# -*- coding: utf-8 -*-

HOST = "137.226.151.148"
PORT = 4223

import sys, time
from tinkerforge.ip_connection import IPConnection
from tinkerforge.bricklet_led_strip import LEDStrip

locList = [
    [
        0, 15, 20, 35, 40, 55, 60, 75, 80
    ],
    [
        5, 10, 25, 30, 45, 50, 65, 70, 85
    ]
]

def disconnect():
    #raw_input()
    #time.sleep(2)
    ipcon.disconnect()

def turnoff(ls, delay=0):

    pass

def toggleLED(ls,state,position=None):

    if position:
        print(position+": "+str(parsePosition(str(position))))
        position = parsePosition(str(position))
    else:
        turnoff(ls)
        return

    if state==3:
        turnoff(ls)
    elif state:
        ls.set_rgb_values(int(position), 5, [0]*16, [255]*16, [0]*16)
    else:
        ls.set_rgb_values(int(position), 5, [0]*16, [0]*16, [0]*16)

def parsePosition(position):
    col = position[3:]
    row = position[:2]
    if col == 'A':
        col = 0
    else:
        col = 1
    return locList[col][int(row)-1]

def opr(ls):

    # Newly added location will be stacked together with the old location data

    if sys.argv == 3:
        turnoff(ls,0.5)
        turnoff(ls,1)
        return

    if len(sys.argv)<3:
        toggleLED(ls, int(sys.argv[1]))
    else:
        for i in range (2, len(sys.argv)):
            toggleLED(ls, int(sys.argv[1]), sys.argv[i])

def opr2(ls):

    # Newly added location will rewrite all previous location data

    #toggleLED(ls, int(sys.argv[1]))
    if int(sys.argv[1])==0:
        ls.set_rgb_values(int(sys.argv[2]), 1, [0]*16, [0]*16, [0]*16)
    else:
        ls.set_rgb_values(int(sys.argv[2]), 1, [0]*16, [255]*16, [0]*16)


if __name__ == "__main__":

    ipcon = IPConnection()
    ipcon.connect(HOST, PORT)
    ipcon.set_timeout(10000)
    ipcon.wait()

    ls = LEDStrip("oV7", ipcon)

    opr2(ls)

    ls.register_callback(ls.CALLBACK_FRAME_RENDERED, disconnect())
    #disconnect()
