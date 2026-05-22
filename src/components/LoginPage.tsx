import { motion } from 'motion/react';

interface LoginPageProps {
  onLogin: () => void;
  loginPending: boolean;
  loginError: string | null;
}

const TAGLINE_LINES = [
  'Thoughts create feelings.',
  'Feelings drive actions.',
  'Actions shape you.',
] as const;

export default function LoginPage({ onLogin, loginPending, loginError }: LoginPageProps) {
  return (
    <div
      className="min-h-screen flex flex-col font-sans text-[#2C2C2C] selection:bg-[#E2DFD8]"
      style={{ background: '#F5F2EC' }}
    >
      <main className="flex-1 flex flex-col items-center justify-center px-10 w-full max-w-md mx-auto">
        {/* Möbius strip — single continuous curve with a half-twist at center.
            Sits directly above the wordmark so brand mark + name read as ONE
            composition, not two disconnected elements. Topology: traversing
            the strip puts you on the "other side" without crossing an edge —
            visualizes how thoughts ↔ feelings ↔ actions feed back into each
            other (actions reshape thoughts, not just the reverse). */}
        <motion.svg
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          viewBox="0 0 100 40"
          width="140"
          height="56"
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
          className="mb-6"
          aria-hidden
        >
          {/* Strand A: top-left → crosses center → bottom-right */}
          <path d="M 10 20 C 10 6, 30 6, 50 20 C 70 34, 90 34, 90 20" />
          {/* Strand B: top-right → gap at center (visible twist) → bottom-left */}
          <path d="M 90 20 C 90 6, 70 6, 56 17" />
          <path d="M 44 23 C 30 34, 10 34, 10 20" />
        </motion.svg>

        {/* Brand wordmark */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif font-medium text-[#1A1A1A] leading-none whitespace-nowrap"
          style={{ fontSize: 'clamp(52px, 14vw, 76px)', letterSpacing: '0.01em' }}
        >
          Loop
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="text-[#5A5754] text-[14px] leading-relaxed italic font-serif text-center mt-12 space-y-0.5"
        >
          {TAGLINE_LINES.map((line, i) => (
            <p key={i}>
              {i === TAGLINE_LINES.length - 1 ? (
                <>
                  Actions shape{' '}
                  <span className="text-[#1A1A1A] not-italic font-medium">you</span>.
                </>
              ) : (
                line
              )}
            </p>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          onClick={onLogin}
          disabled={loginPending}
          className="mt-16 group relative overflow-hidden border border-[#1A1A1A] py-4 px-8 text-[12px] uppercase tracking-[0.2em] text-[#1A1A1A] transition-colors disabled:opacity-50 w-full"
        >
          <span
            className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 bg-[#1A1A1A]"
            aria-hidden
          />
          <span className="relative flex items-center justify-center gap-3 group-hover:text-[#F5F2EC] transition-colors">
            {/* Google G icon — official multicolor svg */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              className="shrink-0"
              aria-hidden
            >
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            <span>{loginPending ? 'Signing in…' : 'Continue with Google'}</span>
          </span>
        </motion.button>

        {loginError && (
          <p
            className="mt-6 text-xs text-red-600 break-all leading-relaxed text-center"
            role="alert"
          >
            {loginError}
          </p>
        )}
      </main>
    </div>
  );
}
