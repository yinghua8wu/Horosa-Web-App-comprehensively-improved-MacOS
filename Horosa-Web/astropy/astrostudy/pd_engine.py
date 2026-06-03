# -*- coding: utf-8 -*-
"""
pd_engine.py — 主限法(primary directions)通用推运引擎(自研)。

设计:
  1) 通用数值法(universal numerical method),建在 swisseph 的 swe.house_pos() 之上 ——
     它对 Placidus / Regiomontanus / Campanus / Topocentric 四种位置框架都能给出任意点的
     「世俗位置(mundane position)」,推运 = 在「转动天球(改 ARMC)」上对世俗位置求根。
     这是各闭式的「地面真值」。
  2) 各系统的闭式公式(closed forms),用基础球面三角直接算(向四轴 / 半弧 /
     Regiomontanus 位置圈 / Campanus(=Regio body→body) / Topocentric 极)。
  3) 时间钥匙:Ptolemy / Naibod / Cardan / Placidus(真太阳弧,逐盘动态)。
  4) 允星扩展:黄道相位 / 世俗相位 / 映点 antiscia / 界 terms。

约定:
  * 角度一律用「度」。
  * 弧 arc > 0 = direct(顺周日运动,promissor 前向到达 significator);arc < 0 = converse。
  * 时角 H = RAMC - RA(向西为正)。

依赖:swisseph(pyswisseph)。纯球面三角 + swisseph 原语,不依赖具体星历数据文件。
"""

import math

import swisseph

DEG = math.pi / 180.0


# ---------------------------------------------------------------------------
# 角度工具
# ---------------------------------------------------------------------------
def norm360(x):
    return x % 360.0


def norm180(x):
    return (x + 180.0) % 360.0 - 180.0


def sind(x):
    return math.sin(x * DEG)


def cosd(x):
    return math.cos(x * DEG)


def tand(x):
    return math.tan(x * DEG)


def asind(x):
    return math.degrees(math.asin(max(-1.0, min(1.0, x))))


def acosd(x):
    return math.degrees(math.acos(max(-1.0, min(1.0, x))))


def atand(x):
    return math.degrees(math.atan(x))


def atan2d(y, x):
    return math.degrees(math.atan2(y, x))


# ---------------------------------------------------------------------------
# 1. 基础球面天文学(所有方法共用的积木)
# ---------------------------------------------------------------------------
def ecl_to_eq(lon, lat, eps):
    """黄道(lon,lat) -> 赤道(RA, dec)。zodiacal 方向时传 lat=0。"""
    ra = atan2d(sind(lon) * cosd(eps) - tand(lat) * sind(eps), cosd(lon))
    dec = asind(sind(lat) * cosd(eps) + cosd(lat) * sind(eps) * sind(lon))
    return norm360(ra), dec


def ascensional_difference(dec, phi):
    """AD = asin(tan phi * tan dec);拱极点 clamp。"""
    v = tand(phi) * tand(dec)
    if v >= 1.0:
        return 90.0
    if v <= -1.0:
        return -90.0
    return asind(v)


def semiarc(dec, phi, diurnal=True):
    """昼半弧 DSA = 90 + AD;夜半弧 NSA = 90 - AD。"""
    ad = ascensional_difference(dec, phi)
    return (90.0 + ad) if diurnal else (90.0 - ad)


def hour_angle(ra, ramc):
    """时角 H = RAMC - RA(向西为正),归一到 ±180。"""
    return norm180(ramc - ra)


def meridian_distance(ra, ramc):
    """上子午距 MD = RA - RAMC(= -H),归一到 ±180。"""
    return norm180(ra - ramc)


def is_above_horizon(ra, dec, ramc, phi):
    """|H| < 昼半弧 则在地平之上。"""
    return abs(hour_angle(ra, ramc)) < semiarc(dec, phi, True)


def relevant_semiarc(ra, dec, ramc, phi):
    """该点当前所在的半弧(在地平上用昼半弧,否则夜半弧)。"""
    return semiarc(dec, phi, is_above_horizon(ra, dec, ramc, phi))


# ---------------------------------------------------------------------------
# 2. 通用数值法(地面真值):建在 swe.house_pos 之上
# ---------------------------------------------------------------------------
HSYS = {'placidus': b'P', 'regiomontanus': b'R', 'campanus': b'C', 'topocentric': b'T'}


def mundane_pos(lon, lat, armc, phi, eps, system):
    """任意点在指定系统下的「世俗位置」,连续化为 0..360 的房屋经度。"""
    hp = swisseph.house_pos(armc, phi, eps, (lon, lat), HSYS[system])  # 1.0 .. 13.0
    return norm360((hp - 1.0) * 30.0)


def _find_roots(f, span, step):
    """扫描 [-span, span] 找 f 的符号变化并二分;跳过 ±180 的 wrap 跳变。"""
    roots = []
    d0 = -span
    f0 = f(d0)
    n = int(2 * span / step)
    for i in range(1, n + 1):
        d1 = -span + i * step
        f1 = f(d1)
        if f0 == 0.0:
            roots.append(d0)
        elif f0 * f1 < 0 and abs(f1 - f0) < 90:  # 跳过 wrap
            a, b, fa = d0, d1, f0
            for _ in range(60):
                mid = 0.5 * (a + b)
                fm = f(mid)
                if fa * fm <= 0:
                    b = mid
                else:
                    a, fa = mid, fm
            roots.append(0.5 * (a + b))
        d0, f0 = d1, f1
    return roots


def arc_numerical(sig, prom, ramc, phi, eps, system,
                  zodiacal=False, prefer='principal', aspect=0.0, span=179.0, step=0.5):
    """
    通用数值推运:求弧 D 使 promissor(转动 D 后)的世俗位置 == significator 本命世俗位置 + aspect。
    sig/prom = {'lon':.., 'lat':..}。返回 (arc, None) 或 (None, msg)。
    D>0 = direct;D<0 = converse。aspect: 世俗相位偏移(度,在房屋经度空间);0=合。
    prefer: 'principal'(|D|最小)/ 'direct'(最小正根)/ 'converse'(最接近 0 的负根)。
    """
    s_lat = 0.0 if zodiacal else sig['lat']
    p_lat = 0.0 if zodiacal else prom['lat']
    target = norm360(mundane_pos(sig['lon'], s_lat, ramc, phi, eps, system) + aspect)

    def f(d):
        m = mundane_pos(prom['lon'], p_lat, norm360(ramc + d), phi, eps, system)
        return norm180(m - target)

    roots = _find_roots(f, span, step)
    if not roots:
        return None, "no root in span"
    if prefer == 'direct':
        pos = [r for r in roots if r > 1e-6]
        return (min(pos), None) if pos else (None, "no direct root")
    if prefer == 'converse':
        neg = [r for r in roots if r < -1e-6]
        return (max(neg), None) if neg else (None, "no converse root")
    return (min(roots, key=abs), None)  # principal


# ---------------------------------------------------------------------------
# 3. 闭式公式
# ---------------------------------------------------------------------------
def arc_to_angle(prom, ramc, phi, eps, angle, zodiacal=False):
    """向四轴(系统无关)。"""
    ra, dec = ecl_to_eq(prom['lon'], 0.0 if zodiacal else prom['lat'], eps)
    ad = ascensional_difference(dec, phi)
    angle = angle.upper()
    if angle == 'MC':
        val, target = ra, ramc
    elif angle == 'IC':
        val, target = ra, norm360(ramc + 180)
    elif angle == 'ASC':
        val, target = norm360(ra - ad), norm360(ramc + 90)  # OA
    elif angle == 'DESC':
        val, target = norm360(ra + ad), norm360(ramc - 90)  # OD
    else:
        raise ValueError(angle)
    return norm180(val - target)


def arc_placidus(sig, prom, ramc, phi, eps, zodiacal=False):
    """半弧法(比例式,body->body)。"""
    ra_s, dec_s = ecl_to_eq(sig['lon'], 0.0 if zodiacal else sig['lat'], eps)
    ra_p, dec_p = ecl_to_eq(prom['lon'], 0.0 if zodiacal else prom['lat'], eps)
    md_s = meridian_distance(ra_s, ramc)
    md_p = meridian_distance(ra_p, ramc)
    sa_s = relevant_semiarc(ra_s, dec_s, ramc, phi)
    sa_p = relevant_semiarc(ra_p, dec_p, ramc, phi)
    prop = md_s / sa_s if sa_s else 0.0
    return norm180(md_p - prop * sa_p)


def arc_under_pole(sig, prom, ramc, phi, eps, pole_func, zodiacal=False):
    """「在极下(under the pole)」通用骨架:arc = OA_P(pole) - OA_S(pole)。"""
    ra_s, dec_s = ecl_to_eq(sig['lon'], 0.0 if zodiacal else sig['lat'], eps)
    ra_p, dec_p = ecl_to_eq(prom['lon'], 0.0 if zodiacal else prom['lat'], eps)
    p = pole_func(ra_s, dec_s, ramc, phi)
    oa_s = ra_s - asind(tand(p) * tand(dec_s))
    oa_p = ra_p - asind(tand(p) * tand(dec_p))
    return norm180(oa_p - oa_s)


def pole_regiomontanus(ra, dec, ramc, phi):
    """真位置圈(过点与地平南北点)。body->body 等价于 Campanus。"""
    h = hour_angle(ra, ramc)
    h_e = atan2d(sind(h), cosd(h) + tand(phi) * tand(dec))
    ad_pole = norm180(h_e - h)
    if abs(dec) < 1e-9:
        return 0.0
    return atand(sind(ad_pole) / tand(dec))


def pole_topocentric(ra, dec, ramc, phi):
    """Topocentric(Polich-Page):tan p = (MD/SA)·tan phi。"""
    h = hour_angle(ra, ramc)
    sa = relevant_semiarc(ra, dec, ramc, phi)
    return atand((h / sa if sa else 0.0) * tand(phi))


def arc_regiomontanus(sig, prom, ramc, phi, eps, zodiacal=False):
    return arc_under_pole(sig, prom, ramc, phi, eps, pole_regiomontanus, zodiacal)


def arc_campanus(sig, prom, ramc, phi, eps, zodiacal=False):
    # body->body 与 Regiomontanus 重合;世俗相位才分叉(数值法处理)。
    return arc_under_pole(sig, prom, ramc, phi, eps, pole_regiomontanus, zodiacal)


def arc_topocentric(sig, prom, ramc, phi, eps, zodiacal=False):
    return arc_under_pole(sig, prom, ramc, phi, eps, pole_topocentric, zodiacal)


CLOSED = {
    'placidus': arc_placidus,
    'regiomontanus': arc_regiomontanus,
    'campanus': arc_campanus,
    'topocentric': arc_topocentric,
}


# ---------------------------------------------------------------------------
# 4. 时间钥匙:arc(°) -> 年
# ---------------------------------------------------------------------------
NAIBOD_RATE = 360.0 / 365.2422  # ≈ 0.985647 °/年(太阳平均日行)


def key_ptolemy(arc):
    return arc


def key_naibod(arc):
    return arc / NAIBOD_RATE


def key_cardan(arc):
    return arc / NAIBOD_RATE  # 经典变体,量级同 Naibod


def _sun_ra(jd):
    return swisseph.calc_ut(jd, swisseph.SUN, swisseph.FLG_EQUATORIAL)[0][0]


def key_placidus_true_solar_arc(arc, natal_jd):
    """真太阳弧:把 arc 加到本命太阳赤经,求真太阳走到该赤经的天数;1 天 = 1 年。"""
    ra0 = _sun_ra(natal_jd)
    target = ra0 + arc

    def acc_ra(days):
        ra = _sun_ra(natal_jd + days)
        k = round((target - ra) / 360.0)
        return ra + 360.0 * k

    d0, d1 = arc * 0.98, arc * 1.05 + 0.5
    f0 = acc_ra(d0) - target
    f1 = acc_ra(d1) - target
    for _ in range(60):
        if abs(f1 - f0) < 1e-12:
            break
        d2 = d1 - f1 * (d1 - d0) / (f1 - f0)
        d0, f0 = d1, f1
        d1, f1 = d2, acc_ra(d2) - target
        if abs(f1) < 1e-9:
            break
    return d1


def solar_arc_for_years(years, natal_jd):
    """真太阳弧的逆:给定流逝年数,求该旋转对应的赤经弧(度)。
    主限法「盘」用(date→弧);与 key_placidus_true_solar_arc(弧→年)互逆,确保盘与表格对 TrueSolarArc 一致。"""
    ra0 = _sun_ra(natal_jd)
    ra1 = _sun_ra(natal_jd + float(years))
    arc = ra1 - ra0
    # 连续化到最接近 years 的等价值,消除 ±360 wrap(太阳日行≈1°,arc≈years)。
    k = round((float(years) - arc) / 360.0)
    return arc + 360.0 * k


KEYS = {'ptolemy': key_ptolemy, 'naibod': key_naibod, 'cardan': key_cardan}


def arc_to_years(arc, key='ptolemy', natal_jd=None):
    if key == 'placidus':
        return key_placidus_true_solar_arc(arc, natal_jd)
    return KEYS.get(key, key_ptolemy)(arc)


# ---------------------------------------------------------------------------
# 5. 允星扩展:相位 / 映点 / 界
# ---------------------------------------------------------------------------
def zodiacal_aspect_point(prom_lon, aspect_deg, sign=+1):
    """黄道相位点:promissor 黄经 ± 相位角处的虚点(弃黄纬)。"""
    return {'lon': norm360(prom_lon + sign * aspect_deg), 'lat': 0.0}


def antiscion(lon):
    return norm360(180.0 - lon)


def contra_antiscion(lon):
    return norm360(360.0 - lon)


# 埃及界 Egyptian terms(每宫 5 段的起始度)。
EGYPTIAN_TERMS = {
    0: [('Jup', 0), ('Ven', 6), ('Mer', 12), ('Mar', 20), ('Sat', 25)],
    1: [('Ven', 0), ('Mer', 8), ('Jup', 14), ('Sat', 22), ('Mar', 27)],
    2: [('Mer', 0), ('Jup', 6), ('Ven', 12), ('Mar', 17), ('Sat', 24)],
    3: [('Mar', 0), ('Ven', 7), ('Mer', 13), ('Jup', 19), ('Sat', 26)],
    4: [('Jup', 0), ('Ven', 6), ('Sat', 11), ('Mer', 18), ('Mar', 24)],
    5: [('Mer', 0), ('Ven', 7), ('Jup', 17), ('Mar', 21), ('Sat', 28)],
    6: [('Sat', 0), ('Mer', 6), ('Jup', 14), ('Ven', 21), ('Mar', 28)],
    7: [('Mar', 0), ('Ven', 7), ('Mer', 11), ('Jup', 19), ('Sat', 24)],
    8: [('Jup', 0), ('Ven', 12), ('Mer', 17), ('Sat', 21), ('Mar', 26)],
    9: [('Mer', 0), ('Jup', 7), ('Ven', 14), ('Sat', 22), ('Mar', 26)],
    10: [('Mer', 0), ('Ven', 7), ('Jup', 13), ('Mar', 20), ('Sat', 25)],
    11: [('Ven', 0), ('Jup', 12), ('Mer', 16), ('Mar', 19), ('Sat', 28)],
}


def term_boundaries():
    """所有界的边界黄经 -> [(ruler, sign, start_lon), ...]。"""
    out = []
    for sign, rows in EGYPTIAN_TERMS.items():
        for ruler, start in rows:
            out.append((ruler, sign, norm360(sign * 30 + start)))
    return out


# ---------------------------------------------------------------------------
# 6. 弧分发(按方位法选闭式;数值法供世俗相位/校验)
# ---------------------------------------------------------------------------
def arc_for_method(sig, prom, ramc, phi, eps, method, zodiacal=False):
    """按方位法算 body->body(或黄道相位点)的弧。闭式优先(快且已验证)。"""
    fn = CLOSED.get(method)
    if fn is None:
        return None
    try:
        return fn(sig, prom, ramc, phi, eps, zodiacal=zodiacal)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# 7. 主限法表格生成(产出 Horosa pdlist 行 [arc, prom_id, sig_id, cat])
# ---------------------------------------------------------------------------
SUPPORTED_METHODS = ('placidus', 'regiomontanus', 'campanus', 'topocentric')
ANGLE_NAMES = {'Asc': 'ASC', 'MC': 'MC', 'Desc': 'DESC', 'IC': 'IC'}
TERM_RULER_FULL = {'Jup': 'Jupiter', 'Ven': 'Venus', 'Mer': 'Mercury',
                   'Mar': 'Mars', 'Sat': 'Saturn'}


def _direction_arc(method, sig, prom_pt, ramc, phi, eps, zodiacal, converse,
                   is_angle, angle_name, mund_aspect, max_arc):
    """
    单条 direction 的弧。
      converse=False → **顺向 direct**:promissor 顺周日运动到 significator,取**正弧** (arc>0)。
      converse=True  → **逆向 converse**:promissor 反向到 significator,取**负弧** (arc<0)。
    每个 (significator, promissor 点) 在射程内只有一个根(合相/相位点 = 一次穿越),其符号即决定 direct/converse。
    黄道合相走闭式(快,已验证),按符号筛(direct 留正、converse 留负);世俗/相位走数值法,用方向性 prefer。
    与已验证自研引擎 内部函数(mode='direct'→prefer='direct' / 'converse_modern'→prefer='converse') 同口径。
    """
    if zodiacal and abs(mund_aspect) < 1e-9:
        # 闭式给出带符号 principal(合相在 360° 内仅一根),按方向符号筛。
        if is_angle:
            arc = arc_to_angle(prom_pt, ramc, phi, eps, angle_name, zodiacal=True)
        else:
            arc = arc_for_method(sig, prom_pt, ramc, phi, eps, method, zodiacal=True)
        if arc is None:
            return None
        if converse:
            return arc if arc < 0 else None   # 逆向:只要负弧根
        return arc if arc > 0 else None        # 顺向:只要正弧根
    # 世俗(in mundo)/世俗相位:数值法 + 方向性 prefer(direct=最小正根,converse=最接近0的负根)。
    prefer = 'converse' if converse else 'direct'
    span = min(179.0, float(max_arc) + 10.0)
    a, _ = arc_numerical(sig, prom_pt, ramc, phi, eps, method,
                         zodiacal=zodiacal, aspect=mund_aspect, prefer=prefer,
                         span=span, step=1.0)
    return a


def build_directions(bodies, angles, ramc, phi, eps, method,
                     significators, promissors, aspects=(0, 60, 90, 120, 180),
                     max_arc=100.0, zodiacal=True, converse=False,
                     include_antiscia=False, include_terms=False):
    """
    主限法表格:对 {significator} × {promissor 本体 + 相位(+映点/界)} 算弧,产出 Horosa pdlist 行。
      bodies:  {name: {'lon':, 'lat':}}(行星/虚点),name 用 flatlib const 名。
      angles:  {name: lon}(Asc/MC/Desc/IC,lat=0)。
      zodiacal: True=黄道向运(in zodiaco,弃黄纬,相位为黄道点);False=世俗向运(in mundo,带黄纬,相位在房屋空间——此处 Regio≠Campanus)。
      converse: True=逆向(promissor 反向到 significator);False=顺向。
      返回 [[arc, prom_id, sig_id, cat], ...](cat='Z'/'M';无日期,由 appendDateStr 补)。
      ID:prom='<N|D|S>_<body>_<aspect>' / '<A|C>_<body>_0'(映点/反映点) / 'T_<ruler>_<lon>'(界);sig='N_<name>_0'。
    """
    if method not in CLOSED:
        return []
    rows = []
    cat = 'Z' if zodiacal else 'M'
    for sname in significators:
        is_angle = sname in ANGLE_NAMES
        angle_name = ANGLE_NAMES.get(sname)
        if is_angle:
            if sname not in angles:
                continue
            sig = {'lon': angles[sname], 'lat': 0.0}
        elif sname in bodies:
            sig = {'lon': bodies[sname]['lon'],
                   'lat': 0.0 if zodiacal else bodies[sname].get('lat', 0.0)}
        else:
            continue
        sig_id = 'N_%s_0' % sname
        # 本体 + 相位
        for pname in promissors:
            if pname not in bodies:
                continue
            base = bodies[pname]
            for asp in aspects:
                combos = [(0, 'N')] if asp == 0 else [(1, 'D'), (-1, 'S')]
                for sgn, prefix in combos:
                    if zodiacal:
                        prom_pt = ({'lon': base['lon'], 'lat': 0.0} if asp == 0
                                   else zodiacal_aspect_point(base['lon'], asp, sgn))
                        mund_aspect = 0.0
                    else:
                        prom_pt = {'lon': base['lon'], 'lat': base.get('lat', 0.0)}
                        mund_aspect = float(sgn * asp)
                    arc = _direction_arc(method, sig, prom_pt, ramc, phi, eps, zodiacal,
                                         converse, is_angle, angle_name, mund_aspect, max_arc)
                    if arc is None or abs(arc) < 1e-9 or abs(arc) > max_arc:
                        continue
                    rows.append([arc, '%s_%s_%d' % (prefix, pname, asp), sig_id, cat])
        # 映点 / 反映点(作黄道合相点)
        if include_antiscia:
            for pname in promissors:
                if pname not in bodies:
                    continue
                for fn, pre in ((antiscion, 'A'), (contra_antiscion, 'C')):
                    prom_pt = {'lon': fn(bodies[pname]['lon']), 'lat': 0.0}
                    arc = _direction_arc(method, sig, prom_pt, ramc, phi, eps, True,
                                         converse, is_angle, angle_name, 0.0, max_arc)
                    if arc is None or abs(arc) < 1e-9 or abs(arc) > max_arc:
                        continue
                    rows.append([arc, '%s_%s_0' % (pre, pname), sig_id, cat])
        # 界(terms)边界(作黄道合相点)
        if include_terms:
            for ruler, sgn_idx, lon in term_boundaries():
                prom_pt = {'lon': lon, 'lat': 0.0}
                arc = _direction_arc(method, sig, prom_pt, ramc, phi, eps, True,
                                     converse, is_angle, angle_name, 0.0, max_arc)
                if arc is None or abs(arc) < 1e-9 or abs(arc) > max_arc:
                    continue
                rname = TERM_RULER_FULL.get(ruler, ruler)
                rows.append([arc, 'T_%s_%d' % (rname, int(round(lon))), sig_id, cat])
    rows.sort(key=lambda r: (abs(r[0]), r[0], r[1], r[2]))
    return rows
