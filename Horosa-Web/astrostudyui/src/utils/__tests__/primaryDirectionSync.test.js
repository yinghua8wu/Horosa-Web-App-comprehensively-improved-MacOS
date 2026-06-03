jest.mock('../helper', ()=>({
	randomStr: ()=> 'chart-seq-1',
}));

import {
	DEFAULT_PD_TYPE,
	PD_SYNC_REV,
	SUPPORTED_PD_METHODS,
	SUPPORTED_PD_TIME_KEYS,
	mergePrimaryDirectionChartObj,
	normalizePrimaryDirectionSubTabKey,
} from '../primaryDirectionSync';

describe('primaryDirectionSync', ()=>{
	test('merges primary direction rows into chart state with synced params', ()=>{
		const chartObj = {
			params: {
				name: 'before',
				pos: 'before pos',
				showPdBounds: 0,
			},
			predictives: {
				firdaria: [{ id: 1 }],
			},
		};
		const next = mergePrimaryDirectionChartObj(chartObj, {
			pdRows: [[1, 'SUN', 'MOON', '', '2000-01-01']],
			showPdBounds: 1,
			pdMethod: 'horosa_legacy',
			pdTimeKey: 'Ptolemy',
			name: 'after',
			pos: 'after pos',
		});

		expect(next.chartId).toBe('chart-seq-1');
		expect(next.params.name).toBe('after');
		expect(next.params.pos).toBe('after pos');
		expect(next.params.showPdBounds).toBe(1);
		expect(next.params.pdtype).toBe(DEFAULT_PD_TYPE);
		expect(next.params.pdMethod).toBe('horosa_legacy');
		expect(next.params.pdTimeKey).toBe('Ptolemy');
		expect(next.params.pdSyncRev).toBe(PD_SYNC_REV);
		expect(next.predictives.primaryDirection).toEqual([[1, 'SUN', 'MOON', '', '2000-01-01']]);
		expect(next.predictives.firdaria).toEqual([{ id: 1 }]);
	});

	test('keeps valid direction sub tabs and falls back only for invalid keys', ()=>{
		expect(normalizePrimaryDirectionSubTabKey('primarydirchart')).toBe('primarydirchart');
		expect(normalizePrimaryDirectionSubTabKey('firdaria')).toBe('firdaria');
		expect(normalizePrimaryDirectionSubTabKey('unexpected')).toBe('primarydirect');
	});

	test('PD_SYNC_REV is v10 (P1 全方法建成,强制旧持久化 chart 重算)', ()=>{
		expect(PD_SYNC_REV).toBe('pd_method_sync_v10');
	});

	test('SUPPORTED_PD_METHODS covers Alchabitius(default)/legacy/Placidus + Regio/Campanus/Topo (P1)', ()=>{
		['core_alchabitius', 'horosa_legacy', 'placidus', 'regiomontanus', 'campanus', 'topocentric']
			.forEach((m)=>{ expect(SUPPORTED_PD_METHODS).toContain(m); });
	});

	test('SUPPORTED_PD_TIME_KEYS = 公式/真算法 key:Ptolemy/Naibod(静态)+ TrueSolarArc(动态),纯公式', ()=>{
		expect(SUPPORTED_PD_TIME_KEYS).toEqual(['Ptolemy', 'Naibod', 'TrueSolarArc']);
	});

	test('mergePrimaryDirectionChartObj writes new placidus method into params (P0 white-list extension)', ()=>{
		const chartObj = { params: {}, predictives: {} };
		const next = mergePrimaryDirectionChartObj(chartObj, {
			pdRows: [],
			pdMethod: 'placidus',
			pdTimeKey: 'Naibod',
		});
		expect(next.params.pdMethod).toBe('placidus');
		expect(next.params.pdTimeKey).toBe('Naibod');
	});

	test('mergePrimaryDirectionChartObj persists v10 进阶开关 (方向类型/顺逆/映点/界)', ()=>{
		const chartObj = { params: {}, predictives: {} };
		const next = mergePrimaryDirectionChartObj(chartObj, {
			pdRows: [],
			pdMethod: 'regiomontanus',
			pdTimeKey: 'TrueSolarArc',
			pdtype: 1,
			pdDirect: 1,
			pdConverse: 1,
			pdAntiscia: 1,
			pdTerms: 0,
		});
		expect(next.params.pdtype).toBe(1);
		expect(next.params.pdDirect).toBe(1);
		expect(next.params.pdConverse).toBe(1);
		expect(next.params.pdAntiscia).toBe(1);
		expect(next.params.pdTerms).toBe(0);
	});

	test('mergePrimaryDirectionChartObj 顺向默认开:pdDirect 未传落库 1,显式 0 才关', ()=>{
		const on = mergePrimaryDirectionChartObj({ params: {}, predictives: {} }, { pdRows: [] });
		expect(on.params.pdDirect).toBe(1);
		const off = mergePrimaryDirectionChartObj({ params: {}, predictives: {} }, { pdRows: [], pdDirect: 0 });
		expect(off.params.pdDirect).toBe(0);
	});
});
