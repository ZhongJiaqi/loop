import { motion } from 'motion/react';

interface LoginPageProps {
  onLogin: () => void;
  loginPending: boolean;
  loginError: string | null;
}

const TAGLINE = 'Thoughts create feelings. Feelings drive actions. Actions shape you.';

export default function LoginPage({ onLogin, loginPending, loginError }: LoginPageProps) {
  return (
    <div
      className="min-h-screen flex flex-col font-sans text-[#2C2C2C] selection:bg-[#E2DFD8]"
      style={{ background: '#F5F2EC' }}
    >
      {/* Möbius strip — single continuous curve with a half-twist at center.
          Topology: traverse it and you end up on the "other side" without
          ever crossing an edge — visualizes how thoughts ↔ feelings ↔ actions
          loop back into each other (actions reshape thoughts, not just the
          reverse). The gap at the crossing implies the over/under twist. */}
      <header className="pt-14 pb-4 flex justify-center">
        <motion.svg
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          viewBox="0 0 100 40"
          width="72"
          height="29"
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden
        >
          {/* Strand A: top-left → crosses center → bottom-right */}
          <path d="M 10 20 C 10 6, 30 6, 50 20 C 70 34, 90 34, 90 20" />
          {/* Strand B: top-right → small gap at center (twist) → bottom-left */}
          <path d="M 90 20 C 90 6, 70 6, 56 17" />
          <path d="M 44 23 C 30 34, 10 34, 10 20" />
        </motion.svg>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-10 w-full max-w-md mx-auto">
        {/* Brand wordmark — Möbius is the new visual hero, no cursor needed */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif font-medium text-[#1A1A1A] leading-none whitespace-nowrap"
          style={{ fontSize: 'clamp(52px, 14vw, 76px)', letterSpacing: '0.01em' }}
        >
          Loop
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="text-[#5A5754] text-[14px] leading-relaxed italic font-serif text-center max-w-[20rem] mt-12"
        >
          {TAGLINE}
        </motion.p>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          onClick={onLogin}
          disabled={loginPending}
          className="mt-16 group relative overflow-hidden border border-[#1A1A1A] py-4 px-10 text-[12px] uppercase tracking-[0.25em] text-[#1A1A1A] transition-colors disabled:opacity-50 w-full"
        >
          <span
            className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 bg-[#1A1A1A]"
            aria-hidden
          />
          <span className="relative group-hover:text-[#F5F2EC] transition-colors">
            {loginPending ? 'Signing in…' : 'Continue with Google'}
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
