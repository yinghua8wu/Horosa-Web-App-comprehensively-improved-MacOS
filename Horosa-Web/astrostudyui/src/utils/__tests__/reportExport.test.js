// 报告功能 - 导出工具单测
// v1.20: mock jspdf/html2canvas - jest 环境无 TextEncoder, jspdf real import 会 crash
jest.mock('jspdf', () => ({ jsPDF: function() { return { internal: { pageSize: { getWidth: ()=>210, getHeight: ()=>297 } }, addImage: ()=>{}, addPage: ()=>{}, output: ()=>new Blob() }; } }));
jest.mock('html2canvas', () => ({ __esModule: true, default: () => Promise.resolve({ width: 100, height: 100, toDataURL: ()=>'data:image/png;base64,test' }) }));

import { buildReportMarkdown, buildReportHtml, buildReportDocx, isDocxTableSep, splitDocxTableRow } from '../reportExport';
import { getBuiltinReportTemplates, findReportTemplate } from '../reportTemplates';

const template = findReportTemplate(getBuiltinReportTemplates(), 'bazi', 8);

const mockInstance = {
	id: 'rpt-1',
	templateId: template.id,
	caseId: 'case-1',
	caseLabel: '张三',
	technique: 'bazi',
	granularity: 8,
	schools: ['子平派'],
	title: '张三 · 八字 · 8节子平派报告',
	intro: '财运较佳、官业中等、婚姻需谨慎',
	outro: '## 未来 3 年重点\n- 注意流年 2027 戊辰\n- 2028 化禄宜进取',
	sections: template.sections.reduce((m, s)=>{
		m[s.key] = {
			key: s.key, title: s.title, order: s.order,
			status: 'done',
			content: `## ${s.title}\n\n这是 ${s.title} 节的测试内容。\n\n- 要点 1\n- 要点 2`,
			embeddedChartDataURL: null,
		};
		return m;
	}, {}),
	meta: { providerName: 'DeepSeek', model: 'deepseek-chat', createdAt: '2026-06-07T10:00:00Z' },
};

describe('buildReportMarkdown', ()=>{
	test('含标题/案例/各节/末页', ()=>{
		const md = buildReportMarkdown(mockInstance, template, '子平派');
		expect(md).toContain('# 张三');
		expect(md).toContain('案例');
		expect(md).toContain('八字');
		expect(md).toContain('子平派');
		expect(md).toContain('一句话结论');
		expect(md).toContain('## 目录');
		expect(md).toContain('1. 命主基本');
		expect(md).toContain('## 重点提醒');
	});

	test('嵌图节包含 ![]() 链接', ()=>{
		const inst = { ...mockInstance, sections: { ...mockInstance.sections } };
		inst.sections.dayun = { ...inst.sections.dayun, embeddedChartDataURL: 'data:image/png;base64,iVBORw0KGgo=' };
		const md = buildReportMarkdown(inst, template, '子平派');
		expect(md).toContain('![');
		expect(md).toContain('data:image/png;base64');
	});

	test('warn 节:保留告警标记 + 仍输出内容(此前 warn 告警在导出丢失)', ()=>{
		const inst = { ...mockInstance, sections: { ...mockInstance.sections } };
		const k = template.sections[0].key;
		inst.sections[k] = { ...inst.sections[k], status: 'warn', warning: '盘面数据不全', content: '## x\n谨慎参考的内容' };
		const md = buildReportMarkdown(inst, template, '子平派');
		expect(md).toContain('本节告警');
		expect(md).toContain('盘面数据不全');
		expect(md).toContain('谨慎参考的内容');
	});

	test('失败节 error 含 # / 反引号 → 转义(防行首#变标题、```变围栏)', ()=>{
		const inst = { ...mockInstance, sections: { ...mockInstance.sections } };
		const k = template.sections[0].key;
		inst.sections[k] = { ...inst.sections[k], status: 'failed', content: '', error: { message: '# 服务 `429` 限流' } };
		const md = buildReportMarkdown(inst, template, '子平派');
		expect(md).toContain('本节生成失败');
		expect(md).toContain('\\#');
		expect(md).toContain('\\`429\\`');
	});
});

describe('buildReportHtml', ()=>{
	test('合法 HTML 结构', ()=>{
		const html = buildReportHtml(mockInstance, template, '子平派');
		expect(html).toContain('<!DOCTYPE html>');
		expect(html).toContain('<title>');
		expect(html).toContain('<style>');
		expect(html).toContain('<h1>');
		expect(html).toContain('张三');
	});

	test('转义 < > & " 字符', ()=>{
		const inst = { ...mockInstance, caseLabel: 'A <script>alert(1)</script>' };
		const html = buildReportHtml(inst, template, '子平派');
		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).toContain('&lt;script&gt;');
	});

	test('GFM 表格渲染成 <table>(命理大运/流年表)+ 单元格转义', ()=>{
		const inst = { ...mockInstance, sections: { ...mockInstance.sections } };
		const k = template.sections[0].key;
		inst.sections[k] = { ...inst.sections[k],
			content: '## 大运表\n\n| 大运 | 干支 | 备注 |\n|---|:---:|---|\n| 第一步 | 庚午 | <b>旺</b> |\n| 第二步 | 辛未 | <script>x</script> |',
		};
		const html = buildReportHtml(inst, template, '子平派');
		expect(html).toContain('<table class="report-table">');
		expect(html).toContain('<th>大运</th>');
		expect(html).toMatch(/<td[^>]*>庚午<\/td>/);
		expect(html).toMatch(/<td[^>]*>第一步<\/td>/);
		expect(html).not.toContain('| 大运 | 干支 |');          // 不再是字面管道
		expect(html).toContain('&lt;script&gt;x&lt;/script&gt;'); // 单元格 XSS 转义
		expect(html).toContain('text-align:center');             // :---: 对齐
	});

	test('围栏代码块渲染成 <pre><code> 且内容原样转义', ()=>{
		const inst = { ...mockInstance, sections: { ...mockInstance.sections } };
		const k = template.sections[0].key;
		inst.sections[k] = { ...inst.sections[k], content: '```\nlet a = b < c && d > e;\n```' };
		const html = buildReportHtml(inst, template, '子平派');
		expect(html).toContain('<pre class="report-code">');
		expect(html).toContain('b &lt; c &amp;&amp; d &gt; e');
	});
});

// docx@9 是 ESM 包，jest (CJS transform) 下 `new TextRun()` 抛 "is not a constructor"，
// 但浏览器 webpack 路径正常。docx 真表渲染(<w:tbl>)在 preview 内解 zip 实测。这里测纯解析 helper + 断言函数存在。
describe('buildReportDocx', ()=>{
	test('函数已导出', ()=>{
		expect(typeof buildReportDocx).toBe('function');
	});

	test('isDocxTableSep:识别 GFM 分隔行(含对齐冒号),拒普通行', ()=>{
		expect(isDocxTableSep('|---|---|')).toBe(true);
		expect(isDocxTableSep('|---|:---:|---:|')).toBe(true);
		expect(isDocxTableSep(' --- | --- ')).toBe(true);     // 无外管道也认
		expect(isDocxTableSep('| 大运 | 干支 |')).toBe(false); // 表头不是分隔行
		expect(isDocxTableSep('正文一段话')).toBe(false);
		expect(isDocxTableSep('')).toBe(false);
		expect(isDocxTableSep(undefined)).toBe(false);
	});

	test('splitDocxTableRow:剥两端管道 + 去空白拆单元格', ()=>{
		expect(splitDocxTableRow('| 第一步 | 庚午 | 旺 |')).toEqual(['第一步', '庚午', '旺']);
		expect(splitDocxTableRow('a|b|c')).toEqual(['a', 'b', 'c']);       // 无外管道
		expect(splitDocxTableRow('|  x  |   |')).toEqual(['x', '']);        // 空单元格保留
	});
});
