"""
Multi-method × multi-time-key smoke + invariance tests for primary direction.

Asserts:
 1. Every newly-registered (pdMethod, pdTimeKey) combo produces a non-empty pdlist
    for a representative chart sample without raising.
 2. arc values are independent of time-key (time-key only rescales the date axis).
 3. Date strings shift in the expected direction when scale != 1.0.
 4. Unknown pdMethod falls back to the default core_alchabitius output exactly.

Iron Rule ① guard:
    Default (core_alchabitius, Ptolemy, pdtype=0) is covered by
    test_pd_alcabitius_byteperfect.py with 540-case ==. This file is the
    coverage-extension layer; combined the two tests gate the full PD surface.
"""
import gzip
import json
import re
from pathlib import Path
import pytest

from astrostudy import perchart, perpredict
from astrostudy.perpredict import STATIC_TIME_KEY_SCALES, _PD_METHOD_REGISTRY


CALIBRATION_CORPUS = (
    Path(__file__).resolve().parent
    / 'data'
    / 'pd_calibration_corpus'
    / 'golden_alcabitius_ptolemy_v253.ndjson.gz'
)


def _load_sample_charts(n=20):
    """Load up to N representative chart-data dicts from the golden corpus (gzip)."""
    charts = []
    with gzip.open(CALIBRATION_CORPUS, 'rt', encoding='utf-8') as f:
        for line in f:
            obj = json.loads(line)
            charts.append(obj['chart_data'])
            if len(charts) >= n:
                break
    return charts


SAMPLE_CHARTS = _load_sample_charts(n=20)
NEW_METHODS = ['placidus']  # P0 additions (Alcabitius is covered by byteperfect test)
# time-key 只保留有公式定义的 key(方法论铁律：公式优先,不放经验值)。
NEW_TIME_KEYS = ['Ptolemy', 'Naibod']


@pytest.mark.parametrize('pd_method', NEW_METHODS)
@pytest.mark.parametrize('pd_time_key', NEW_TIME_KEYS)
def test_new_method_timekey_runs_nonempty(pd_method, pd_time_key):
    """Every new (method, time_key) combo runs on every sample chart without crash."""
    for chart_data in SAMPLE_CHARTS:
        cd = dict(chart_data)
        cd['pdMethod'] = pd_method
        cd['pdTimeKey'] = pd_time_key
        pc = perchart.PerChart(cd)
        pp = perpredict.PerPredict(pc)
        pdlist = pp.getPrimaryDirection()
        assert isinstance(pdlist, list), f'pdlist must be a list (case {chart_data.get("date")})'
        # Allow occasional zero rows for charts where significators coincide
        # but a representative sample chart should have >= 50 rows
        assert len(pdlist) >= 50, (
            f'pdlist too short ({len(pdlist)} rows) for method={pd_method} time_key={pd_time_key}'
        )


@pytest.mark.parametrize('pd_method', NEW_METHODS)
def test_arc_independent_of_time_key(pd_method):
    """For a fixed chart + method, arc values must be identical across time-keys."""
    chart_data = SAMPLE_CHARTS[0]
    arcs_by_tk = {}
    for tk in NEW_TIME_KEYS:
        cd = dict(chart_data)
        cd['pdMethod'] = pd_method
        cd['pdTimeKey'] = tk
        pc = perchart.PerChart(cd)
        pp = perpredict.PerPredict(pc)
        pdlist = pp.getPrimaryDirection()
        # arc is item[0]; build (prom, sig, arc) tuple
        arcs_by_tk[tk] = [(r[1], r[2], r[0]) for r in pdlist]
    # All time-keys must produce identical arc sequences (arc has no scale dependence)
    base = arcs_by_tk[NEW_TIME_KEYS[0]]
    for tk in NEW_TIME_KEYS[1:]:
        assert arcs_by_tk[tk] == base, (
            f'arc mismatch between {NEW_TIME_KEYS[0]} and {tk}'
        )


@pytest.mark.parametrize('pd_method', NEW_METHODS)
def test_date_shifts_with_time_key_scale(pd_method):
    """For non-zero arc rows, date string differs across time-keys when scales differ."""
    chart_data = SAMPLE_CHARTS[0]
    dates_by_tk = {}
    for tk in NEW_TIME_KEYS:
        cd = dict(chart_data)
        cd['pdMethod'] = pd_method
        cd['pdTimeKey'] = tk
        pc = perchart.PerChart(cd)
        pp = perpredict.PerPredict(pc)
        pdlist = pp.getPrimaryDirection()
        # Pick first row with |arc| > 0.5 (clearly non-zero)
        for r in pdlist:
            if abs(r[0]) > 0.5:
                dates_by_tk[tk] = r[4]
                break

    # Naibod (0.9856 scale) must produce a DIFFERENT date from Ptolemy (1.0) on a non-zero arc row.
    assert dates_by_tk['Naibod'] != dates_by_tk['Ptolemy'], (
        f'Naibod date should differ from Ptolemy on non-zero arc row; '
        f'got same date {dates_by_tk["Naibod"]}'
    )


def test_unknown_method_falls_back_to_alcabitius():
    """An unrecognized pdMethod must produce identical output to core_alchabitius."""
    chart_data = SAMPLE_CHARTS[0]
    cd_unknown = dict(chart_data)
    cd_unknown['pdMethod'] = 'regiomontanus_not_yet_implemented'
    cd_unknown['pdTimeKey'] = 'Ptolemy'
    pc_u = perchart.PerChart(cd_unknown)
    pp_u = perpredict.PerPredict(pc_u)
    out_u = pp_u.getPrimaryDirection()

    cd_alc = dict(chart_data)
    cd_alc['pdMethod'] = 'core_alchabitius'
    cd_alc['pdTimeKey'] = 'Ptolemy'
    pc_a = perchart.PerChart(cd_alc)
    pp_a = perpredict.PerPredict(pc_a)
    out_a = pp_a.getPrimaryDirection()

    assert out_u == out_a, (
        'Unknown pdMethod must fall back to core_alchabitius byte-perfectly'
    )


def test_static_time_key_scales_contain_required_keys():
    """STATIC_TIME_KEY_SCALES must expose P0 keys with sane numeric values."""
    for key in NEW_TIME_KEYS:
        assert key in STATIC_TIME_KEY_SCALES, f'missing static scale for {key}'
        v = STATIC_TIME_KEY_SCALES[key]
        assert isinstance(v, (int, float)), f'{key} scale must be numeric'
        assert 0.5 < v < 1.5, f'{key} scale {v} out of sane PD range'
    # Iron Rule ①: Ptolemy must be exactly 1.0 (not 1.0000... approximation)
    assert STATIC_TIME_KEY_SCALES['Ptolemy'] == 1.0
    # 方法论铁律：表里只放有公式定义的 key,不放经验值。
    assert set(STATIC_TIME_KEY_SCALES.keys()) == {'Ptolemy', 'Naibod'}


def test_pd_method_registry_includes_p0_additions():
    assert 'core_alchabitius' in _PD_METHOD_REGISTRY
    assert 'horosa_legacy' in _PD_METHOD_REGISTRY
    assert 'placidus' in _PD_METHOD_REGISTRY
    # Iron Rule ①: default key must point to the original kernel
    assert _PD_METHOD_REGISTRY['core_alchabitius'] == 'getPrimaryDirectionByZCoreKernel'


# ---------------------------------------------------------------------------
# v10 进阶开关:方向类型(黄道/世俗) / 向运(顺逆同选) / 真太阳弧动态钥匙
# ---------------------------------------------------------------------------
def _engine_chart():
    """取第一张样本盘并强制走自研引擎方位法(placidus)。"""
    cd = dict(SAMPLE_CHARTS[0])
    cd['pdMethod'] = 'placidus'
    cd['pdTimeKey'] = 'Ptolemy'
    return cd


def test_pddirect_parsing_default_and_off():
    """pdDirect 默认 True;仅显式 0/'0'/false 才关。"""
    cd = _engine_chart()
    assert perchart.PerChart(cd).pdDirect is True  # 缺省
    cd0 = dict(cd); cd0['pdDirect'] = 0
    assert perchart.PerChart(cd0).pdDirect is False
    cd1 = dict(cd); cd1['pdDirect'] = '0'
    assert perchart.PerChart(cd1).pdDirect is False
    cd2 = dict(cd); cd2['pdDirect'] = 1
    assert perchart.PerChart(cd2).pdDirect is True


def test_direct_and_converse_co_select_concatenates():
    """顺向+逆向可同时选:行数应为「仅顺」与「仅逆」之和(各跑一遍拼接)。"""
    cd = _engine_chart()
    cd['pdtype'] = 0
    d = dict(cd); d['pdDirect'] = 1; d['pdConverse'] = 0
    c = dict(cd); c['pdDirect'] = 0; c['pdConverse'] = 1
    b = dict(cd); b['pdDirect'] = 1; b['pdConverse'] = 1
    n_d = len(perpredict.PerPredict(perchart.PerChart(d)).getPrimaryDirection())
    n_c = len(perpredict.PerPredict(perchart.PerChart(c)).getPrimaryDirection())
    n_b = len(perpredict.PerPredict(perchart.PerChart(b)).getPrimaryDirection())
    assert n_d > 0 and n_c > 0
    assert n_b == n_d + n_c, f'co-select should concat: {n_b} vs {n_d}+{n_c}'


def test_neither_direction_falls_back_to_direct():
    """顺逆皆关时回退顺向(绝不产出空向运)。"""
    cd = _engine_chart()
    cd['pdtype'] = 0
    none_sel = dict(cd); none_sel['pdDirect'] = 0; none_sel['pdConverse'] = 0
    only_d = dict(cd); only_d['pdDirect'] = 1; only_d['pdConverse'] = 0
    n_none = len(perpredict.PerPredict(perchart.PerChart(none_sel)).getPrimaryDirection())
    n_d = len(perpredict.PerPredict(perchart.PerChart(only_d)).getPrimaryDirection())
    assert n_none == n_d and n_none > 0


def test_mundo_pdtype_diverges_regio_campanus():
    """pdtype=1(世俗 in mundo):Regiomontanus 与 Campanus 的行集应明显不同(Bug1 修复点)。"""
    cd = _engine_chart()
    cd['pdtype'] = 1
    r = dict(cd); r['pdMethod'] = 'regiomontanus'
    c = dict(cd); c['pdMethod'] = 'campanus'
    rows_r = perpredict.PerPredict(perchart.PerChart(r)).getPrimaryDirection()
    rows_c = perpredict.PerPredict(perchart.PerChart(c)).getPrimaryDirection()
    ar = {(x[1], x[2]): round(x[0], 4) for x in rows_r}
    ac = {(x[1], x[2]): round(x[0], 4) for x in rows_c}
    common = set(ar) & set(ac)
    diff = sum(1 for k in common if abs(ar[k] - ac[k]) > 1e-4)
    assert common and diff > 0, f'in-mundo Regio vs Campanus should diverge ({diff}/{len(common)})'


def test_truesolararc_dates_differ_from_ptolemy():
    """真太阳弧(动态钥匙)日期须与 Ptolemy 不同(Bug2 修复点);弧不变。"""
    cd = _engine_chart()
    cd['pdtype'] = 0
    pt = dict(cd); pt['pdTimeKey'] = 'Ptolemy'
    sa = dict(cd); sa['pdTimeKey'] = 'TrueSolarArc'
    rows_pt = perpredict.PerPredict(perchart.PerChart(pt)).getPrimaryDirection()
    rows_sa = perpredict.PerPredict(perchart.PerChart(sa)).getPrimaryDirection()
    dp = {(x[1], x[2]): x[4] for x in rows_pt}
    ds = {(x[1], x[2]): x[4] for x in rows_sa}
    common = set(dp) & set(ds)
    diff = sum(1 for k in common if dp[k] != ds[k])
    assert common and diff > 0, 'TrueSolarArc dates must differ from Ptolemy'
