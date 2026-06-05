import { matchBiFa, BIFA_LIST, BIFA_MATCHERS } from './LRBiFaDoc';

function ctx(o){
	return Object.assign({
		sanChuanBranches: [], sanChuanGans: [], courseBranches: [],
		xunKongBranches: [], dingHorseBranches: [], yiMaBranches: [], firstBranch: '', lastBranch: '',
		dayGan: '', dayZhi: '', dayGanBranch: '', dayGanWuXing: '', dayZhiWuXing: '',
		ke1Up: '', ke3Up: '', keUpBranches: [], guizi: '', xunHeadBranch: '',
		branchGodMap: {}, xunGanMap: {}, layout: null,
	}, o);
}
function nos(hits){ return hits.map((h)=>h.no); }
// 地盘=子..亥(顺序)，天盘可在某 index 放指定支，便于测 branchOver。
function layoutWith(upPairs){
	const downZi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
	const upZi = downZi.slice();
	Object.keys(upPairs || {}).forEach((bottom)=>{ const i = downZi.indexOf(bottom); if(i >= 0){ upZi[i] = upPairs[bottom]; } });
	return { downZi, upZi };
}

describe('LRBiFaDoc · matchBiFa A 档自动匹配（宁缺勿滥）', ()=>{
	it('BIFA_LIST 收录 100 条毕法，BIFA_MATCHERS 至少 35 个高置信判定', ()=>{
		expect(BIFA_LIST.length).toBe(100);
		expect(Object.keys(BIFA_MATCHERS).length).toBeGreaterThanOrEqual(35);
	});

	it('no.5 六阳 / no.6 六阴：四课三传全阳 / 全阴', ()=>{
		expect(nos(matchBiFa(ctx({ courseBranches: ['子', '寅', '辰', '午', '申', '戌'] })))).toContain(5);
		expect(nos(matchBiFa(ctx({ courseBranches: ['丑', '卯', '巳', '未', '酉', '亥'] })))).toContain(6);
	});

	it('no.7 旺禄临身：日禄临干上不空（甲日禄寅）', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', ke1Up: '寅', xunKongBranches: [] })))).toContain(7);
		expect(nos(matchBiFa(ctx({ dayGan: '甲', ke1Up: '寅', xunKongBranches: ['寅'] })))).not.toContain(7);
	});

	it('no.8 权摄不正：日禄临支上', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', ke3Up: '寅' })))).toContain(8);
	});

	it('no.16 空上乘空 / no.74 空空如也 / no.82 不行传', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '亥', xunKongBranches: ['亥'], branchGodMap: { '亥': '天空' } })))).toContain(16);
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['亥', '戌', '酉'], xunKongBranches: ['亥', '戌', '酉'] })))).toContain(74);
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['寅', '亥', '戌'], xunKongBranches: ['亥', '戌'] })))).toContain(82);
	});

	it('no.23 彼求我 / no.24 我求彼', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '午', lastBranch: '子', ke1Up: '子', ke3Up: '午' })))).toContain(23);
		expect(nos(matchBiFa(ctx({ firstBranch: '子', lastBranch: '午', ke1Up: '子', ke3Up: '午' })))).toContain(24);
	});

	it('no.25/26 金水日逢丁；no.42 三奇', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '庚', dingHorseBranches: ['卯'], courseBranches: ['卯'] })))).toContain(25);
		expect(nos(matchBiFa(ctx({ sanChuanGans: ['甲', '戊', '庚'] })))).toContain(42);
	});

	it('no.31 三传递生 / no.32 三传递克', ()=>{
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['辰', '申', '子'], dayGan: '甲' })))).toContain(31);
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['子', '午', '申'], dayGan: '甲' })))).toContain(32);
	});

	it('no.33 有始无终：初传干长生(甲长生亥)、末传干墓(木墓未)', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayGanWuXing: '木', firstBranch: '亥', lastBranch: '未' })))).toContain(33);
	});

	it('no.41 富贵禄马：干上支马(午马申)、支上干禄(甲禄寅)', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '午', ke1Up: '申', ke3Up: '寅' })))).toContain(41);
	});

	it('no.47 贵虽在狱 / no.48 鬼乘天乙', ()=>{
		expect(nos(matchBiFa(ctx({ guizi: '辰', dayGan: '乙' })))).toContain(47);
		expect(nos(matchBiFa(ctx({ guizi: '申', dayGan: '甲' })))).toContain(48); // 申金克甲木
	});

	it('no.51 魁度天门：戌加亥发用', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '戌', layout: layoutWith({ '亥': '戌' }) })))).toContain(51);
	});

	it('no.52 罡塞鬼户：辰加寅', ()=>{
		expect(nos(matchBiFa(ctx({ layout: layoutWith({ '寅': '辰' }) })))).toContain(52);
	});

	it('no.63 彼此全伤 / no.64 夫妇芜淫', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '寅', ke1Up: '申', ke3Up: '酉' })))).toContain(63);
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '寅', ke1Up: '酉', ke3Up: '申' })))).toContain(64);
	});

	it('no.88 墓覆日辰 / no.91 虎临干鬼', ()=>{
		expect(nos(matchBiFa(ctx({ dayGanWuXing: '木', dayZhiWuXing: '火', ke1Up: '未', ke3Up: '戌' })))).toContain(88);
		expect(nos(matchBiFa(ctx({ dayGan: '甲', ke1Up: '申', branchGodMap: { '申': '白虎' } })))).toContain(91);
	});

	it('no.69 虎乘遁鬼：白虎临支遁干克日干', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', branchGodMap: { '申': '白虎' }, xunGanMap: { '申': '庚' } })))).toContain(69);
	});

	it('空 / 缺字段 context 不抛错、不误命中', ()=>{
		expect(matchBiFa(null)).toEqual([]);
		expect(matchBiFa(ctx({}))).toEqual([]);
	});
});
