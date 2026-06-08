import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// SW 的注册 / 更新 / skipWaiting 全交给 vite-plugin-pwa（autoUpdate +
// workbox.skipWaiting / clientsClaim），不再在这里手动控制。
//
// 之前这里同时调 reg.update() + 给 waiting SW 发 SKIP_WAITING +
// controllerchange 时 location.reload()。这套组合在 iOS PWA 上会触发
// WebKit 的已知 bug（PWA-POLICE）：「SW install 期间页面 navigation /
// reload，Safari 会立刻杀掉旧 SW」，进而 SW 卡在 redundant，
// navigator.serviceWorker.ready 永挂——表现就是 NotificationPrompt
// 「Service Worker 初始化超时」反复出现。
//
// vite-plugin-pwa 在 workbox.skipWaiting + clientsClaim 开启后，新 SW
// 一旦 active 就立即接管所有 client，不需要 reload；旧版本里的「自动
// reload」反而是 race 源头。
