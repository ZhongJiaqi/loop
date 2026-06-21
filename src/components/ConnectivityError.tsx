interface ConnectivityErrorProps {
  onRetry: () => void;
}

export default function ConnectivityError({ onRetry }: ConnectivityErrorProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-8"
      style={{ background: '#F5F2EC' }}
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-sm w-full text-center">
        <div
          aria-hidden
          className="mx-auto mb-6 w-12 h-12 rounded-full flex items-center justify-center text-[22px]"
          style={{ background: '#FBF4E4', color: '#B89758' }}
        >
          ⚠
        </div>
        <h1
          className="font-serif text-[#1A1A1A] mb-3"
          style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '0.01em' }}
        >
          无法连接到服务器
        </h1>
        <p
          className="text-[#5C5C5C] mb-8 leading-relaxed"
          style={{ fontSize: '14px' }}
        >
          请检查网络连接或代理设置后重试。
          <br />
          数据都保存在云端，重新加载不会丢失。
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-2.5 rounded-full bg-[#1A1A1A] text-white text-[14px] font-medium transition-opacity active:opacity-80"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
