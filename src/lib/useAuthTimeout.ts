import { useEffect, useState } from 'react';

// Firebase auth 在网络不通（代理挂掉 / Google 服务不可达）时，onAuthStateChanged
// 不会回调也不会 reject，App 永远 authReady=false → splash 或 skeleton 永远不消失。
// 给一个 10s 兜底窗口：超时仍未 ready 就翻 timedOut=true，UI 据此渲染 ConnectivityError
// 提示用户检查网络/代理，而不是无声卡死。
//
// 10s 取自实测：开代理冷启动 onAuthStateChanged 首回调通常 < 3s；裸网络访问 Google
// 失败时浏览器自身 TCP 超时也在 10-15s 量级。10s 既能覆盖正常慢链路，也能在真挂时
// 及时给反馈。
const DEFAULT_TIMEOUT_MS = 10000;

interface UseAuthTimeoutInput {
  authReady: boolean;
  timeoutMs?: number;
}

export function useAuthTimeout({
  authReady,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseAuthTimeoutInput): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (authReady) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [authReady, timeoutMs]);

  return timedOut;
}
