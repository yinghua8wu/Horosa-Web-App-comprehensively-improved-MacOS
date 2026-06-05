import { matchBiFa, BIFA_LIST } from './LRBiFaDoc';

function ctx(o){
	return Object.assign({
		sanChuanBranches: [], sanChuanGans: [], courseBranches: [],
		xunKongBranches: [], dingHorseBranches: [], firstBranch: '',
		dayGan: '', dayZhi: '', branchGodMap: {},
	}, o);
}
function nos(hits){ return hits.map((h)=>h.no); }

describe('LRBiFaDoc · matchBiFa A 档自动匹配（宁缺勿滥）', ()=>{
	it('BIFA_LIST 收录 100 条毕法', ()=>{
		expect(BIFA_LIST.length).toBe(100);
	});

	it('no.5 六阳：四课三传全阳支命中，且不误中六阴', ()=>{
		const hits = matchBiFa(ctx({ courseBranches: ['子', '寅', '辰', '午', '申', '戌'] }));
		expect(nos(hits)).toContain(5);
		expect(nos(hits)).not.toContain(6);
	});

	it('no.6 六阴：全阴支命中', ()=>{
		expect(nos(matchBiFa(ctx({ courseBranches: ['丑', '卯', '巳', '未', '酉', '亥'] })))).toContain(6);
	});

	it('no.16 空上乘空：初传旬空且乘天空命中', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '亥', xunKongBranches: ['亥'], branchGodMap: { '亥': '天空' } })))).toContain(16);
	});

	it('no.16 不命中：初传乘天空但不旬空', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '亥', xunKongBranches: [], branchGodMap: { '亥': '天空' } })))).not.toContain(16);
	});

	it('no.42 三奇：三传遁干成甲戊庚命中', ()=>{
		expect(nos(matchBiFa(ctx({ sanChuanGans: ['甲', '戊', '庚'] })))).toContain(42);
	});

	it('no.74 空空如也：三传全旬空命中', ()=>{
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['亥', '戌', '酉'], xunKongBranches: ['亥', '戌', '酉'] })))).toContain(74);
	});

	it('no.31 三传递生并生日干：辰(土)→申(金)→子(水)→甲(木)', ()=>{
		const hits = matchBiFa(ctx({ sanChuanBranches: ['辰', '申', '子'], dayGan: '甲' }));
		expect(nos(hits)).toContain(31);
		expect(nos(hits)).not.toContain(32);
	});

	it('no.32 三传递克并克日干：子(水)→午(火)→申(金)→甲(木)', ()=>{
		const hits = matchBiFa(ctx({ sanChuanBranches: ['子', '午', '申'], dayGan: '甲' }));
		expect(nos(hits)).toContain(32);
		expect(nos(hits)).not.toContain(31);
	});

	it('no.25 金日逢丁：庚日课传见丁神命中', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '庚', dingHorseBranches: ['卯'], courseBranches: ['卯', '子'] })))).toContain(25);
		// 甲日不应命中金日逢丁
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dingHorseBranches: ['卯'], courseBranches: ['卯'] })))).not.toContain(25);
	});

	it('空 / 缺字段 context 不抛错、不误命中', ()=>{
		expect(matchBiFa(null)).toEqual([]);
		expect(matchBiFa(ctx({}))).toEqual([]);
	});
});
