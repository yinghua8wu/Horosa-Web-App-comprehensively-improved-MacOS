import request from '../utils/request';
import { ServerRoot } from '../utils/constants';

const CHART_CACHE_MAX = 96;
const chartMem = new Map();
const chartInflight = new Map();

function clonePlain(obj){
	if(obj === undefined || obj === null){
		return obj;
	}
	try{
		return JSON.parse(JSON.stringify(obj));
	}catch(e){
		return obj;
	}
}

function pushCache(map, key, val){
	if(!key || val === undefined || val === null){
		return;
	}
	if(map.has(key)){
		map.delete(key);
	}
	map.set(key, val);
	if(map.size > CHART_CACHE_MAX){
		const first = map.keys().next().value;
		if(first){
			map.delete(first);
		}
	}
}

function buildChartKey(values){
	try{
		return JSON.stringify(values || {});
	}catch(e){
		return '';
	}
}

export function fetchChart(values, requestOptions){
	const opts = requestOptions || {};
	const disableCache = opts.cache === false;
	const key = disableCache ? '' : buildChartKey(values);
	if(key && chartMem.has(key)){
		return Promise.resolve(clonePlain(chartMem.get(key)));
	}
	if(key && chartInflight.has(key)){
		return chartInflight.get(key).then((rsp)=>clonePlain(rsp));
	}
	const req = request(`${ServerRoot}/chart`, {
		// 排盘是幂等纯计算(后端无写库 ChartController),对「本地服务未就绪/重启窗口」做透明退避重试:
		// 仅在连接被拒(后端不可达,见 fetchWithRetryConnRefused)时退避重试,HTTP 4xx/5xx 不重试、原样返回。
		// 否则慢启动或服务重启瞬间第一次连接失败就硬弹「排盘失败:本地服务未就绪」(Win issue #14 同因,前端 Mac/Win 共享)。
		// caller 的 opts.retry 可覆盖(如某些场景想关重试)。
		retry: { retries: 6, backoff: [400, 800, 1200, 2000, 3000, 4000] },
		body: JSON.stringify(values),
		...opts,
	}).then((rsp)=>{
		if(key && rsp){
			pushCache(chartMem, key, clonePlain(rsp));
		}
		return rsp;
	}).finally(()=>{
		if(key){
			chartInflight.delete(key);
		}
	});
	if(key){
		chartInflight.set(key, req);
	}
	return req.then((rsp)=>clonePlain(rsp));
}

export function fetchAllowedCharts(values){
    return request(`${ServerRoot}/allowedcharts`, {
        body: JSON.stringify(values),
    });
}

export function fetchFateEvents(values){
    return request(`${ServerRoot}/deeplearn/fateevents`, {
        body: JSON.stringify(values),
    });
}

export function dlTrain(values){
    return request(`${ServerRoot}/deeplearn/train`, {
        body: JSON.stringify(values),
    });
}

