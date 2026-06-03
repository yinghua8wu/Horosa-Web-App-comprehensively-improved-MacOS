import { randomStr, } from './helper';

// v10 — P1 主限法全面建成（新增 Regiomontanus / Campanus / Topocentric 方位法,
// 走自研 pd_engine 通用引擎；placidus 升级为精确半弧）。升 SYNC_REV 强制旧持久化 chart 回收重算。
export const PD_SYNC_REV = 'pd_method_sync_v10';
export const DEFAULT_PD_METHOD = 'core_alchabitius';
export const DEFAULT_PD_TIME_KEY = 'Ptolemy';
export const DEFAULT_PD_TYPE = 0;

// 与后端 perpredict._PD_METHOD_REGISTRY 同步的方位法白名单。未识别 method 在
// 后端会 fallback 到 core_alchabitius（护住默认 Alcabitius+Ptolemy 字节级一致）。
export const SUPPORTED_PD_METHODS = [
	'core_alchabitius', 'horosa_legacy', 'placidus',
	'regiomontanus', 'campanus', 'topocentric',
];

// 与后端时间换算同步的白名单。只收录有明确天文定义(公式/真算法)的 key:
//   Ptolemy(1°RA/年)、Naibod(0°59'08" 太阳平均日动)= 静态;
//   TrueSolarArc(真太阳弧,Placidus key)= 动态,逐弧查星历(真算法)。
export const SUPPORTED_PD_TIME_KEYS = [
	'Ptolemy', 'Naibod', 'TrueSolarArc',
];

// 方位法 / 时间换算的中文 label 字典 — 用于 UI 显示 + AI 导出 + 储存。
// 新加方位法时同步扩此表，避免散落在多处硬编码。
export const PD_METHOD_LABELS = {
	core_alchabitius: 'Alchabitius',
	placidus: 'Placidus（半弧）',
	regiomontanus: 'Regiomontanus',
	campanus: 'Campanus',
	topocentric: 'Topocentric',
	horosa_legacy: 'Horosa原方法',
};
export const PD_TIME_KEY_LABELS = {
	Ptolemy: 'Ptolemy',
	Naibod: 'Naibod',
	TrueSolarArc: '真太阳弧',
};

export function getPdMethodLabel(value){
	if(value && PD_METHOD_LABELS[value]){
		return PD_METHOD_LABELS[value];
	}
	return PD_METHOD_LABELS[DEFAULT_PD_METHOD];
}

export function getPdTimeKeyLabel(value){
	if(value && PD_TIME_KEY_LABELS[value]){
		return PD_TIME_KEY_LABELS[value];
	}
	return PD_TIME_KEY_LABELS[DEFAULT_PD_TIME_KEY];
}
const VALID_DIRECTION_SUB_TABS = new Set([
	'primarydirect',
	'primarydirchart',
	'firdaria',
	'profection',
	'solararc',
	'solarreturn',
	'lunarreturn',
	'givenyear',
	'decennials',
	'zodialrelease',
	'planetaryages',
	'vedicprog',
	'jaynesprog',
	'planetaryarc',
	'persiandirected',
	'yearsystem129',
	'balbillus',
	'ephemeris',
	'progressions',
	'returntimeline',
	'distributions',
	'agepoint',
]);

export function normalizePrimaryDirectionSubTabKey(key){
	return VALID_DIRECTION_SUB_TABS.has(key)
		? key
		: 'primarydirect';
}

export function mergePrimaryDirectionChartObj(chartObj, options = {}){
	const {
		pdRows,
		showPdBounds,
		pdMethod,
		pdTimeKey,
		pdtype,
		pdDirect,
		pdConverse,
		pdAntiscia,
		pdTerms,
		name,
		pos,
		chartId,
	} = options;
	const nextChartId = chartId === undefined ? randomStr(8) : chartId;
	return {
		...(chartObj || {}),
		params: {
			...((chartObj && chartObj.params) || {}),
			...(name !== undefined ? { name, } : {}),
			...(pos !== undefined ? { pos, } : {}),
			showPdBounds: showPdBounds === 0 ? 0 : 1,
			pdtype: pdtype === 1 ? 1 : DEFAULT_PD_TYPE,
			// 顺逆默认都开(用户偏好):仅显式 0 才关。
			pdDirect: pdDirect === 0 ? 0 : 1,
			pdConverse: pdConverse === 0 ? 0 : 1,
			pdAntiscia: pdAntiscia ? 1 : 0,
			pdTerms: pdTerms ? 1 : 0,
			pdMethod: pdMethod || DEFAULT_PD_METHOD,
			pdTimeKey: pdTimeKey || DEFAULT_PD_TIME_KEY,
			pdSyncRev: PD_SYNC_REV,
		},
		predictives: {
			...((chartObj && chartObj.predictives) || {}),
			primaryDirection: Array.isArray(pdRows) ? pdRows : [],
		},
		...(nextChartId ? { chartId: nextChartId, } : {}),
	};
}
