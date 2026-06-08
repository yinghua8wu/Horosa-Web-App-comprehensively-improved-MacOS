// AI 分析「报告」- 新建报告生成器 Drawer
// 表单：技法 / 案例 / 流派 / 粒度 / 资料范围 / 嵌图开关 / 辅助节开关 / 模型

import React from 'react';
import {
	Drawer, Form, Radio, Select, Checkbox, Switch, Button,
	Alert, Tag, Space, Divider, Tooltip,
} from 'antd';
import { KNOWN_SCHOOLS, getSchoolList } from '../../utils/reportSchools';

const TECH_OPTIONS = [
	{ value: 'bazi', label: '八字' },
	{ value: 'ziwei', label: '紫微斗数' },
];

const GRAN_OPTIONS = [
	{ value: 8,  label: '8 节精炼', desc: '快，省 token' },
	{ value: 12, label: '12 节中粒度', desc: '推荐，平衡详细与成本' },
	{ value: 20, label: '20 节细粒度', desc: '无所不包，token 翻倍' },
];

export default function ReportGenerator(props){
	const { open, onCancel, onSubmit, sources = [], materials = [], profile, model, modelOptions = [], preset } = props;
	const [form] = Form.useForm();
	const [technique, setTechnique] = React.useState('bazi');
	const [schools, setSchools] = React.useState([]);
	const [materialIds, setMaterialIds] = React.useState([]);

	// 应用预填（preset）
	// audit 修:form 依赖移除 — Form.useForm() 返回的 form 实例每次 render 返回的是同一引用(antd 保证稳定),
	// 但保险起见显式 disable eslint react-hooks/exhaustive-deps，杜绝任何潜在的依赖循环风险。
	// eslint-disable-next-line react-hooks/exhaustive-deps
	React.useEffect(()=>{
		if(open && preset){
			form.setFieldsValue({
				technique: preset.technique || 'bazi',
				granularity: preset.granularity || 12,
				caseId: preset.caseId || undefined,
				schools: preset.schools || [],
				embedCharts: preset.embedCharts !== false,
				intro: preset.intro !== false,
				outro: preset.outro !== false,
				modelOverride: preset.modelOverride || model || undefined,
			});
			setTechnique(preset.technique || 'bazi');
			setSchools(preset.schools || []);
		}else if(open && !preset){
			form.resetFields();
			form.setFieldsValue({
				technique: 'bazi',
				granularity: 12,
				embedCharts: true,
				intro: true,
				outro: true,
				modelOverride: model || undefined,
				schools: [],
			});
			setTechnique('bazi');
			setSchools([]);
		}
	// 严格依赖 [open, preset, model] - form 引用稳定但显式排除以防 lint 异常时把 form 当依赖加进来
	}, [open, preset, model]);

	// 八字/紫微 case 数据走 listLocalCharts（含 birth），
	// 同一组生辰数据可同时给八字/紫微/占星用，所以默认所有 chart-type source 都允许选；
	// 仅当 sourceModule 明确不是本技法相关时才过滤。
	const techSources = sources.filter((s)=>{
		if(s.sourceType !== 'chart') return false; // 报告功能首批只支持 chart-based（八字/紫微）
		const sm = `${(s.record && (s.record.sourceModule || s.record.chartType)) || ''}`.toLowerCase();
		if(!sm) return true; // sourceModule 未设：通用 chart，全显示
		// 任何 chart 的生辰都可以用于其他技法，所以不严格过滤；
		// 只在明显冲突场景（例如未来加奇门/六壬时这类不需要生辰的技法）才过滤
		return true;
	});

	const sourceOptions = techSources.map((s)=>{
		const sm = `${(s.record && (s.record.sourceModule || s.record.chartType)) || ''}`;
		const tag = sm ? `[${sm}]` : '';
		return {
			value: s.id,
			label: `${s.title || s.name || s.label || s.id} ${tag}`.trim(),
		};
	});

	const techSchools = getSchoolList(technique);

	// 资料数量统计（按 schools 过滤后）
	const filteredCount = React.useMemo(()=>{
		if(!schools || schools.length === 0) return materials.length;
		return materials.filter((m)=>{
			const ms = Array.isArray(m.schools) ? m.schools : [];
			if(ms.length === 0) return true;
			return ms.some((s)=>schools.includes(s));
		}).length;
	}, [schools, materials]);

	function handleFinish(values){
		onSubmit && onSubmit({
			technique: values.technique,
			granularity: values.granularity,
			caseId: values.caseId,
			schools: values.schools || [],
			materialIds: values.materialIds || materialIds || [],
			embedCharts: values.embedCharts !== false,
			intro: values.intro !== false,
			outro: values.outro !== false,
			modelOverride: values.modelOverride,
		});
	}

	return (
		<Drawer
			title="新建报告"
			open={open}
			onClose={onCancel}
			width={520}
			extra={
				<Space>
					<Button onClick={onCancel}>取消</Button>
					<Button type="primary" onClick={()=>form.submit()}>开始生成</Button>
				</Space>
			}
		>
			<Form
				form={form}
				layout="vertical"
				onFinish={handleFinish}
				initialValues={{
					technique: 'bazi',
					granularity: 12,
					embedCharts: true,  // v1.19 改回默认开:现已用真实 BaZi/ZiWeiMain 组件截图,与软件内盘视觉一致
					intro: true,
					outro: true,
				}}
			>
				<Form.Item label="技法" name="technique" rules={[{ required: true }]}>
					<Radio.Group onChange={(e)=>{ setTechnique(e.target.value); form.setFieldValue('schools', []); setSchools([]); form.setFieldValue('caseId', undefined); }}>
						{TECH_OPTIONS.map((t)=>(<Radio key={t.value} value={t.value}>{t.label}</Radio>))}
					</Radio.Group>
				</Form.Item>

				<Form.Item label="案例" name="caseId" rules={[{ required: true, message: '请选择案例' }]}>
					<Select
						showSearch
						placeholder={sourceOptions.length ? '选择已有案例' : '无可用案例，请先在对应技法 tab 创建'}
						options={sourceOptions}
						filterOption={(input, option)=>(option && `${option.label || ''}`.includes(input))}
						notFoundContent={sourceOptions.length === 0 ? `当前技法下没有可用案例` : '无匹配'}
					/>
				</Form.Item>

				<Form.Item
					label={<span>流派 <Tooltip title="选了流派会过滤检索资料 + 在 prompt 中注入流派指引。不选则走通用 RAG。"><Tag color="blue" style={{cursor:'help'}}>?</Tag></Tooltip></span>}
					name="schools"
					extra={<span style={{fontSize:12,color:'#888'}}>过滤后资料约 {filteredCount} 篇</span>}
				>
					<Select
						mode="tags"
						placeholder="不选 = 不限流派（推荐资料较多场景）"
						onChange={(v)=>setSchools(v)}
						options={techSchools.map((s)=>({ value: s.name, label: s.name }))}
					/>
				</Form.Item>

				{schools && schools.length > 0 && filteredCount < 3 ? (
					<Alert
						type="warning"
						showIcon
						message={`所选流派 [${schools.join('、')}] 对应资料较少（${filteredCount} 篇），结果可能不够地道。`}
						style={{ marginBottom: 16 }}
					/>
				) : null}

				<Form.Item label="粒度" name="granularity" rules={[{ required: true }]}>
					<Radio.Group>
						{GRAN_OPTIONS.map((g)=>(
							<Radio key={g.value} value={g.value} style={{display:'block',marginBottom:6}}>
								<strong>{g.label}</strong> <span style={{fontSize:12,color:'#888',marginLeft:6}}>{g.desc}</span>
							</Radio>
						))}
					</Radio.Group>
				</Form.Item>

				<Form.Item label="资料范围" name="materialIds" extra="不选则用全部资料（按流派过滤后）">
					<Select
						mode="multiple"
						placeholder="留空 = 用全部"
						maxTagCount="responsive"
						options={materials.map((m)=>({ value: m.id, label: m.fileName || '(未命名)' }))}
						filterOption={(input, option)=>`${(option && option.label) || ''}`.toLowerCase().includes(`${input || ''}`.toLowerCase())}
					/>
				</Form.Item>

				<Divider />

				<Form.Item label="模型" name="modelOverride" extra={`当前默认：${(profile && profile.name) || '(未配置)'} · ${model || '(未选)'}`}>
					<Select
						allowClear
						placeholder="覆盖默认模型（可选）"
						options={modelOptions}
					/>
				</Form.Item>

				<Form.Item label="嵌图" name="embedCharts" valuePropName="checked">
					<Switch checkedChildren="开" unCheckedChildren="关" />
				</Form.Item>
				<div style={{marginTop:-12,marginBottom:16,fontSize:12,color:'#888'}}>
					每节按模板默认嵌入对应真实命盘截图（四柱图 / 12 宫盘 / 宫高亮），与软件内 八字/紫微 tab 视觉一致。<br />
					每张图 3-5s, 12 节大约 +40s 生成时间。
				</div>

				<Form.Item label="首页一句话结论" name="intro" valuePropName="checked">
					<Switch checkedChildren="开" unCheckedChildren="关" />
				</Form.Item>

				<Form.Item label="末页重点提醒" name="outro" valuePropName="checked">
					<Switch checkedChildren="开" unCheckedChildren="关" />
				</Form.Item>
			</Form>
		</Drawer>
	);
}
