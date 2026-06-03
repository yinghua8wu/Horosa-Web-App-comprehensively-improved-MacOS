import React from 'react';
import { ServerRoot } from '../../utils/constants';
import { markServiceOnline } from '../../utils/serviceStatus';

// P0 启动稳健化:本地后端就绪前的全屏「正在连接本地服务」覆盖层,取代「白屏 / 进不去主界面」。
//
// 纯增量、安全回退(铁律⑦):
//  · 后端正常时——首次探测即通过 → 立刻 return null、零 DOM、对正常启动零观感影响;
//  · 后端未就绪时——显示覆盖层并**持续自动退避重试**,任意 HTTP 响应(含 4xx/超时=后端在世)都立即放行,
//    仅「网络层不可达(TypeError/连接被拒)」才继续等;**永不永久 hang**——一直重试 + 提供「重试」按钮与重启提示;
//  · 不依赖、不改动既有 request.js / chartFetch / 离线横幅逻辑;无有效后端地址(纯网页托管)时不拦截。
export default function StartupGate() {
  const [ready, setReady] = React.useState(false);
  const [slow, setSlow] = React.useState(false); // 超过数秒仍未就绪 → 显示可操作提示

  const probeUrl = React.useMemo(
    () => (ServerRoot ? `${String(ServerRoot).replace(/\/$/, '')}/heartbeat` : ''),
    [],
  );

  React.useEffect(() => {
    if (!probeUrl || typeof fetch !== 'function') { setReady(true); return undefined; }
    let cancelled = false;
    let timer = null;
    const slowTimer = setTimeout(() => { if (!cancelled) setSlow(true); }, 6000);

    const pass = () => { if (cancelled) return; markServiceOnline(); clearTimeout(slowTimer); setReady(true); };

    const probe = (attempt) => {
      if (cancelled) return;
      let abortTimer = null;
      try {
        const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
        if (ctrl) abortTimer = setTimeout(() => { try { ctrl.abort(); } catch (e) { /* noop */ } }, 2500);
        fetch(probeUrl, { method: 'GET', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
          .then(() => { if (abortTimer) clearTimeout(abortTimer); pass(); })
          .catch((err) => {
            if (abortTimer) clearTimeout(abortTimer);
            if (cancelled) return;
            // 超时/中断 = 后端在世只是慢 → 放行,避免卡在慢启动。
            if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) { pass(); return; }
            // 网络层不可达:退避重试(上限 2.5s),永不放弃。
            timer = setTimeout(() => probe(attempt + 1), Math.min(2500, 300 + attempt * 300));
          });
      } catch (e) {
        timer = setTimeout(() => probe(attempt + 1), 800);
      }
    };
    probe(0);
    return () => { cancelled = true; if (timer) clearTimeout(timer); clearTimeout(slowTimer); };
  }, [probeUrl]);

  const manualRetry = () => {
    if (!probeUrl) { setReady(true); return; }
    fetch(probeUrl, { method: 'GET', cache: 'no-store' })
      .then(() => { markServiceOnline(); setReady(true); })
      .catch(() => { /* 仍不可达,继续显示 */ });
  };

  if (ready) return null;

  const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 4000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--horosa-bg, #0b0d10)', color: 'var(--horosa-text, inherit)',
  };
  const card = {
    textAlign: 'center', padding: '28px 36px', borderRadius: 14, maxWidth: 420,
    background: 'var(--horosa-surface, rgba(255,255,255,0.94))',
    border: '1px solid var(--horosa-border, rgba(0,0,0,0.1))',
    boxShadow: 'var(--horosa-small-shadow, 0 8px 24px rgba(0,0,0,0.12))',
  };
  const spinner = {
    margin: '0 auto 14px', width: 30, height: 30, borderRadius: '50%',
    border: '3px solid var(--horosa-border, rgba(0,0,0,0.15))',
    borderTopColor: 'var(--horosa-accent, #2f7df1)', animation: 'horosaStartupSpin 0.8s linear infinite',
  };
  return (
    <div style={overlay} aria-live="polite" role="status">
      <div style={card}>
        <div style={spinner} />
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>正在连接本地服务…</div>
        <div style={{ fontSize: 12.5, color: 'var(--horosa-text-soft, #888)', lineHeight: 1.6 }}>
          首次启动需准备本地排盘引擎,通常约 10 秒,请稍候。
        </div>
        {slow ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--horosa-text-soft, #888)', marginBottom: 8 }}>
              仍在准备中?可点「重试」;若长时间无响应,请重启 星阙。
            </div>
            <button
              type="button"
              onClick={manualRetry}
              style={{ fontSize: 13, padding: '5px 18px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid var(--horosa-accent, #2f7df1)',
                background: 'var(--horosa-accent-soft, rgba(47,125,241,0.12))',
                color: 'var(--horosa-accent-strong, #2167d4)' }}
            >重试</button>
          </div>
        ) : null}
        <style>{'@keyframes horosaStartupSpin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </div>
  );
}
