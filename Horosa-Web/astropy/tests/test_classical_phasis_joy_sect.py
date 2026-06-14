# -*- coding: utf-8 -*-
"""WI-02 偕日相 phasis / WI-03 喜乐 joy / WI-04 宗派 sect 测试(古典参数补全)。"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from astrostudy import perchart


class _Fake(object):
    pass


def _chart(time='12:00:00'):
    return perchart.PerChart({
        'date': '2025/03/01', 'time': time, 'zone': '+00:00',
        'lat': '40N00', 'lon': '000E00', 'ad': 1, 'hsys': 'PLACIDUS',
    })


def test_phase_boundaries():
    pc = _chart(); pc.getChartObj()
    sun = _Fake(); sun.lon = 0.0

    def phase(body, elong):
        p = _Fake(); p.lon = float(elong)
        pc.setupPhasis(p, body, sun)
        return p.phase

    # 金星可见弧 5°(<焦伤阈 8°)→ 焦伤吃满到 8°:4°焦伤、8°自由光(plan 验收)、近核心。
    assert phase('Venus', 4.0) == 'combust'
    assert phase('Venus', 8.0) == 'free'
    assert phase('Venus', 0.1) == 'cazimi'
    # 土星弧 11°(>8°)→ 有日光束下带 8~11°。
    assert phase('Saturn', 4.0) == 'combust'
    assert phase('Saturn', 9.5) == 'underBeams'
    assert phase('Saturn', 12.0) == 'free'


def test_joy_mapping():
    pc = _chart(); pc.getChartObj()
    JOY = {'Mercury': 1, 'Moon': 3, 'Venus': 5, 'Mars': 6, 'Sun': 9, 'Jupiter': 11, 'Saturn': 12}
    for oid, jh in JOY.items():
        p = pc.chart.get(oid)
        assert p.joyHouse == jh
        assert p.joy == (p.wholeSignHouse == jh)


def test_sect_day():
    pc = _chart('12:00:00'); pc.getChartObj()
    assert pc.chart.isDiurnal() is True
    assert pc.chart.get('Sun').ofSect is True
    assert pc.chart.get('Jupiter').ofSect is True
    assert pc.chart.get('Saturn').ofSect is True
    assert pc.chart.get('Moon').ofSect is False
    assert pc.chart.get('Venus').ofSect is False
    assert pc.chart.get('Mars').ofSect is False


def test_feral_logic():
    pc = _chart(); pc.getChartObj()
    # 太阳 130°,与火星(0°,130° 非托勒密)、金星(30°,100° 非托勒密)皆无相 → 野逸。
    pc._sevenLons = {'Sun': 130.0, 'Mars': 0.0, 'Venus': 30.0}
    s = _Fake(); s.lon = 130.0
    pc.setupFeral(s, 'Sun')
    assert s.feral is True
    # 太阳 60° 与火星 0° 成六分 → 非野逸。
    pc._sevenLons = {'Sun': 60.0, 'Mars': 0.0, 'Venus': 200.0}
    s2 = _Fake(); s2.lon = 60.0
    pc.setupFeral(s2, 'Sun')
    assert s2.feral is False


def test_sect_night():
    pc = _chart('00:00:00'); pc.getChartObj()
    assert pc.chart.isDiurnal() is False
    assert pc.chart.get('Moon').ofSect is True
    assert pc.chart.get('Venus').ofSect is True
    assert pc.chart.get('Mars').ofSect is True
    assert pc.chart.get('Sun').ofSect is False
    assert pc.chart.get('Jupiter').ofSect is False
    assert pc.chart.get('Saturn').ofSect is False
