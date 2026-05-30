import moment from 'moment';
import * as AstroConst from '../constants/AstroConst';
import * as AstroText from '../constants/AstroText';

// Balbillus 法（时间主）：与 129 年系统同结构（七政小年→主限+子限），但各行星期按「距旺度的度数」削减。
// Schmidt：129 系统是本法的理想化版本。**始终用 Hellenistic 年(360日)/月(30日)。** 独立引擎，不碰 decennials.js。
// 削减标度 k 为实验性（参考资料「circular period in days per degree」口径不一），待 core 实测校准。
const HELLENISTIC_YEAR_DAYS = 360;

// 各行星小年（年）——同 129 系统。Σ = 129。
export const BALBILLUS_MINOR_YEARS = {
	[AstroConst.SUN]: 19,
	[AstroConst.MOON]: 25,
	[AstroConst.SATURN]: 30,
	[AstroConst.JUPITER]: 12,
	[AstroConst.MARS]: 15,
	[AstroConst.VENUS]: 8,
	[AstroConst.MERCURY]: 20,
};

// 主限/子限行进序列（同 129，实验性待校）。
const SEQUENCE = [
	AstroConst.SUN, AstroConst.MOON, AstroConst.SATURN, AstroConst.JUPITER,
	AstroConst.MARS, AstroConst.VENUS, AstroConst.MERCURY,
];
const SEQ_LEN = SEQUENCE.length;

// 各行星旺度（绝对黄经）：日19°白羊 月3°金牛 水15°室女 金27°双鱼 火28°摩羯 木15°巨蟹 土21°天秤。
const EXALT_LON = {
	[AstroConst.SUN]: 19,
	[AstroConst.MOON]: 33,
	[AstroConst.MERCURY]: 165,
	[AstroConst.VENUS]: 357,
	[AstroConst.MARS]: 298,
	[AstroConst.JUPITER]: 105,
	[AstroConst.SATURN]: 201,
};

export const BALBILLUS_DEFAULT_K = 0.5;

function angDist(a, b){
	let d = Math.abs((((a - b) % 360) + 360) % 360);
	return d > 180 ? 360 - d : d;
}

function parseBirthMoment(chartObj){
	const p = (chartObj && chartObj.params) ? chartObj.params : {};
	const birth = `${p.birth || ''}`.trim();
	if(!birth){ return null; }
	const m = moment(birth.replace(/\//g, '-'), ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD']);
	return m.isValid() ? m : null;
}

function natalLon(chartObj, id){
	const chart = (chartObj && chartObj.chart) ? chartObj.chart : {};
	const objects = Array.isArray(chart.objects) ? chart.objects : [];
	const o = objects.find((x) => x.id === id);
	if(!o){ return null; }
	if(o.lon !== undefined && o.lon !== null){ return Number(o.lon); }
	const idx = AstroConst.LIST_SIGNS.indexOf(o.sign);
	if(idx >= 0 && o.signlon !== undefined && o.signlon !== null){ return idx * 30 + Number(o.signlon); }
	return null;
}

function rotate(list, start){
	const i = list.indexOf(start);
	if(i <= 0){ return list.slice(); }
	return list.slice(i).concat(list.slice(0, i));
}

// 各行星削减后小年：reduced = base * (1 - k * dist/180)，下限 0.5 年。
export function computeBalbillusYears(chartObj, kFrac = BALBILLUS_DEFAULT_K){
	const k = Number.isFinite(kFrac) ? kFrac : BALBILLUS_DEFAULT_K;
	const result = {};
	SEQUENCE.forEach((p) => {
		const lon = natalLon(chartObj, p);
		const dist = (lon !== null && EXALT_LON[p] !== undefined) ? angDist(lon, EXALT_LON[p]) : 0;
		result[p] = Math.max(0.5, BALBILLUS_MINOR_YEARS[p] * (1 - k * (dist / 180)));
	});
	return result;
}

// 从出生起、按 sect 起始(日昼/月夜)、SEQUENCE 序铺开；每主限期(削减后)等分 7 段子限。360 日年换算。
export function buildBalbillus(chartObj, kFrac = BALBILLUS_DEFAULT_K){
	const birth = parseBirthMoment(chartObj);
	const isDiurnal = !!(chartObj && chartObj.chart && chartObj.chart.isDiurnal);
	const startPlanet = isDiurnal ? AstroConst.SUN : AstroConst.MOON;
	const order = rotate(SEQUENCE, startPlanet);
	const years = computeBalbillusYears(chartObj, kFrac);
	const rows = [];
	let cursor = birth ? birth.clone() : null;
	order.forEach((p) => {
		const redYears = years[p];
		const subAvgDays = (redYears / SEQ_LEN) * HELLENISTIC_YEAR_DAYS;
		const subs = [];
		let j = SEQUENCE.indexOf(p);
		for(let k = 0; k < SEQ_LEN; k++){
			subs.push({ subDirect: SEQUENCE[j], date: cursor ? cursor.format('YYYY-MM-DD') : '' });
			if(cursor){ cursor = cursor.clone().add(Math.round(subAvgDays), 'days'); }
			j = (j + 1) % SEQ_LEN;
		}
		rows.push({
			mainDirect: p,
			baseYears: BALBILLUS_MINOR_YEARS[p],
			redYears: Math.round(redYears * 100) / 100,
			subDirect: subs,
		});
	});
	return { rows, startPlanet, kFrac, isDiurnal };
}

function planetTxt(id){
	if(id === undefined || id === null || id === ''){ return '-'; }
	return AstroText.AstroTxtMsg[id] || `${id}`;
}

export function buildBalbillusSnapshotText(chartObj){
	if(!chartObj){ return ''; }
	const { rows } = buildBalbillus(chartObj);
	if(!rows || !rows.length){ return ''; }
	const lines = [];
	lines.push('[Balbillus]');
	lines.push('129 年系统的旺距削减变体：各行星小年按距旺度削减后铺开主限+子限（Hellenistic 360 日年）。（k 标度实验性，待校准）');
	lines.push('');
	lines.push('| 主限 | 子限 | 日期 |');
	lines.push('| --- | --- | --- |');
	rows.forEach((main) => {
		const subs = Array.isArray(main.subDirect) ? main.subDirect : [];
		if(subs.length === 0){
			lines.push(`| ${planetTxt(main.mainDirect)}(${main.baseYears}→${main.redYears}年) | - | - |`);
			return;
		}
		subs.forEach((sub, i) => {
			const mainLabel = i === 0 ? `${planetTxt(main.mainDirect)}(${main.baseYears}→${main.redYears}年)` : planetTxt(main.mainDirect);
			lines.push(`| ${mainLabel} | ${planetTxt(sub.subDirect)} | ${sub.date || '-'} |`);
		});
	});
	return lines.join('\n');
}
