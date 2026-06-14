import { buildAstroSnapshotContent } from '../astroAiSnapshot';

// 自检(第四同步 AI挂载 + 导出):西占快照[古典]段 = 逐曜古典状态 + 围攻详断。
// 断言只用「我方逐字输出的固定标签」(与 msg() 翻译无关),与 AstroInfo.js 古典渲染同源。
const mkChart = (extra = {})=>({
	chart: {
		isDiurnal: true,
		stars: [],
		houses: [],
		objects: [
			{ id: 'Sun', sign: 'Pisces', signlon: 0.5, house: 'House9', joy: true, joyHouse: 9,
				ofSect: true, degreeQuality: 'D', degreeGender: 'masculine',
				mansion: { idx: 28, cn: '鱼腹', nature: '吉', use: '行船' },
				apogeeDir: 'rising', numberTrend: 'decreasing',
				monomoiria: 'Mars', ninthPart: 'Pisces', darijan: 'Mars' },
			{ id: 'Moon', sign: 'Gemini', signlon: 10, house: 'House11', outOfBounds: true, oobDelta: 1.23, oobMode: 'going', lightTrend: 'waxing', apogeeDir: 'falling', numberTrend: 'increasing' },
			{ id: 'Mercury', sign: 'Aquarius', signlon: 6, house: 'House8', phase: 'combust', phasisElong: 3.2, feral: true, specialDegree: { pitted: true, azemene: false, fortune: false } },
		],
		...extra,
	},
	params: {},
	lots: [],
	aspects: {},
	receptions: {},
	mutuals: {},
	declParallel: {},
	surround: {
		besiegement: [
			{ target: 'Mercury', type: 'MarsSaturn', kind: '围攻', nature: '凶', targetRetro: false, severe: true,
				besiegers: [
					{ id: 'Mars', aspect: 0, season: '春', retro: false, delta: 2.1, restrained: [], counterBesieged: false },
					{ id: 'Saturn', aspect: 0, season: '夏', retro: true, delta: 2.3, restrained: ['Jupiter'], counterBesieged: true },
				],
				defense: [ { id: 'Venus', aspect: 0, side: '春', against: 'Mars', orb: 1.5, byBody: false, strong: true } ] },
			{ target: 'Moon', type: 'SunMoon', kind: '围耀', nature: '贵', targetRetro: false, severe: null,
				besiegers: [ { id: 'Sun', aspect: 60, season: '中', retro: false, delta: 1.0, restrained: [], counterBesieged: false } ],
				defense: [] },
		],
	},
});

describe('西占 AI 快照[古典]段', ()=>{
	const out = buildAstroSnapshotContent(mkChart(), null);

	it('含[古典]段标题与两个子节', ()=>{
		expect(out).toContain('[古典]');
		expect(out).toContain('逐曜古典状态');
		expect(out).toContain('围攻详断');
	});

	it('逐曜古典状态:出界/喜乐/宗派/野逸/度数性质·阳阴/月站/远地点·数·光/度数主星 标签齐全', ()=>{
		expect(out).toContain('出界+1.23°（远行）');   // 月·oobMode going
		expect(out).toContain('喜乐（9宫）');
		expect(out).toContain('同宗');                  // ofSect true
		expect(out).toContain('野逸');
		expect(out).toContain('暗度');                  // degreeQuality D
		expect(out).toContain('阳性度');                // masculine
		expect(out).toContain('月站鱼腹（吉）');
		expect(out).toContain('升·趋远地点');
		expect(out).toContain('数减·渐迟');             // decreasing
		expect(out).toContain('光增·渐盈');             // 月 waxing
		expect(out).toContain('焦伤（距日3.2°）');       // phase combust + elong
		expect(out).toContain('陷度');                  // specialDegree pitted
		expect(out).toContain('单度主星');
		expect(out).toContain('九分');
		expect(out).toContain('Darijan');
	});

	it('围攻详断:三围名/性 + 凶剧见血 + 日木制约 + 围魏救赵 + 协防(以身/遥光·强弱) + 断语', ()=>{
		expect(out).toContain('围攻（凶）');
		expect(out).toContain('凶剧见血');
		expect(out).toContain('日木制约凶减半');
		expect(out).toContain('围魏救赵');
		expect(out).toContain('协防：');
		expect(out).toContain('遥光');                  // byBody false
		expect(out).toContain('·强');                   // strong true
		expect(out).toContain('智力特异·语言障碍');     // 围攻 Mercury 断语
		expect(out).toContain('围耀（贵）');
		expect(out).toContain('致贵·领袖魅力·载众载民'); // 围耀 断语
	});

	it('无古典数据时不产出[古典]空段', ()=>{
		const bare = { chart: { isDiurnal: true, stars: [], houses: [], objects: [{ id: 'Sun', sign: 'Aries', signlon: 1, house: 'House1' }] }, params: {}, lots: [], aspects: {}, receptions: {}, mutuals: {}, declParallel: {}, surround: {} };
		const o2 = buildAstroSnapshotContent(bare, null);
		expect(o2).not.toContain('[古典]');
	});
});
