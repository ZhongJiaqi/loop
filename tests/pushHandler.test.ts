import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * push-handler.js 防回归测试。
 *
 * 关键不变式（iOS PWA 兜底）：
 *  1. event.data.json() 抛错时，handler 不能再抛 → 必须落回纯文本/默认文案；
 *  2. 不论 payload 如何，最终必须调用 showNotification 一次（iOS 把没弹通知
 *     的 push 视为 silent → 取消订阅）；
 *  3. waitUntil 必须被调用一次，确保 SW 在 showNotification 完成前不被回收。
 *
 * push-handler.js 在浏览器 SW 全局跑，不是 ES module，且依赖 self.* 全局。
 * 测试方式：把脚本读进来，构造一个 self 沙箱当作 `globalThis`，用
 * `new Function('self', source)(sandbox)` 注入并跑 addEventListener，
 * 再手动派发 push 事件验证副作用。
 */

interface SwSandbox {
  __pushHandler?: (event: unknown) => void;
  __notifyHandler?: (event: unknown) => void;
  registration: { showNotification: ReturnType<typeof vi.fn> };
  clients: { openWindow: ReturnType<typeof vi.fn> };
  addEventListener: (name: string, handler: (event: unknown) => void) => void;
}

function loadHandler(): SwSandbox {
  const source = readFileSync(
    resolve(__dirname, '../public/push-handler.js'),
    'utf-8',
  );
  const sandbox: SwSandbox = {
    registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
    clients: { openWindow: vi.fn().mockResolvedValue(undefined) },
    addEventListener(name, handler) {
      if (name === 'push') this.__pushHandler = handler;
      if (name === 'notificationclick') this.__notifyHandler = handler;
    },
  };
  // 给 self 也加一个引用，push-handler 里 self.registration / self.addEventListener
  // 都通过传入的 sandbox 解析。
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('self', 'clients', source)(sandbox, sandbox.clients);
  return sandbox;
}

interface MockPushEvent {
  data: { json: () => unknown; text: () => string } | null;
  waitUntilPromises: Promise<unknown>[];
  waitUntil: (p: Promise<unknown>) => void;
}

function makePushEvent(
  data: MockPushEvent['data'],
): MockPushEvent {
  const event: MockPushEvent = {
    data,
    waitUntilPromises: [],
    waitUntil(p) {
      this.waitUntilPromises.push(p);
    },
  };
  return event;
}

describe('push-handler.js', () => {
  let sw: SwSandbox;

  beforeEach(() => {
    sw = loadHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title/body/tag from valid JSON payload', async () => {
    const event = makePushEvent({
      json: () => ({ title: 'Hi', body: 'do it', tag: 'reminder' }),
      text: () => '{}',
    });
    sw.__pushHandler!(event);
    await Promise.all(event.waitUntilPromises);
    expect(sw.registration.showNotification).toHaveBeenCalledTimes(1);
    expect(sw.registration.showNotification).toHaveBeenCalledWith(
      'Hi',
      expect.objectContaining({ body: 'do it', tag: 'reminder' }),
    );
  });

  it('falls back to text() when JSON parsing throws (iOS 非 JSON payload)', async () => {
    const event = makePushEvent({
      json: () => {
        throw new SyntaxError('Unexpected token');
      },
      text: () => 'naked text from iOS test push',
    });
    expect(() => sw.__pushHandler!(event)).not.toThrow();
    await Promise.all(event.waitUntilPromises);
    expect(sw.registration.showNotification).toHaveBeenCalledTimes(1);
    const [title, options] = sw.registration.showNotification.mock.calls[0];
    expect(title).toBe('你还有未完成的任务');
    expect((options as { body: string }).body).toBe('naked text from iOS test push');
  });

  it('still shows a notification when event.data is null (iOS empty test push)', async () => {
    const event = makePushEvent(null);
    expect(() => sw.__pushHandler!(event)).not.toThrow();
    await Promise.all(event.waitUntilPromises);
    expect(sw.registration.showNotification).toHaveBeenCalledTimes(1);
    const [title] = sw.registration.showNotification.mock.calls[0];
    expect(title).toBe('你还有未完成的任务');
  });

  it('never lets an exception escape, even if both json() and text() throw', async () => {
    const event = makePushEvent({
      json: () => {
        throw new Error('json boom');
      },
      text: () => {
        throw new Error('text boom');
      },
    });
    expect(() => sw.__pushHandler!(event)).not.toThrow();
    await Promise.all(event.waitUntilPromises);
    // 关键不变式：仍然弹出一个默认通知，保住 subscription
    expect(sw.registration.showNotification).toHaveBeenCalledTimes(1);
  });

  it('calls waitUntil exactly once per push so iOS does not treat it as silent', () => {
    const event = makePushEvent({
      json: () => ({ title: 'X' }),
      text: () => '',
    });
    sw.__pushHandler!(event);
    expect(event.waitUntilPromises).toHaveLength(1);
  });

  it('notificationclick opens window root', async () => {
    const close = vi.fn();
    const event = {
      notification: { close },
      waitUntilPromises: [] as Promise<unknown>[],
      waitUntil(p: Promise<unknown>) {
        this.waitUntilPromises.push(p);
      },
    };
    sw.__notifyHandler!(event);
    expect(close).toHaveBeenCalledTimes(1);
    expect(sw.clients.openWindow).toHaveBeenCalledWith('/');
  });
});
