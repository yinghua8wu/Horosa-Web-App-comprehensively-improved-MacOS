import { Component } from 'react';
import { Row, Col, Divider, Slider } from 'antd';
import { randomStr } from '../../utils/helper';
import * as AstroConst from '../../constants/AstroConst';
import * as AstroText from '../../constants/AstroText';
import { saveModuleAISnapshot, } from '../../utils/moduleAiSnapshot';
import { buildBalbillus, buildBalbillusSnapshotText, BALBILLUS_DEFAULT_K, } from '../../utils/balbillus';
import { symbolWithMeaning } from './AstroExtraCommon';
import styles from '../../css/styles.less';
import { XQTable as Table } from '../xq-ui';

class AstroBalbillus extends Component{
	constructor(props){
		super(props);
		this.state = {
			kFrac: BALBILLUS_DEFAULT_K,
			columns: [
				{ title: '主限', dataIndex: 'mainDirect', key: 'mainDirect', width: '34%', render: (text) => this.planetText(text) },
				{ title: '子限', dataIndex: 'subDirect', key: 'subDirect', width: '26%', render: (text) => this.planetText(text) },
				{ title: '日期', dataIndex: 'date', key: 'date', width: '40%', render: (text) => text },
			],
		};
		this.planetText = this.planetText.bind(this);
		this.saveAISnapshot = this.saveAISnapshot.bind(this);
		this.handleSnapshotRefreshRequest = this.handleSnapshotRefreshRequest.bind(this);
	}

	componentDidMount(){
		this.saveAISnapshot();
		if(typeof window !== 'undefined'){
			window.addEventListener('horosa:refresh-module-snapshot', this.handleSnapshotRefreshRequest);
		}
	}

	componentDidUpdate(prevProps){
		if(prevProps.value !== this.props.value){
			this.saveAISnapshot();
		}
	}

	componentWillUnmount(){
		if(typeof window !== 'undefined'){
			window.removeEventListener('horosa:refresh-module-snapshot', this.handleSnapshotRefreshRequest);
		}
	}

	saveAISnapshot(){
		const txt = buildBalbillusSnapshotText(this.props.value);
		saveModuleAISnapshot('balbillus', txt, { tab: 'balbillus' });
		return txt;
	}

	handleSnapshotRefreshRequest(evt){
		if(!evt || !evt.detail || evt.detail.module !== 'balbillus'){ return; }
		const txt = this.saveAISnapshot();
		if(txt){ evt.detail.snapshotText = txt; }
	}

	planetText(id){
		const cn = AstroText.AstroTxtMsg[id] || `${id || ''}`;
		return (
			<span>
				{symbolWithMeaning(id, this.props.showAstroMeaning)}
				<span style={{ fontFamily: AstroConst.NormalFont }}> {cn}</span>
			</span>
		);
	}

	render(){
		const height = this.props.height ? this.props.height : 760;
		const style = { height: `${height - 90}px`, overflowY: 'auto', overflowX: 'hidden' };
		const { rows, startPlanet } = buildBalbillus(this.props.value, this.state.kFrac);
		const cn = (id) => (id ? (AstroText.AstroTxtMsg[id] || id) : '');

		const grid = [];
		const chunks = [];
		for(let i = 0; i < rows.length; i++){
			if(i % 3 === 0){ chunks.push([]); }
			chunks[chunks.length - 1].push(rows[i]);
		}
		chunks.forEach((chunk, ri) => {
			const cols = chunk.map((main) => {
				const ds = (main.subDirect || []).map((s) => ({ mainDirect: main.mainDirect, subDirect: s.subDirect, date: s.date }));
				return (
					<Col key={randomStr(8)} span={8}>
						<div className="horosa-info-card-title" style={{ fontSize: 12 }}>
							{cn(main.mainDirect)}　<span style={{ color: 'var(--horosa-muted, #888)' }}>{main.baseYears}→{main.redYears} 年</span>
						</div>
						<Table dataSource={ds} columns={this.state.columns} rowKey='date' pagination={false} bordered size='small' />
					</Col>
				);
			});
			grid.push(<Row key={randomStr(8)} gutter={12}>{cols}</Row>);
			if(ri < chunks.length - 1){ grid.push(<Divider key={randomStr(8)} dashed={true} />); }
		});

		return (
			<div className={styles.scrollbar} style={{ height: `${height - 20}px`, overflowY: 'auto', overflowX: 'hidden', paddingRight: 6 }}>
				<div className="horosa-info-card" style={{ marginBottom: 8 }}>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Balbillus 法（129 年系统 · 旺距削减 · 360 日年）</div>
					<div style={{ fontSize: 12, color: 'var(--horosa-muted, #888)', marginBottom: 6 }}>
						起始：{cn(startPlanet)} · 旺距削减系数 k（实验性，待 core 校准）
					</div>
					<Slider min={0} max={1} step={0.05} value={this.state.kFrac} onChange={(v) => this.setState({ kFrac: v })} />
				</div>
				<div style={style}>{grid}</div>
			</div>
		);
	}
}

export default AstroBalbillus;
