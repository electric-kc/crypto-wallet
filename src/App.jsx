import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTokenPrices } from './services/coingecko.js';
import {
  generateKeypair,
  encryptPrivKey,
  decryptPrivKey,
  saveKeystore,
  loadKeystore,
  hasKeystore,
  clearKeystore,
} from './services/keystore.js';
import {
  isWebAuthnAvailable,
  setupWebAuthn,
  unlockWithWebAuthn,
  setupPIN,
  unlockWithPIN,
  verifyPIN,
} from './services/auth.js';
import {
  validateUsername,
  checkUsernameAvailability,
  getBalance,
  getMPCWallets,
  buildAndSign,
  broadcastTx,
  formatOST,
} from './services/omnistar.js';
import {
  House, Clock, LayoutGrid, User,
  ArrowUp, ArrowDown, ArrowLeftRight,
  Link as LinkIcon, Copy, Shield,
  ChevronLeft, ChevronRight, X, Plus,
  AlertTriangle, Lock, Fingerprint,
  CheckCircle2, Loader,
} from 'lucide-react';

// ─── DESIGN SYSTEM ──────────────────────────────────────────────────────────

const GlassCard = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`backdrop-blur-xl bg-white/5 border border-white/15 rounded-[24px] shadow-2xl transition-all duration-300 active:scale-[0.98] cursor-pointer ${className}`}
  >
    {children}
  </div>
);

const GradientText = ({ children, className = '' }) => (
  <span className={`bg-gradient-to-br from-[#6C63FF] to-[#A855F7] bg-clip-text text-transparent ${className}`}>
    {children}
  </span>
);

const Toggle = ({ enabled, onChange }) => (
  <div
    onClick={onChange}
    className={`w-12 h-6 rounded-full transition-all duration-500 cursor-pointer relative ${enabled ? 'bg-gradient-to-r from-[#6C63FF] to-[#A855F7]' : 'bg-white/10 border border-white/10'}`}
  >
    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${enabled ? 'translate-x-6 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : ''}`} />
  </div>
);

const BottomSheet = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-0 pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="w-full max-w-lg pointer-events-auto animate-in slide-in-from-bottom duration-500 ease-out">
        <GlassCard className="rounded-b-none border-b-0 pb-12 pt-4 px-6">
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X size={20} className="text-white/60" /></button>
          </div>
          {children}
        </GlassCard>
      </div>
    </div>
  );
};

// ─── MPC CHAIN DEFINITIONS ───────────────────────────────────────────────────

const MPC_CHAINS = [
  { id: 'BTC',  name: 'Bitcoin',   symbol: 'BTC',  coinGeckoId: 'bitcoin',     icon: '₿',  color: 'from-orange-400 to-yellow-500' },
  { id: 'ETH',  name: 'Ethereum',  symbol: 'ETH',  coinGeckoId: 'ethereum',    icon: '♦',  color: 'from-blue-400 to-indigo-500' },
  { id: 'XRP',  name: 'XRP',       symbol: 'XRP',  coinGeckoId: 'ripple',      icon: '✕',  color: 'from-gray-300 to-gray-500' },
  { id: 'SOL',  name: 'Solana',    symbol: 'SOL',  coinGeckoId: 'solana',      icon: '◎',  color: 'from-purple-400 to-green-400' },
  { id: 'AVAX', name: 'Avalanche', symbol: 'AVAX', coinGeckoId: 'avalanche-2', icon: '▲',  color: 'from-red-500 to-red-700' },
  { id: 'DOGE', name: 'Dogecoin',  symbol: 'DOGE', coinGeckoId: 'dogecoin',    icon: 'Ð',  color: 'from-yellow-400 to-yellow-600' },
  { id: 'SHIB', name: 'Shiba Inu', symbol: 'SHIB', coinGeckoId: 'shiba-inu',   icon: '🐕', color: 'from-orange-600 to-red-600' },
  { id: 'ADA',  name: 'Cardano',   symbol: 'ADA',  coinGeckoId: 'cardano',     icon: '⧫',  color: 'from-blue-600 to-cyan-600' },
  { id: 'BASE', name: 'Base',      symbol: 'ETH',  coinGeckoId: 'ethereum',    icon: '🔵', color: 'from-blue-500 to-blue-700' },
];

// ─── ONBOARDING FLOW ─────────────────────────────────────────────────────────

const PINKeypad = ({ pin, onChange, maxLen = 6 }) => {
  const handleDigit = (d) => { if (pin.length < maxLen) onChange(pin + d); };
  const handleBack = () => onChange(pin.slice(0, -1));
  return (
    <div className="space-y-4">
      {/* Dots */}
      <div className="flex justify-center gap-4 py-4">
        {Array.from({ length: maxLen }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-gradient-to-br from-[#6C63FF] to-[#A855F7] scale-110' : 'bg-white/15'}`} />
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
          key === '' ? <div key={i} /> :
          <button
            key={i}
            onClick={() => key === '⌫' ? handleBack() : handleDigit(key)}
            className="h-14 bg-white/5 border border-white/10 rounded-2xl text-xl font-bold text-white active:bg-white/20 active:scale-95 transition-all"
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
};

const OnboardingFlow = ({ step, setStep, onComplete }) => {
  // Welcome
  if (step === 'welcome') return <WelcomeStep onNext={() => setStep('username')} />;
  if (step === 'username') return <UsernameStep onNext={(u, kp) => { onComplete('keypair', { username: u, keypair: kp }); setStep('security'); }} />;
  if (step === 'security') return <SecurityStep onNext={(authData) => { onComplete('auth', authData); setStep('fund'); }} />;
  if (step === 'fund') return <FundStep onNext={() => setStep('create-safe')} />;
  if (step === 'create-safe') return <CreateSafeStep onNext={() => setStep('done')} />;
  return null;
};

const WelcomeStep = ({ onNext }) => (
  <div className="flex flex-col items-center justify-center h-full px-8 space-y-10 animate-in fade-in duration-500">
    <div className="space-y-4 text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#A855F7] flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-purple-500/30 mx-auto animate-pulse-glow">
        OS
      </div>
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight"><GradientText>Omnistar</GradientText></h1>
        <p className="text-white/50 text-sm mt-2">Your MPC-powered multichain wallet</p>
      </div>
    </div>
    <div className="space-y-3 w-full">
      <p className="text-center text-xs text-white/30 px-4">Open an account in seconds. No seed phrase. Secured by your biometrics.</p>
      <button
        onClick={onNext}
        className="w-full py-4 bg-gradient-to-r from-[#6C63FF] to-[#A855F7] rounded-2xl font-bold text-white text-base shadow-2xl shadow-purple-500/30 active:scale-[0.98] transition-transform"
      >
        Get Started
      </button>
    </div>
  </div>
);

const UsernameStep = ({ onNext }) => {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [suggestion, setSuggestion] = useState('');
  const [generating, setGenerating] = useState(false);
  const debounceRef = useRef(null);

  const formatErr = validateUsername(username);

  useEffect(() => {
    if (formatErr || !username) { setAvailable(null); return; }
    clearTimeout(debounceRef.current);
    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      const res = await checkUsernameAvailability(username);
      setAvailable(res.available);
      setSuggestion(res.suggestion || '');
      setChecking(false);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [username]);

  const handleContinue = async () => {
    setGenerating(true);
    const keypair = generateKeypair();
    setGenerating(false);
    onNext(username, keypair);
  };

  const canContinue = !formatErr && available === true && !checking && !generating;

  return (
    <div className="flex flex-col h-full px-6 pt-14 pb-8 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-white">Choose a username</h2>
        <p className="text-white/40 text-sm">Your on-chain identity. Others send to <span className="text-white/70">@you</span> by name.</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold text-lg">@</span>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase())}
            placeholder="alice.smith"
            className="w-full bg-white/5 border border-white/15 rounded-2xl py-4 pl-9 pr-4 text-white font-bold text-lg placeholder:text-white/20 outline-none focus:border-[#6C63FF]/60"
            autoComplete="off"
            autoCapitalize="none"
          />
        </div>

        {/* Status line */}
        <div className="h-5 px-1">
          {username && formatErr && <p className="text-xs text-red-400">{formatErr}</p>}
          {checking && <p className="text-xs text-white/40 flex items-center gap-1"><Loader size={10} className="animate-spin" /> Checking availability…</p>}
          {!checking && available === true && !formatErr && (
            <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={10} /> @{username} is available</p>
          )}
          {!checking && available === false && (
            <p className="text-xs text-red-400">
              @{username} is taken.{suggestion ? ` Try @${suggestion}?` : ''}
            </p>
          )}
        </div>

        <div className="text-[10px] text-white/25 px-1 space-y-0.5">
          <p>Letters, numbers, and dots only. Min 2 chars.</p>
          <p>Cannot start/end with a dot or have consecutive dots.</p>
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${canContinue ? 'bg-gradient-to-r from-[#6C63FF] to-[#A855F7] text-white shadow-lg shadow-purple-500/20 active:scale-[0.98]' : 'bg-white/5 text-white/20'}`}
        >
          {generating ? 'Creating keys…' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

const SecurityStep = ({ onNext }) => {
  const [mode, setMode] = useState('choose'); // 'choose' | 'pin' | 'pin-confirm'
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const webAuthnOk = isWebAuthnAvailable();

  const handleBiometrics = async () => {
    setLoading(true);
    const result = await setupWebAuthn('wallet-user');
    setLoading(false);
    if (result) {
      onNext({ method: 'webauthn', credentialId: result.credentialId, encryptionKey: result.encryptionKey });
    } else {
      setError('Biometrics unavailable. Please use PIN.');
      setMode('pin');
    }
  };

  const handlePINSet = async () => {
    if (pin.length < 6) return;
    if (mode === 'pin') { setMode('pin-confirm'); setPinConfirm(''); return; }
    if (mode === 'pin-confirm') {
      if (pin !== pinConfirm) { setError('PINs do not match. Try again.'); setMode('pin'); setPin(''); setPinConfirm(''); return; }
      setLoading(true);
      const { salt, encryptionKey } = await setupPIN(pin);
      setLoading(false);
      onNext({ method: 'pin', salt, encryptionKey });
    }
  };

  useEffect(() => {
    if (mode === 'pin' && pin.length === 6) handlePINSet();
    if (mode === 'pin-confirm' && pinConfirm.length === 6) handlePINSet();
  }, [pin, pinConfirm, mode]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <Loader size={40} className="animate-spin text-[#A855F7]" />
      <p className="text-white/60">Setting up security…</p>
    </div>
  );

  if (mode === 'choose') return (
    <div className="flex flex-col h-full px-6 pt-14 pb-8 space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-white">Secure your wallet</h2>
        <p className="text-white/40 text-sm">Choose how you unlock the app and sign transactions.</p>
      </div>

      <div className="space-y-3 mt-4">
        {webAuthnOk && (
          <GlassCard className="p-5 space-y-4" onClick={handleBiometrics}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#A855F7] flex items-center justify-center flex-shrink-0">
                <Fingerprint size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Face ID / Touch ID</h3>
                <p className="text-xs text-white/40 mt-1">Recommended – fastest and most secure. Your face unlocks your wallet.</p>
                <span className="inline-block mt-2 text-[10px] font-bold text-[#A855F7] bg-[#A855F7]/10 px-2 py-0.5 rounded-full">RECOMMENDED</span>
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard className="p-5 space-y-4" onClick={() => setMode('pin')}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Lock size={24} className="text-white/70" />
            </div>
            <div>
              <h3 className="font-bold text-white">6-Digit PIN</h3>
              <p className="text-xs text-white/40 mt-1">{webAuthnOk ? 'Use as a fallback.' : 'Set a PIN to unlock.'} Derived with 210,000 PBKDF2 iterations.</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
    </div>
  );

  return (
    <div className="flex flex-col h-full px-6 pt-14 pb-8 space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <button onClick={() => { setMode('choose'); setPin(''); setError(''); }} className="flex items-center gap-1 text-white/40 text-sm mb-2">
          <ChevronLeft size={16} /> Back
        </button>
        <h2 className="text-3xl font-black text-white">
          {mode === 'pin' ? 'Set your PIN' : 'Confirm PIN'}
        </h2>
        <p className="text-white/40 text-sm">{mode === 'pin' ? 'Enter a 6-digit PIN.' : 'Enter your PIN again to confirm.'}</p>
      </div>
      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
      <PINKeypad pin={mode === 'pin' ? pin : pinConfirm} onChange={mode === 'pin' ? setPin : setPinConfirm} />
    </div>
  );
};

const FundStep = ({ onNext, address }) => {
  const [balance, setBalance] = useState('0');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) return;
    const poll = async () => {
      const b = await getBalance(address);
      setBalance(b.ost);
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [address]);

  const handleCopy = () => {
    if (address) navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasFunds = parseFloat(balance) > 0;

  return (
    <div className="flex flex-col h-full px-6 pt-14 pb-8 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-white">Fund your wallet</h2>
        <p className="text-white/40 text-sm">Send a small amount of OST to cover setup fees (~0.000005 OST).</p>
      </div>

      <GlassCard className="p-6 space-y-6 text-center">
        {/* QR placeholder */}
        <div className="w-40 h-40 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <div className="grid grid-cols-5 gap-1 opacity-20">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={`w-5 h-5 rounded-sm ${Math.random() > 0.5 ? 'bg-white' : ''}`} />
            ))}
          </div>
        </div>

        {/* Address */}
        <button onClick={handleCopy} className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl active:bg-white/10">
          <span className="text-xs font-mono text-white/60 truncate">{address || 'omnistar1…'}</span>
          <span className={`text-xs font-bold flex-shrink-0 ${copied ? 'text-green-400' : 'text-[#A855F7]'}`}>
            {copied ? 'Copied!' : <Copy size={14} />}
          </span>
        </button>

        {/* Balance */}
        <div className="text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Balance</p>
          <p className={`text-2xl font-black ${hasFunds ? 'text-green-400' : 'text-white/30'}`}>{balance} OST</p>
        </div>
      </GlassCard>

      <div className="mt-auto space-y-3">
        <button
          onClick={onNext}
          disabled={!hasFunds}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${hasFunds ? 'bg-gradient-to-r from-[#6C63FF] to-[#A855F7] text-white shadow-lg shadow-purple-500/20 active:scale-[0.98]' : 'bg-white/5 text-white/20'}`}
        >
          {hasFunds ? 'Continue' : 'Waiting for funds…'}
        </button>
        <button onClick={onNext} className="w-full py-2 text-xs text-white/30 active:text-white/60">
          Skip for now
        </button>
      </div>
    </div>
  );
};

const CreateSafeStep = ({ onNext, username, address, pubKeyBase64, privKey }) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'broadcasting' | 'provisioning' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [txhash, setTxhash] = useState('');
  const [activeChains, setActiveChains] = useState([]);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef(null);

  // Poll getMPCWallets every 30s after broadcast until all 9 addresses are present
  useEffect(() => {
    if (status !== 'provisioning') return;
    const check = async () => {
      const wallets = await getMPCWallets(address);
      const chains = MPC_CHAINS.map(c => c.id);
      const ready = chains.filter(id => wallets[id] && wallets[id].length > 0);
      if (ready.length === chains.length) {
        clearInterval(pollRef.current);
        for (const id of ready) {
          await new Promise(r => setTimeout(r, 300));
          setActiveChains(prev => [...prev, id]);
        }
        setStatus('success');
      } else {
        setPollCount(n => n + 1);
      }
    };
    check();
    pollRef.current = setInterval(check, 30_000);
    return () => clearInterval(pollRef.current);
  }, [status, address]);

  const handleCreate = async () => {
    setStatus('broadcasting');
    try {
      const { signature } = await buildAndSign({ creator: address, username, pubKeyBase64, privKey });
      const result = await broadcastTx(signature);
      if (result.code !== 0) throw new Error(result.rawLog);
      setTxhash(result.txhash || '');
      setStatus('provisioning');
    } catch (e) {
      setErrorMsg(String(e));
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-14 pb-8 space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-white">Create your wallets</h2>
        <p className="text-white/40 text-sm">This broadcasts a transaction that sets up MPC wallets for 9 chains.</p>
      </div>

      {/* Chain grid */}
      <div className="grid grid-cols-3 gap-3">
        {MPC_CHAINS.map((chain) => {
          const isActive = activeChains.includes(chain.id);
          return (
            <GlassCard key={chain.id} className={`p-3 flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'border-green-500/40 bg-green-500/5' : ''}`}>
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${chain.color} flex items-center justify-center text-lg transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-40 grayscale'}`}>
                {chain.icon}
              </div>
              <span className={`text-[9px] font-bold transition-colors ${isActive ? 'text-white' : 'text-white/30'}`}>{chain.id}</span>
              {isActive && <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />}
            </GlassCard>
          );
        })}
      </div>

      {(status === 'provisioning' || status === 'success') && txhash && (
        <TxHashRow txhash={txhash} />
      )}
      {status === 'provisioning' && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-white/50 text-center">Omnistar is provisioning your wallets…</p>
          <p className="text-[10px] text-white/25">Checking every 30s · scan #{pollCount + 1}</p>
        </div>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-400 px-1">{errorMsg || 'Transaction failed. Try again.'}</p>
      )}

      <div className="mt-auto space-y-3">
        {status === 'success' ? (
          <button
            onClick={onNext}
            className="w-full py-4 bg-gradient-to-r from-[#6C63FF] to-[#A855F7] rounded-2xl font-bold text-white text-base shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-transform"
          >
            Enter Wallet
          </button>
        ) : (
          <button
            onClick={status === 'broadcasting' || status === 'provisioning' ? undefined : handleCreate}
            disabled={status === 'broadcasting' || status === 'provisioning'}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${status === 'broadcasting' || status === 'provisioning' ? 'bg-white/5 text-white/40' : 'bg-gradient-to-r from-[#6C63FF] to-[#A855F7] text-white shadow-lg shadow-purple-500/20 active:scale-[0.98]'}`}
          >
            {status === 'broadcasting'
              ? <span className="flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> Broadcasting…</span>
              : status === 'provisioning'
              ? <span className="flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> Provisioning…</span>
              : status === 'error' ? 'Retry' : 'Create Wallets'}
          </button>
        )}
        <p className="text-center text-[10px] text-white/20">Estimated fee: ~0.000005 OST</p>
      </div>
    </div>
  );
};

// ─── LOCK SCREEN ─────────────────────────────────────────────────────────────

const LockScreen = ({ keystoreEntry, onUnlock }) => {
  const [mode, setMode] = useState('biometric'); // 'biometric' | 'pin'
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [loading, setLoading] = useState(false);

  const locked = lockoutUntil && Date.now() < lockoutUntil;
  const secondsLeft = locked ? Math.ceil((lockoutUntil - Date.now()) / 1000) : 0;

  const tryUnlock = useCallback(async (key) => {
    try {
      const privKey = await decryptPrivKey(keystoreEntry.encryptedPrivKey, keystoreEntry.iv, key);
      onUnlock(privKey);
    } catch {
      return false;
    }
    return true;
  }, [keystoreEntry, onUnlock]);

  const handleBiometric = async () => {
    setLoading(true);
    setError('');
    const key = await unlockWithWebAuthn(keystoreEntry.credentialId);
    if (key) {
      await tryUnlock(key);
    } else {
      setError('Biometric failed. Use PIN instead.');
      setMode('pin');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (keystoreEntry?.authMethod === 'webauthn') {
      handleBiometric();
    } else {
      setMode('pin');
    }
  }, []);

  useEffect(() => {
    if (mode === 'pin' && pin.length === 6) handlePIN();
  }, [pin]);

  const handlePIN = async () => {
    if (locked) return;
    setLoading(true);
    setError('');
    const key = await unlockWithPIN(pin, keystoreEntry.salt);
    const ok = await tryUnlock(key);
    setLoading(false);
    if (!ok) {
      const next = attempts + 1;
      setAttempts(next);
      setPin('');
      if (next >= 5) {
        setLockoutUntil(Date.now() + 30000);
        setError('Too many attempts. Wait 30s.');
        setAttempts(0);
      } else {
        setError(`Incorrect PIN (${5 - next} tries left).`);
      }
    }
  };

  const shortAddr = keystoreEntry?.address ? keystoreEntry.address.slice(0, 10) + '…' + keystoreEntry.address.slice(-4) : '';

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 pb-8 space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#A855F7] flex items-center justify-center text-2xl font-black text-white shadow-2xl shadow-purple-500/30 mx-auto">
          OS
        </div>
        <div>
          <p className="text-white font-bold">@{keystoreEntry?.username || 'wallet'}</p>
          <p className="text-white/30 text-xs font-mono mt-0.5">{shortAddr}</p>
        </div>
      </div>

      {loading ? (
        <Loader size={32} className="animate-spin text-[#A855F7]" />
      ) : mode === 'biometric' ? (
        <div className="space-y-4 w-full">
          <button
            onClick={handleBiometric}
            className="w-full py-4 bg-gradient-to-r from-[#6C63FF] to-[#A855F7] rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Fingerprint size={20} /> Unlock with Biometrics
          </button>
          <button onClick={() => setMode('pin')} className="w-full py-2 text-xs text-white/40 active:text-white/70">
            Use PIN instead
          </button>
        </div>
      ) : (
        <div className="w-full space-y-4">
          {locked ? (
            <p className="text-center text-sm text-amber-400">Wait {secondsLeft}s before trying again.</p>
          ) : (
            <>
              {error && <p className="text-center text-xs text-red-400">{error}</p>}
              <PINKeypad pin={pin} onChange={setPin} />
              {keystoreEntry?.authMethod === 'webauthn' && (
                <button onClick={() => { setMode('biometric'); setPin(''); setError(''); }} className="w-full py-2 text-xs text-white/40">
                  Use biometrics instead
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const TxHashRow = ({ txhash }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(txhash).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl active:bg-white/10"
    >
      <span className="text-[9px] text-white/30 uppercase tracking-wider flex-shrink-0">TX</span>
      <span className="flex-1 text-[10px] font-mono text-white/50 truncate">{txhash}</span>
      <span className={`text-[10px] flex-shrink-0 ${copied ? 'text-green-400' : 'text-white/30'}`}>{copied ? '✓' : <Copy size={10} />}</span>
    </button>
  );
};

// ─── WALLET TAB ───────────────────────────────────────────────────────────────

const WalletTab = ({ wallet, mpcLastChecked, onInitWallets, initStatus, initTxhash, initError }) => {
  const [activeSubTab, setActiveSubTab] = useState('TOKENS');
  const [sheet, setSheet] = useState(null);
  const [selectedChain, setSelectedChain] = useState(null);
  const [prices, setPrices] = useState(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getTokenPrices().then(setPrices).catch(() => setPrices({}));
  }, []);

  const fiatValue = (coinGeckoId, bal) => {
    if (!prices || !bal) return null;
    const p = prices[coinGeckoId]?.usd;
    return p != null ? bal * p : null;
  };

  const portfolioTotal = MPC_CHAINS.reduce((sum, c) => {
    const v = fiatValue(c.coinGeckoId, 0);
    return sum + (v ?? 0);
  }, 0);

  const initials = wallet.username ? wallet.username.slice(0, 2).toUpperCase() : 'OS';
  const shortAddr = wallet.address ? wallet.address.slice(0, 10) + '…' + wallet.address.slice(-4) : '';
  const [copied, setCopied] = useState(false);

  const handleCopyAddr = () => {
    navigator.clipboard.writeText(wallet.address || '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="pt-12 pb-24 px-6 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center space-y-3">
        <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Portfolio Value</p>
        <h1 className="text-5xl font-bold text-white tracking-tight">
          {prices === null
            ? <span className="text-white/30 animate-pulse">Loading…</span>
            : <><span className="text-3xl text-white/60">$</span>{portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
          }
        </h1>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-[#A855F7]">@{wallet.username}</span>
          <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-mono text-white/30">{wallet.ostBalance || '0.0000'} OST</span>
        </div>

        <button onClick={handleCopyAddr} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full active:bg-white/10 transition-colors">
          <span className="text-white/60 text-xs font-mono">{shortAddr}</span>
          <span className={`text-[10px] ${copied ? 'text-green-400' : 'text-white/30'}`}>{copied ? '✓' : <Copy size={10} />}</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: ArrowUp, label: 'SEND' },
          { icon: ArrowDown, label: 'RECEIVE' },
          { icon: ArrowLeftRight, label: 'SWAP' },
          { icon: LinkIcon, label: 'BRIDGE' },
        ].map((btn) => (
          <button key={btn.label} onClick={() => setSheet(btn.label)} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/5 border border-white/15 flex items-center justify-center group-active:scale-90 transition-transform">
              <btn.icon className="text-[#A855F7]" size={24} />
            </div>
            <span className="text-[10px] font-bold text-white/60 tracking-wider">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="relative p-1 bg-white/5 border border-white/10 rounded-2xl flex">
        {['TOKENS', 'NFTs'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 py-2 text-xs font-bold transition-all duration-300 rounded-xl ${activeSubTab === tab ? 'bg-white/10 text-white shadow-lg' : 'text-white/40'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* MPC provisioning status */}
      {(() => {
        const ready = MPC_CHAINS.filter(c => wallet.mpcWallets?.[c.id]).length;
        const total = MPC_CHAINS.length;
        if (ready === total) return null;

        // No wallets at all + tx never sent (or errored) → show init button
        const needsInit = ready === 0 && (initStatus === 'idle' || initStatus === 'error');
        if (needsInit) return (
          <div className="space-y-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
              <p className="text-[11px] font-semibold text-yellow-300">Wallets not initialized</p>
            </div>
            <p className="text-[10px] text-white/40">The setup transaction was never sent. Tap below to broadcast it now.</p>
            {initStatus === 'error' && <p className="text-[10px] text-red-400 break-all">{initError || 'Broadcast failed — check your connection.'}</p>}
            <button
              onClick={onInitWallets}
              className="w-full py-2.5 bg-gradient-to-r from-[#6C63FF] to-[#A855F7] rounded-xl font-bold text-xs text-white active:scale-[0.98] transition-transform"
            >
              Initialize Wallets
            </button>
          </div>
        );

        // Tx sent (broadcasting, done, or provisioning) → show progress
        return (
          <div className="space-y-2">
            {initStatus === 'broadcasting' && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                <Loader size={12} className="animate-spin text-purple-400 flex-shrink-0" />
                <p className="text-[11px] text-purple-300">Broadcasting transaction…</p>
              </div>
            )}
            {initTxhash ? (
              <TxHashRow txhash={initTxhash} />
            ) : null}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
              <Loader size={12} className="animate-spin text-purple-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-purple-300">Provisioning MPC wallets…</p>
                <p className="text-[10px] text-white/30">
                  {mpcLastChecked
                    ? `Last checked ${Math.round((Date.now() - mpcLastChecked) / 1000)}s ago · next in ${Math.max(0, 30 - Math.round((Date.now() - mpcLastChecked) / 1000))}s`
                    : 'Checking…'}
                </p>
              </div>
              <span className="text-[10px] text-white/20 flex-shrink-0">{ready}/{total}</span>
            </div>
          </div>
        );
      })()}

      {/* Content */}
      <div className="space-y-3">
        {activeSubTab === 'TOKENS' ? (
          MPC_CHAINS.map((chain) => {
            const mpcAddr = wallet.mpcWallets?.[chain.id] || '';
            const hasAddr = !!mpcAddr;
            const shortMpc = hasAddr ? mpcAddr.slice(0, 6) + '…' + mpcAddr.slice(-4) : null;
            const fiat = fiatValue(chain.coinGeckoId, 0);
            return (
              <GlassCard
                key={chain.id}
                className="p-4 flex items-center gap-4"
                onClick={() => setSelectedChain(chain)}
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${chain.color} flex items-center justify-center text-xl shadow-lg flex-shrink-0`}>
                  {chain.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{chain.name}</span>
                    <span className="font-bold text-white">0.0000 {chain.symbol}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium mt-0.5">
                    {hasAddr ? (
                      <span className="text-emerald-400 font-mono text-[10px]">{shortMpc}</span>
                    ) : (
                      <span className="text-white/25 text-[10px] italic">Provisioning…</span>
                    )}
                    <span className="text-white/40">$0.00</span>
                  </div>
                </div>
              </GlassCard>
            );
          })
        ) : (
          <div className="py-10 text-center space-y-3">
            <p className="text-white/20 text-4xl">🖼️</p>
            <p className="text-white/30 text-sm">No NFTs yet</p>
          </div>
        )}
      </div>

      {/* Action BottomSheet */}
      <BottomSheet isOpen={!!sheet && !selectedChain} onClose={() => setSheet(null)} title={sheet}>
        <div className="py-10 text-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <GradientText className="text-3xl font-bold">✨</GradientText>
          </div>
          <p className="text-white/60">The {sheet} experience is coming soon.</p>
          <button onClick={() => setSheet(null)} className="w-full py-4 bg-white/10 rounded-2xl font-bold text-white">Got it</button>
        </div>
      </BottomSheet>

      {/* Chain address BottomSheet */}
      <BottomSheet isOpen={!!selectedChain} onClose={() => setSelectedChain(null)} title={selectedChain?.name}>
        {selectedChain && (
          <div className="space-y-6">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${selectedChain.color} flex items-center justify-center text-2xl mx-auto`}>
              {selectedChain.icon}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-white/40 uppercase tracking-wider text-center">Wallet Address</p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-xs font-mono text-white/70 break-all text-center">
                  {wallet.mpcWallets?.[selectedChain.id] || 'Address pending MPC setup…'}
                </p>
              </div>
              {wallet.mpcWallets?.[selectedChain.id] && (
                <button
                  onClick={() => { navigator.clipboard.writeText(wallet.mpcWallets[selectedChain.id]).catch(() => {}); }}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-[#A855F7] active:bg-white/10"
                >
                  <Copy size={14} /> Copy Address
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};

// ─── ACTIVITY TAB ─────────────────────────────────────────────────────────────

const ActivityTab = () => {
  const [filter, setFilter] = useState('ALL');
  const txs = [
    { type: 'send',    label: 'Sent OST',        sub: 'To: omnistar1ab…cd', time: '2h ago',    amount: '-100 OST',  fiat: '$0.05', chain: 'Omnistar', color: 'text-red-400' },
    { type: 'receive', label: 'Received BTC',    sub: 'From: bc1q…ef',      time: '5h ago',    amount: '+0.001 BTC', fiat: '$97',   chain: 'BTC',      color: 'text-green-400' },
    { type: 'swap',    label: 'Swapped ETH→SOL', sub: 'via MPC bridge',     time: 'Yesterday', amount: '0.5 ETH',   fiat: '$1,750', chain: 'ETH',     color: 'text-purple-400' },
    { type: 'bridge',  label: 'Bridged to AVAX', sub: 'Moving funds…',      time: '2 days ago', amount: '10 AVAX', fiat: '$280',   chain: 'AVAX',     color: 'text-blue-400' },
  ];

  return (
    <div className="pt-12 pb-24 px-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <h2 className="text-3xl font-bold text-white">Activity</h2>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {['ALL', 'Omnistar', 'BTC', 'ETH', 'SOL'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === f ? 'bg-gradient-to-r from-[#6C63FF] to-[#A855F7] text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 border border-white/10 text-white/40'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {Array(8).fill(0).map((_, i) => {
          const tx = txs[i % txs.length];
          return (
            <GlassCard key={i} className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${tx.color}`}>
                {tx.type === 'send' && <ArrowUp size={20} />}
                {tx.type === 'receive' && <ArrowDown size={20} />}
                {tx.type === 'swap' && <ArrowLeftRight size={20} />}
                {tx.type === 'bridge' && <LinkIcon size={20} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white">{tx.label}</h4>
                    <p className="text-[10px] text-white/40">{tx.sub}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${tx.color}`}>{tx.amount}</span>
                    <p className="text-[10px] text-white/40">{tx.fiat}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-white/20 uppercase tracking-tighter">{tx.time}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-md text-white/60">{tx.chain}</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

// ─── DAPPS TAB (unchanged) ───────────────────────────────────────────────────

const DAppsTab = () => {
  const [browserUrl, setBrowserUrl] = useState(null);
  const iframeRef = useRef(null);

  const favorites = [
    { name: 'Dexalot', url: 'https://app.dexalot.com/swap', color: 'from-blue-600 to-cyan-500', icon: '📈' },
    { name: 'Uniswap', url: 'https://app.uniswap.org', color: 'from-pink-500 to-purple-500', icon: '🦄' },
  ];

  const curated = [
    { name: 'Dexalot', url: 'https://app.dexalot.com/swap', description: 'Non-custodial order-book DEX on Avalanche', gradient: 'from-blue-600 to-cyan-500', icon: '📈' },
    { name: 'Uniswap', url: 'https://app.uniswap.org', description: 'The leading decentralized exchange', gradient: 'from-pink-500 to-rose-500', icon: '🦄' },
  ];

  const goBack = () => { try { iframeRef.current?.contentWindow?.history?.back(); } catch (e) {} };

  return (
    <>
      <div className="pt-12 pb-24 px-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white/80 px-1">Favorites</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {favorites.map((fav, i) => (
              <div key={i} className="flex-shrink-0 w-40 space-y-3 cursor-pointer" onClick={() => setBrowserUrl(fav.url)}>
                <div className={`h-24 w-full rounded-2xl bg-gradient-to-br ${fav.color} flex items-center justify-center text-3xl shadow-lg active:scale-95 transition-transform`}>
                  {fav.icon}
                </div>
                <p className="text-xs font-bold text-white text-center">{fav.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white/80 px-1">Featured</h3>
          <div className="space-y-3">
            {curated.map((d, i) => (
              <GlassCard key={i} className="p-4 flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${d.gradient} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>{d.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white">{d.name}</h4>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{d.description}</p>
                </div>
                <button
                  onClick={() => setBrowserUrl(d.url)}
                  className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-[#6C63FF] to-[#A855F7] rounded-xl text-[11px] font-bold text-white shadow-lg shadow-purple-500/20 active:scale-95 transition-transform"
                >
                  Launch
                </button>
              </GlassCard>
            ))}
          </div>
        </section>
      </div>

      {browserUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#050510]">
          <div className="flex items-center gap-3 px-4 pt-12 pb-3 bg-white/5 border-b border-white/10 flex-shrink-0">
            <button onClick={goBack} className="p-2 rounded-full bg-white/5 active:bg-white/10 transition-colors flex-shrink-0">
              <ChevronLeft size={20} className="text-white" />
            </button>
            <div className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="text-xs text-white/60 font-mono truncate block">{browserUrl}</span>
            </div>
            <button onClick={() => setBrowserUrl(null)} className="p-2 rounded-full bg-white/5 active:bg-white/10 transition-colors flex-shrink-0">
              <X size={20} className="text-white" />
            </button>
          </div>
          <iframe
            ref={iframeRef}
            src={browserUrl}
            className="flex-1 w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope"
            title="dApp Browser"
          />
        </div>
      )}
    </>
  );
};

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────

const ProfileTab = ({ wallet, onLock, onRemoveWallet }) => {
  const [guardians, setGuardians] = useState([]);
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [guardianInput, setGuardianInput] = useState('');
  const [guardianRole, setGuardianRole] = useState('Friend');
  const [guardianError, setGuardianError] = useState('');
  const [biometricsOn, setBiometricsOn] = useState(wallet.authMethod === 'webauthn');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const shortAddr = wallet.address ? wallet.address.slice(0, 12) + '…' + wallet.address.slice(-4) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.address || '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAddGuardian = async () => {
    if (!guardianInput.trim()) { setGuardianError('Enter a username or address.'); return; }
    const input = guardianInput.trim();
    const isAddress = input.startsWith('omnistar1');
    const name = isAddress ? input.slice(0, 10) + '…' : `@${input}`;
    const address = isAddress ? input : `omnistar1resolved_${input}`;
    setGuardians(prev => [...prev, { name, role: guardianRole, address, status: 'pending' }]);
    setGuardianInput('');
    setShowAddGuardian(false);
    setGuardianError('');
  };

  const handleRemoveGuardian = (idx) => {
    setGuardians(prev => prev.filter((_, i) => i !== idx));
  };

  const initials = wallet.username ? wallet.username.slice(0, 2).toUpperCase() : 'OS';

  return (
    <div className="pt-12 pb-24 px-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto no-scrollbar">
      {/* User Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#A855F7] flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-purple-500/20">
          {initials}
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">@{wallet.username}</h2>
          <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full active:bg-white/10">
            <span className="text-[10px] font-mono text-white/40">{shortAddr}</span>
            <span className={`text-[9px] ${copied ? 'text-green-400' : 'text-white/20'}`}>{copied ? '✓' : <Copy size={9} />}</span>
          </button>
          <p className="text-[10px] text-white/20">{wallet.ostBalance || '0.0000'} OST</p>
        </div>
      </div>

      {/* Guardians */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Guardians</h3>
          <span className="text-[10px] text-white/30 font-bold">{guardians.length}/3 set</span>
        </div>
        <p className="text-[10px] text-white/25 px-1 italic">
          Add up to 3 trusted people. 2-of-3 can recover your account if you lose access.
        </p>
        <GlassCard className="p-4 space-y-4">
          {guardians.length === 0 && (
            <p className="text-center text-xs text-white/20 py-2">No guardians yet. Add someone you trust.</p>
          )}
          {guardians.map((g, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#A855F7] flex items-center justify-center text-[10px] font-bold text-white">
                {g.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">{g.name}</p>
                <p className="text-[10px] text-white/40">{g.role}</p>
              </div>
              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${g.status === 'active' ? 'text-green-400 bg-green-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                {g.status}
              </span>
              <button onClick={() => handleRemoveGuardian(i)} className="p-1 text-white/20 active:text-red-400">
                <X size={12} />
              </button>
            </div>
          ))}
          {guardians.length < 3 && (
            <button
              onClick={() => setShowAddGuardian(true)}
              className="w-full py-2 bg-white/5 border border-dashed border-white/20 rounded-xl text-[10px] font-bold text-white/60 flex items-center justify-center gap-2 active:bg-white/10"
            >
              <Plus size={12} /> Add Guardian
            </button>
          )}
        </GlassCard>
      </section>

      {/* Security */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Security</h3>
        <GlassCard className="overflow-hidden">
          <div className="p-4 flex items-center gap-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Fingerprint size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">Biometrics</h4>
              <p className="text-[10px] text-white/40">Face ID / Touch ID to unlock and sign</p>
            </div>
            <Toggle enabled={biometricsOn} onChange={() => setBiometricsOn(!biometricsOn)} />
          </div>
          <button
            onClick={onLock}
            className="p-4 w-full flex items-center gap-4 active:bg-white/5"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
              <Lock size={20} />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-sm font-bold text-white">Lock Wallet</h4>
              <p className="text-[10px] text-white/40">Requires biometrics or PIN to re-open</p>
            </div>
            <ChevronRight size={16} className="text-white/20" />
          </button>
        </GlassCard>
      </section>

      {/* Danger Zone */}
      <section className="pt-4 pb-8">
        <GlassCard className="p-4 space-y-4 border-red-500/20">
          <button className="w-full py-4 border border-white/10 rounded-2xl text-xs font-bold text-white active:bg-white/5">
            Export Recovery Proof
          </button>
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="w-full py-4 text-xs font-bold text-red-400 active:text-red-300"
          >
            Remove Wallet
          </button>
        </GlassCard>
      </section>

      {/* Add Guardian BottomSheet */}
      <BottomSheet isOpen={showAddGuardian} onClose={() => { setShowAddGuardian(false); setGuardianError(''); }} title="Add Guardian">
        <div className="space-y-4">
          <p className="text-xs text-white/40">Enter the guardian's Omnistar username or address. They can help you recover if you lose access.</p>
          <input
            type="text"
            value={guardianInput}
            onChange={e => setGuardianInput(e.target.value)}
            placeholder="@alice or omnistar1abc…"
            className="w-full bg-white/5 border border-white/15 rounded-2xl py-3 px-4 text-white text-sm placeholder:text-white/20 outline-none focus:border-[#6C63FF]/60"
          />
          <div className="flex gap-2">
            {['Friend', 'Family', 'Hardware', 'Backup'].map(role => (
              <button
                key={role}
                onClick={() => setGuardianRole(role)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${guardianRole === role ? 'bg-gradient-to-r from-[#6C63FF] to-[#A855F7] text-white' : 'bg-white/5 text-white/40'}`}
              >
                {role}
              </button>
            ))}
          </div>
          {guardianError && <p className="text-xs text-red-400">{guardianError}</p>}
          <button onClick={handleAddGuardian} className="w-full py-4 bg-gradient-to-r from-[#6C63FF] to-[#A855F7] rounded-2xl font-bold text-white active:scale-[0.98] transition-transform">
            Send Request
          </button>
        </div>
      </BottomSheet>

      {/* Remove Wallet Confirm */}
      <BottomSheet isOpen={showRemoveConfirm} onClose={() => setShowRemoveConfirm(false)} title="Remove Wallet">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">This will delete all local data. Make sure you have guardians set up before removing.</p>
          </div>
          <button
            onClick={async () => { await clearKeystore(); onRemoveWallet(); }}
            className="w-full py-4 bg-red-500/20 border border-red-500/30 rounded-2xl font-bold text-red-400 active:bg-red-500/30"
          >
            Yes, Remove Wallet
          </button>
          <button onClick={() => setShowRemoveConfirm(false)} className="w-full py-2 text-xs text-white/40">Cancel</button>
        </div>
      </BottomSheet>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  // Auth state machine
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'onboarding' | 'locked' | 'unlocked'
  const [onboardingStep, setOnboardingStep] = useState('welcome');

  // Pending onboarding data (in-memory only)
  const pendingRef = useRef({
    username: '', address: '', pubKeyBase64: '',
    credentialId: null, salt: null, encryptionKey: null, privKey: null,
  });

  // Unlocked session
  const [wallet, setWallet] = useState(null);
  const sessionPrivKey = useRef(null);
  const [activeTab, setActiveTab] = useState('wallet');
  const [mpcLastChecked, setMpcLastChecked] = useState(null);
  const [initStatus, setInitStatus] = useState('idle'); // 'idle' | 'broadcasting' | 'done' | 'error'
  const [initTxhash, setInitTxhash] = useState('');
  const [initError, setInitError] = useState('');

  // Initialize: check for existing keystore
  useEffect(() => {
    hasKeystore().then(exists => {
      setAuthState(exists ? 'locked' : 'onboarding');
    }).catch(() => setAuthState('onboarding'));
  }, []);

  // Onboarding completion handler
  const handleOnboardingData = useCallback(async (type, data) => {
    if (type === 'keypair') {
      const { username, keypair } = data;
      pendingRef.current.username = username;
      pendingRef.current.address = keypair.address;
      pendingRef.current.pubKeyBase64 = keypair.pubKeyBase64;
      pendingRef.current.privKey = keypair.privKey;
    }
    if (type === 'auth') {
      const { method, credentialId, salt, encryptionKey } = data;
      pendingRef.current.credentialId = credentialId || null;
      pendingRef.current.salt = salt || null;

      // Encrypt and save the private key
      const { ciphertext, iv } = await encryptPrivKey(pendingRef.current.privKey, encryptionKey);
      // Zero privKey after encryption
      if (pendingRef.current.privKey) { pendingRef.current.privKey.fill(0); pendingRef.current.privKey = null; }

      await saveKeystore({
        encryptedPrivKey: ciphertext,
        iv,
        salt: salt || null,
        credentialId: credentialId || null,
        pubKeyBase64: pendingRef.current.pubKeyBase64,
        address: pendingRef.current.address,
        username: pendingRef.current.username,
        authMethod: method,
      });

      // Re-derive key temporarily for the session (decrypt immediately after saving)
      const privKey = await decryptPrivKey(ciphertext, iv, encryptionKey);
      sessionPrivKey.current = privKey;
    }
  }, []);

  // Called when onboarding step reaches 'done'
  const handleOnboardingDone = useCallback(async () => {
    const entry = await loadKeystore();
    if (!entry) return;
    const mpcWallets = await getMPCWallets(entry.address);
    const balance = await getBalance(entry.address);
    setWallet({
      address: entry.address,
      username: entry.username,
      pubKeyBase64: entry.pubKeyBase64,
      authMethod: entry.authMethod,
      credentialId: entry.credentialId,
      mpcWallets,
      ostBalance: balance.ost,
    });
    setAuthState('unlocked');
  }, []);

  // Called after onboarding 'done' step
  useEffect(() => {
    if (onboardingStep === 'done') {
      handleOnboardingDone();
    }
  }, [onboardingStep]);

  // Background poll for MPC wallets until all addresses are provisioned
  useEffect(() => {
    if (authState !== 'unlocked' || !wallet) return;
    const allReady = MPC_CHAINS.every(c => wallet.mpcWallets?.[c.id]);
    if (allReady) return;
    const poll = async () => {
      const mpcWallets = await getMPCWallets(wallet.address);
      setMpcLastChecked(new Date());
      setWallet(w => ({ ...w, mpcWallets }));
    };
    poll(); // check immediately on mount
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [authState, wallet?.address, MPC_CHAINS.every(c => wallet?.mpcWallets?.[c.id])]);

  // Unlock handler
  const handleUnlock = useCallback(async (privKey) => {
    sessionPrivKey.current = privKey;
    const entry = await loadKeystore();
    if (!entry) return;
    const mpcWallets = await getMPCWallets(entry.address);
    const balance = await getBalance(entry.address);
    setWallet({
      address: entry.address,
      username: entry.username,
      pubKeyBase64: entry.pubKeyBase64,
      authMethod: entry.authMethod,
      credentialId: entry.credentialId,
      mpcWallets,
      ostBalance: balance.ost,
    });
    // Restore init tx state so "Wallets not initialized" doesn't reappear after refresh
    const savedTx = localStorage.getItem(`init_tx_${entry.address}`);
    if (savedTx) { setInitTxhash(savedTx); setInitStatus('done'); }
    setAuthState('unlocked');
  }, []);

  // Lock handler
  const handleLock = useCallback(() => {
    if (sessionPrivKey.current) { sessionPrivKey.current.fill(0); sessionPrivKey.current = null; }
    setWallet(null);
    setAuthState('locked');
  }, []);

  // Remove wallet handler
  const handleRemoveWallet = useCallback(() => {
    if (sessionPrivKey.current) { sessionPrivKey.current.fill(0); sessionPrivKey.current = null; }
    setWallet(null);
    setOnboardingStep('welcome');
    setAuthState('onboarding');
  }, []);

  // Keystore for lock screen
  const [keystoreEntry, setKeystoreEntry] = useState(null);
  useEffect(() => {
    if (authState === 'locked') {
      loadKeystore().then(setKeystoreEntry).catch(() => {});
    }
  }, [authState]);

  // Failsafe: re-broadcast Create Safe from main wallet if it was never sent
  const handleInitWallets = useCallback(async () => {
    if (!wallet || !sessionPrivKey.current) return;
    setInitStatus('broadcasting');
    try {
      const { signature } = await buildAndSign({
        creator: wallet.address,
        username: wallet.username,
        pubKeyBase64: wallet.pubKeyBase64,
        privKey: sessionPrivKey.current,
      });
      const result = await broadcastTx(signature);
      if (result.code !== 0) throw new Error(result.rawLog);
      const txhash = result.txhash || '';
      setInitTxhash(txhash);
      setInitStatus('done');
      if (txhash && wallet?.address) {
        localStorage.setItem(`init_tx_${wallet.address}`, txhash);
      }
      // Trigger immediate wallet poll
      getMPCWallets(wallet.address).then(mpcWallets => {
        setMpcLastChecked(new Date());
        setWallet(w => ({ ...w, mpcWallets }));
      });
    } catch (e) {
      console.error('[initWallets]', e);
      setInitTxhash('');
      setInitError(String(e));
      setInitStatus('error');
    }
  }, [wallet]);

  // ─── Render ───

  const renderContent = () => {
    if (authState === 'loading') return (
      <div className="flex items-center justify-center h-full">
        <Loader size={40} className="animate-spin text-[#A855F7]" />
      </div>
    );

    if (authState === 'onboarding') {
      // Pass address to FundStep and privKey/etc to CreateSafeStep
      const pending = pendingRef.current;
      if (onboardingStep === 'fund') {
        return <FundStep onNext={() => setOnboardingStep('create-safe')} address={pending.address} />;
      }
      if (onboardingStep === 'create-safe') {
        return (
          <CreateSafeStep
            onNext={() => setOnboardingStep('done')}
            username={pending.username}
            address={pending.address}
            pubKeyBase64={pending.pubKeyBase64}
            privKey={sessionPrivKey.current}
          />
        );
      }
      return (
        <OnboardingFlow
          step={onboardingStep}
          setStep={setOnboardingStep}
          onComplete={handleOnboardingData}
        />
      );
    }

    if (authState === 'locked' && keystoreEntry) {
      return <LockScreen keystoreEntry={keystoreEntry} onUnlock={handleUnlock} />;
    }

    if (authState === 'locked' && !keystoreEntry) {
      return <div className="flex items-center justify-center h-full"><Loader size={40} className="animate-spin text-[#A855F7]" /></div>;
    }

    if (authState === 'unlocked' && wallet) {
      return (
        <>
          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
            {activeTab === 'wallet' && <WalletTab wallet={wallet} mpcLastChecked={mpcLastChecked} onInitWallets={handleInitWallets} initStatus={initStatus} initTxhash={initTxhash} initError={initError} />}
            {activeTab === 'activity' && <ActivityTab />}
            {activeTab === 'dapps' && <DAppsTab />}
            {activeTab === 'profile' && <ProfileTab wallet={wallet} onLock={handleLock} onRemoveWallet={handleRemoveWallet} />}
          </div>

          {/* Floating Tab Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] z-40">
            <div className="backdrop-blur-2xl bg-white/5 border border-white/15 rounded-[32px] p-2 flex items-center justify-around shadow-2xl shadow-black/50">
              {[
                { id: 'wallet', icon: House },
                { id: 'activity', icon: Clock },
                { id: 'dapps', icon: LayoutGrid },
                { id: 'profile', icon: User },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-4 rounded-2xl transition-all duration-300 relative ${activeTab === tab.id ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                >
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6C63FF]/20 to-[#A855F7]/20 rounded-2xl blur-md" />
                  )}
                  <tab.icon size={22} className={activeTab === tab.id ? 'text-[#A855F7]' : 'text-white'} />
                  {activeTab === tab.id && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#A855F7] rounded-full shadow-[0_0_8px_#A855F7]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 flex items-center justify-center overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6C63FF]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#A855F7]/10 blur-[120px] rounded-full" />
      </div>

      {/* Mobile Frame */}
      <div
        className="relative bg-[#050510] flex flex-col"
        style={{ width: '100vw', height: '100vh', maxWidth: '390px', maxHeight: '844px', margin: 'auto', borderRadius: '40px', overflow: 'hidden' }}
      >
        {/* Safe Area Top (only for main app, not onboarding/lock) */}
        {authState === 'unlocked' && <div className="h-12 w-full flex-shrink-0" />}

        {renderContent()}

        {/* Home Indicator */}
        <div className="h-8 w-full flex-shrink-0 flex items-center justify-center">
          <div className="w-32 h-1 bg-white/10 rounded-full" />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #050510;
          overscroll-behavior: none;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(168, 85, 247, 0); }
          100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s infinite; }
      `}</style>
    </div>
  );
}
