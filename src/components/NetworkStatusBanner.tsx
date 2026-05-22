import { motion, AnimatePresence } from 'motion/react';
import { NetworkStatus } from '../lib/useNetworkStatus';

interface NetworkStatusBannerProps {
  status: NetworkStatus;
}

function getMessage(status: NetworkStatus): string | null {
  if (!status.online) return '设备未联网，数据无法同步';
  if (status.firestoreReachable === false) {
    return '无法连接到服务器，请检查代理或网络';
  }
  return null;
}

export default function NetworkStatusBanner({ status }: NetworkStatusBannerProps) {
  const message = getMessage(status);
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="network-banner"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          aria-live="polite"
          className="mx-8 mb-3 mt-1 px-4 py-2.5 rounded-md bg-[#FBF4E4] border border-[#E8D9B4] text-[#7A5C2E] text-[12px] leading-snug flex items-start gap-2"
        >
          <span aria-hidden className="text-[#B89758] text-[14px] leading-none mt-[1px]">
            ⚠
          </span>
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
