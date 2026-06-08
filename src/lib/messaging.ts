import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { withTimeout } from './timeout';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// 各步骤超时，确保 UI 不会永远卡在"请求中..."。
// SW 等待只在"完全没有 active SW（真冷启动）"路径才走，给 15s；超过就
// 让用户看到 reset 按钮，不再让用户等 60s。
// FCM 订阅可能受网络环境影响给 15s；Firestore 写入给 10s。
const SW_READY_TIMEOUT_MS = 15_000;
const PUSH_SUBSCRIBE_TIMEOUT_MS = 15_000;
const FIRESTORE_WRITE_TIMEOUT_MS = 10_000;

/**
 * 给当前 SW registration 的状态拍一张快照，写进错误消息便于诊断。
 * 例：`installing(installed),active(activated),scope=/`
 */
function snapshotRegistration(reg: ServiceWorkerRegistration | null): string {
  if (!reg) return 'reg=none';
  const parts: string[] = [];
  if (reg.installing) parts.push(`installing(${reg.installing.state})`);
  if (reg.waiting) parts.push(`waiting(${reg.waiting.state})`);
  if (reg.active) parts.push(`active(${reg.active.state})`);
  try {
    parts.push(`scope=${new URL(reg.scope).pathname}`);
  } catch {
    /* ignore malformed scope */
  }
  return parts.join(',');
}

/**
 * Wait for the page's Service Worker to be usable for push.
 *
 * 关键洞察：开启提醒只需要一个 active SW（不管旧版还是新版），
 * push subscription endpoint 跟 SW 版本无关。如果旧 SW 已经 active 在
 * 控制页面，pushManager.subscribe 立即可用——不必傻等浏览器后台
 * fetch 完新 SW 的 precache（workbox precache 在国内网络可能 30s+）。
 *
 * 之前的 bug：reg.active && !reg.installing && !reg.waiting 才立即返回。
 * 进入 PWA 时浏览器后台总会 reg.update() 拉新 SW，installing 非 null →
 * 走 statechange 等待路径，用户被迫等 60s。
 *
 * 修复：
 * 1. `getRegistration()` 拿不到 → 立即报"未注册"
 * 2. **有 active SW → 立即 return**（不管 installing/waiting）
 * 3. 同时主动推进升级（不阻塞当前请求）：
 *    - `reg.update()` 触发 update check
 *    - 若 `reg.waiting` 存在 → `postMessage('SKIP_WAITING')` 让旧 SW 让位
 * 4. 仅在真冷启动（reg.active = null）时才等 statechange，15s 超时
 *
 * 超时错误消息内嵌 SW 状态 snapshot，便于诊断。
 */
async function waitForServiceWorkerReady(
  timeoutMs: number = SW_READY_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    throw new Error('Service Worker 尚未注册，请刷新页面后重试');
  }

  // 不阻塞地推进 SW 升级链路：触发 update + 推动 waiting SW 接管。
  // 都包 try/catch，任何一步抛错都不影响主路径。
  try {
    reg.update().catch(() => {});
  } catch {
    /* update() 极少同步抛，保险 */
  }
  if (reg.waiting) {
    try {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      /* ignore */
    }
  }

  // 关键修复：有 active SW 就立即可用，不再等新 SW activate。
  if (reg.active) {
    return reg;
  }

  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    let settled = false;

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(reg);
    };

    const trackWorker = (sw: ServiceWorker | null) => {
      if (!sw) return;
      if (sw.state === 'activated') {
        finish();
        return;
      }
      if (sw.state === 'redundant') {
        finish(
          new Error(
            `Service Worker 安装失败（redundant；${snapshotRegistration(reg)}）。请完全关闭应用后重新打开。`,
          ),
        );
        return;
      }
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') finish();
        else if (sw.state === 'redundant') {
          finish(
            new Error(
              `Service Worker 安装失败（redundant；${snapshotRegistration(reg)}）。请完全关闭应用后重新打开。`,
            ),
          );
        }
      });
    };

    trackWorker(reg.installing);
    trackWorker(reg.waiting);
    reg.addEventListener('updatefound', () => trackWorker(reg.installing));

    // 兜底：active 可能在我们绑监听前就 ready 了
    navigator.serviceWorker.ready.then(() => finish()).catch(() => {});

    const timer = setTimeout(() => {
      finish(
        new Error(
          `Service Worker 初始化超时（${Math.round(timeoutMs / 1000)}s；${snapshotRegistration(reg)}）。请完全关闭应用后重新打开。`,
        ),
      );
    }, timeoutMs);
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Check if the browser supports Web Push.
 * Works on iOS Safari 16.4+ when launched from home screen.
 */
export function isPushSupported(): boolean {
  return 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

/**
 * Check if we're on iOS but NOT in standalone (home screen) mode.
 * iOS requires PWA to be added to home screen for push to work.
 */
export function isIOSNonStandalone(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  // @ts-expect-error navigator.standalone is iOS-specific
  return navigator.standalone !== true;
}

/**
 * Request notification permission and subscribe via Web Push API.
 * Stores the PushSubscription in Firestore.
 */
export async function requestPermissionAndSubscribe(userId: string): Promise<PushSubscription> {
  if (!isPushSupported()) throw new Error('UNSUPPORTED');
  if (isIOSNonStandalone()) throw new Error('IOS_NOT_STANDALONE');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(`permission=${permission}`);

  if (!VAPID_PUBLIC_KEY) throw new Error('VAPID_KEY 未配置');

  // Use the PWA service worker (which includes push-handler.js via importScripts).
  // See waitForServiceWorkerReady — distinguishes "not registered" vs
  // "still activating" vs "active" to give actionable error messages.
  const swReg = await waitForServiceWorkerReady();

  let subscription = await swReg.pushManager.getSubscription();
  if (!subscription) {
    // pushManager.subscribe 需要联系浏览器厂商的推送服务（Chrome → FCM 等），
    // 网络受限时可能长时间不返回，必须设置上界。
    subscription = await withTimeout(
      swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }),
      PUSH_SUBSCRIBE_TIMEOUT_MS,
      '订阅推送服务',
    );
  }

  // Store in Firestore — use endpoint hash as doc ID for idempotency
  const subJson = subscription.toJSON();
  const docId = btoa(subscription.endpoint).replace(/[/+=]/g, '_').slice(-80);

  await withTimeout(
    setDoc(doc(db, `users/${userId}/pushSubscriptions/${docId}`), {
      endpoint: subJson.endpoint,
      keys: subJson.keys,
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }),
    FIRESTORE_WRITE_TIMEOUT_MS,
    '保存订阅到云端',
  );

  return subscription;
}

/**
 * 当 Service Worker 卡死时的逃生通道。
 *
 * 触发场景：navigator.serviceWorker.ready 超时、SW 进入 redundant、
 * 旧版 SW 缓存死链等。
 *
 * 流程：
 *   1. unregister 所有当前 origin 的 SW registration
 *   2. 删掉所有 caches（workbox precache / runtime cache 都进 CacheStorage）
 *   3. window.location.reload() — vite-plugin-pwa 会在 reload 后重新注册
 *
 * 每步独立 try/catch，确保 reload 一定执行；用户即便在 SW 死局也能脱身。
 * iOS PWA 上特别有效：等价于「删除 PWA + 重装」，但不需要用户离开 app。
 */
export async function resetServiceWorker(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch {
    /* ignore — continue with cache + reload */
  }

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n).catch(() => false)));
    }
  } catch {
    /* ignore */
  }

  // reload 之后 vite-plugin-pwa 会重新跑一遍 register + install + activate
  window.location.reload();
}

/**
 * Remove all push subscriptions from Firestore and unsubscribe.
 */
export async function removeAllSubscriptions(userId: string): Promise<void> {
  const snap = await getDocs(collection(db, `users/${userId}/pushSubscriptions`));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));

  const swReg = await navigator.serviceWorker.ready;
  const sub = await swReg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
}
