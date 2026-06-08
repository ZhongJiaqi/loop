import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// SW lifecycle 管理 —— 温和版（**不含** controllerchange→reload race）。
//
// 用户主屏 PWA 里已装的旧 SW 是早期版本，**没有 self.skipWaiting()**：
// 新 SW install 完成后会卡在 waiting 永不 activate（除非用户关掉所有
// PWA tab —— iOS PWA 上几乎不会发生）。这导致升级链路 broken，新
// push-handler.js / workbox skipWaiting 配置都生效不了。
//
// 这里做两件事让升级自然完成：
//   1. mount 时 reg.update() 触发新 SW check（iOS PWA 切前台时必备）
//   2. updatefound + statechange='installed'+有 controller → 主动给新
//      SW 发 SKIP_WAITING，让它跳过 waiting 直接 activate
//
// 不监听 controllerchange + 不 reload —— 那是触发 Safari "SW install
// 期间 navigation 时杀 SW" bug 的源头。workbox 的 clientsClaim 会让
// 新 SW activate 后立即接管 fetch，不需要 reload。
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      reg.update().catch(() => {});

      // 已经有 waiting 的旧 SW？立刻让它让位。
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 监听后续 updatefound：新 SW installing → 等到 installed +
      // 已有 controller（说明是 update 不是首次 install）→ skip waiting。
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            installing.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch {
      /* SW 注册不可用就静默，不影响主程序 */
    }
  });
}
