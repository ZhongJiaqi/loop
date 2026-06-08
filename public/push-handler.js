/* Push notification handler — imported by the PWA service worker
 *
 * iOS 兜底要点（webscraft.org 2026 + PWA-POLICE 综合）：
 *   1. payload 解析必须 try/catch — iOS 偶尔发送非 JSON 测试 payload，
 *      抛错会让 SW crash，iOS 随后自动取消该 subscription，用户被迫
 *      重新订阅，进而再次走 SW init 链路，是反复出 SW 超时的根因之一。
 *   2. 必须始终调用 showNotification — iOS 把没弹通知的 push 视为
 *      "silent push"，连续几次后会自动取消订阅。
 *   3. waitUntil 必须包到 showNotification 上，否则 SW 在显示前被回收。
 */

self.addEventListener('push', (event) => {
  let title = '你还有未完成的任务';
  let body = '';
  let tag = 'daily-reminder';

  try {
    if (event.data) {
      // 优先按 JSON 解析；失败回落到纯文本，避免 SW crash。
      let payload = null;
      try {
        payload = event.data.json();
      } catch {
        const text = event.data.text();
        if (text) body = text;
      }
      if (payload && typeof payload === 'object') {
        if (typeof payload.title === 'string' && payload.title) title = payload.title;
        if (typeof payload.body === 'string') body = payload.body;
        if (typeof payload.tag === 'string' && payload.tag) tag = payload.tag;
      }
    }
  } catch (err) {
    // 即便上面解析全挂，下面仍会用默认文案弹一个通知，保住 subscription。
  }

  const options = {
    body,
    icon: '/icon-192x192.png',
    tag,
  };

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .catch(() => {
        // showNotification 本身极少失败，但若失败也吞掉，避免 SW crash。
      }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
