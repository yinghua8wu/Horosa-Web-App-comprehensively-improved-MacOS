import { randomStr, } from './helper';

// v9 — P0 主限法方位+时间补全（新增 Placidus 方位法 + 6 个静态 timeKey 全集）。
// 升 SYNC_REV 强制旧 v8 持久化的 chart 在 needsPdRecompute 时回收重算。
export const PD_SYNC_REV = 'pd_method_sync_v9';
export const DEFAULT_PD_METHOD = 'core_alchabitius';
export const DEFAULT_PD_TIME_KEY = 'Ptolemy';
export const DEFAULT_PD_TYPE = 0;

// 与后端 perpredict._PD_METHOD_REGISTRY 同步的方位法白名单。未识别 method 在
// 后端会 fallback 到 core_alchabitius（护住默认 Alcabitius+Ptolemy 字节级一致）。
export const SUPPORTED_PD_METHODS = ['core_alchabitius', 'horosa_legacy', 'placidus'];

// 与后端 perpredict.STATIC_TIME_KEY_SCALES 同步的时间换算白名单。
// 只收录有明确天文定义(公式)的 key：Ptolemy(1°RA/年)、Naibod(0°59'08" 太阳平均日动)。
// 其余 key(Brahe/Placidus 动态/中点等)留后续批次按公式实现,不放经验值。
export const SUPPORTED_PD_TIME_KEYS = [
	'Ptolemy', 'Naibod',
];

// 方位法 / 时间换算的中文 label 字典 — 用于 UI 显示 + AI 导出 + 储存。
// 新加方位法时同步扩此表，避免散落在多处硬编码。
export const PD_METHOD_LABELS = {
	core_alchabitius: 'Alchabitius',
	placidus: 'Placidus',
	horosa_legacy: 'Horosa原方法',
};
export const PD_TIME_KEY_LABELS = {
	Ptolemy: 'Ptolemy',
	Naibod: 'Naibod',
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
			pdtype: DEFAULT_PD_TYPE,
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
