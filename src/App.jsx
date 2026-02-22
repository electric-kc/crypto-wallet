import React, { useState, useEffect, useRef } from 'react';
import { getAvaxBalance, getSepoliaBalance, getEchoBalance, getDispatchBalance, getDexalotBalance, getPChainBalance, getXChainBalance } from './services/avalanche.js';
import { getTokenPrices } from './services/coingecko.js';
import {
  House,
  Clock,
  LayoutGrid,
  User,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Link as LinkIcon,
  Copy,
  Shield,
  Hand,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle2,
  X,
  Plus,
  Globe,
  AlertTriangle,
} from 'lucide-react';

/** * GLOBAL DESIGN SYSTEM & COMPONENTS
 */

const GlassCard = ({ children, className = "", onClick }) => (
  <div
    onClick={onClick}
    className={`
      backdrop-blur-xl bg-white/5 border border-white/15
      rounded-[24px] shadow-2xl transition-all duration-300
      active:scale-[0.98] cursor-pointer ${className}
    `}
  >
    {children}
  </div>
);

const GradientText = ({ children, className = "" }) => (
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

/**
 * TAB COMPONENTS
 */

const WALLET_ADDRESS = '0xb3020c5b33538A879C89C69392208C72ec3BFEf1';
const WALLET_ADDRESS_PX = 'fuji1w4zlzvd54vsjz3a8yxkks5tpjk88nl27uw3xgh';

const RPC = {
  testnet: {
    avax:    'https://api.avax-test.network/ext/bc/C/rpc',
    eth:     'https://ethereum-sepolia-rpc.publicnode.com',
    pChain:  'https://api.avax-test.network/ext/bc/P',
    xChain:  'https://api.avax-test.network/ext/bc/X',
  },
  mainnet: {
    avax:    'https://api.avax.network/ext/bc/C/rpc',
    eth:     'https://eth.llamarpc.com',
    pChain:  'https://api.avax.network/ext/bc/P',
    xChain:  'https://api.avax.network/ext/bc/X',
  },
};


const NETWORKS = [
  { id: 'all',            label: 'All Chains' },
  { id: 'avalanche-fuji', label: 'Avax Fuji' },
  { id: 'sepolia',        label: 'Sepolia' },
  { id: 'echo',           label: 'Echo' },
  { id: 'dispatch',       label: 'Dispatch' },
  { id: 'dexalot',        label: 'Dexalot' },
];

const WalletTab = ({ isMainnet }) => {
  const [activeSubTab, setActiveSubTab] = useState('TOKENS');
  const [activeNetwork, setActiveNetwork] = useState('all');
  const [sheet, setSheet] = useState(null);
  const [avaxBalance, setAvaxBalance] = useState(null);
  const [sepoliaBalance, setSepoliaBalance] = useState(null);
  const [echoBalance, setEchoBalance] = useState(null);
  const [dispatchBalance, setDispatchBalance] = useState(null);
  const [dexalotBalance, setDexalotBalance] = useState(null);
  const [pChainBalance, setPChainBalance] = useState(null);
  const [xChainBalance, setXChainBalance] = useState(null);
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    const net = isMainnet ? RPC.mainnet : RPC.testnet;
    setAvaxBalance(null);
    setSepoliaBalance(null);
    setPChainBalance(null);
    setXChainBalance(null);
    getAvaxBalance(WALLET_ADDRESS, net.avax)
      .then(bal => setAvaxBalance(parseFloat(bal)))
      .catch(() => {});
    getSepoliaBalance(WALLET_ADDRESS, net.eth)
      .then(bal => setSepoliaBalance(parseFloat(bal)))
      .catch(err => console.error('[ETH] balance fetch failed:', err));
    getEchoBalance(WALLET_ADDRESS)
      .then(bal => setEchoBalance(parseFloat(bal)))
      .catch(() => {});
    getDispatchBalance(WALLET_ADDRESS)
      .then(bal => setDispatchBalance(parseFloat(bal)))
      .catch(() => {});
    getDexalotBalance(WALLET_ADDRESS)
      .then(bal => setDexalotBalance(parseFloat(bal)))
      .catch(() => {});
    getPChainBalance(WALLET_ADDRESS_PX, net.pChain)
      .then(bal => setPChainBalance(parseFloat(bal)))
      .catch(() => {});
    getXChainBalance(WALLET_ADDRESS_PX, net.xChain)
      .then(bal => setXChainBalance(parseFloat(bal)))
      .catch(() => {});
    getTokenPrices()
      .then(setPrices)
      .catch(() => setPrices({}));
  }, [isMainnet]);

  // Returns the live USD value for a token, or null if unavailable.
  const fiatValue = (coinGeckoId, rawBalance) => {
    if (!prices || rawBalance == null) return null;
    const price = prices[coinGeckoId]?.usd;
    return price != null ? rawBalance * price : null;
  };

  const formatFiat = (value) => {
    if (value == null) return null;
    return value >= 1000
      ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const tokens = [
    { name: 'Avalanche',  symbol: 'AVAX', rawBalance: avaxBalance,      coinGeckoId: 'avalanche-2', displayBalance: avaxBalance != null ? avaxBalance.toFixed(4) : '…',       change: '-0.8%', chain: 'Avalanche Fuji',     icon: '🔺', color: 'from-red-500',     network: 'avalanche-fuji' },
    { name: 'Ethereum',   symbol: 'ETH',  rawBalance: sepoliaBalance,   coinGeckoId: 'ethereum',    displayBalance: sepoliaBalance != null ? sepoliaBalance.toFixed(4) : '…', change: '+1.2%', chain: isMainnet ? 'Ethereum Mainnet' : 'Sepolia Testnet', icon: '💎', color: 'from-blue-400',    network: 'sepolia' },
    { name: 'Echo',       symbol: 'ECHO', rawBalance: echoBalance,      coinGeckoId: null,           displayBalance: echoBalance != null ? echoBalance.toFixed(4) : '…',       change: '—',     chain: 'Dexalot Echo',       icon: '🔵', color: 'from-cyan-500',    network: 'echo' },
    { name: 'Dispatch',   symbol: 'DIS',  rawBalance: dispatchBalance,  coinGeckoId: null,           displayBalance: dispatchBalance != null ? dispatchBalance.toFixed(4) : '…', change: '—',   chain: 'Dexalot Dispatch',   icon: '🟣', color: 'from-violet-500',  network: 'dispatch' },
    { name: 'Dexalot',    symbol: 'ALOT', rawBalance: dexalotBalance,   coinGeckoId: null,           displayBalance: dexalotBalance != null ? dexalotBalance.toFixed(4) : '…', change: '—',    chain: 'Dexalot Subnet',     icon: '📈', color: 'from-blue-600',    network: 'dexalot' },
    { name: 'AVAX (P)',   symbol: 'AVAX', rawBalance: pChainBalance,    coinGeckoId: 'avalanche-2',  displayBalance: pChainBalance != null ? pChainBalance.toFixed(4) : '…',   change: '-0.8%', chain: 'Avalanche P-Chain',  icon: '🔺', color: 'from-red-700',     network: 'avalanche-fuji' },
    { name: 'AVAX (X)',   symbol: 'AVAX', rawBalance: xChainBalance,    coinGeckoId: 'avalanche-2',  displayBalance: xChainBalance != null ? xChainBalance.toFixed(4) : '…',   change: '-0.8%', chain: 'Avalanche X-Chain',  icon: '🔺', color: 'from-orange-600',  network: 'avalanche-fuji' },
  ];

  const visibleTokens = activeNetwork === 'all'
    ? tokens
    : tokens.filter(t => t.network === activeNetwork);

  // Portfolio total: sum of visible tokens with a known USD value.
  const portfolioTotal = visibleTokens.reduce((sum, t) => {
    const v = t.coinGeckoId ? fiatValue(t.coinGeckoId, t.rawBalance) : parseFloat(t.staticFiat ?? 0);
    return sum + (v ?? 0);
  }, 0);

  const nfts = [
    { name: "NXT Genesis #042", floor: "12.4 AVAX", chain: "Avalanche", color: "from-pink-500 to-purple-500" },
    { name: "Gunzilla Crate #7", floor: "450 OTG", chain: "Gunzilla L1", color: "from-orange-600 to-red-600" },
    { name: "Lamina1 Land #331", floor: "1.2 L1", chain: "Lamina1", color: "from-green-500 to-teal-500" },
    { name: "Dexalot VIP Pass", floor: "800 USDC", chain: "Dexalot", color: "from-blue-500 to-indigo-500" },
  ];

  return (
    <div className="pt-12 pb-24 px-6 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Portfolio Value</p>
        <h1 className="text-5xl font-bold text-white tracking-tight">
          {prices === null
            ? <span className="text-white/30 animate-pulse">Loading…</span>
            : <><span className="text-3xl text-white/60">$</span>{portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
          }
        </h1>
        <p className="text-white/40 font-medium text-sm">
          {NETWORKS.find(n => n.id === activeNetwork)?.label ?? 'All Networks'}
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full mt-4 active:bg-white/10 transition-colors">
          <span className="text-white/60 text-xs font-mono">0xb302...FEf1</span>
          <Copy size={12} className="text-white/40" />
        </div>

        {/* Network Switcher */}
        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mt-4 overflow-x-auto no-scrollbar gap-1">
          {NETWORKS.map(net => (
            <button
              key={net.id}
              onClick={() => setActiveNetwork(net.id)}
              className={`flex-shrink-0 py-2 px-3 text-[10px] font-black rounded-xl transition-all duration-200 whitespace-nowrap ${
                activeNetwork === net.id
                  ? 'bg-gradient-to-r from-[#6C63FF] to-[#A855F7] text-white shadow-lg shadow-purple-500/20'
                  : 'text-white/40'
              }`}
            >
              {net.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: ArrowUp, label: 'SEND' },
          { icon: ArrowDown, label: 'RECEIVE' },
          { icon: ArrowLeftRight, label: 'SWAP' },
          { icon: LinkIcon, label: 'BRIDGE' }
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => setSheet(btn.label)}
            className="flex flex-col items-center gap-2 group"
          >
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

      {/* Content */}
      <div className="space-y-3">
        {activeSubTab === 'TOKENS' ? (
          visibleTokens.map((t, i) => {
            const liveFiat = t.coinGeckoId ? fiatValue(t.coinGeckoId, t.rawBalance) : null;
            const displayFiat = liveFiat != null ? formatFiat(liveFiat) : t.staticFiat ?? null;
            return (
              <GlassCard key={i} className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-xl relative shadow-lg`}>
                  {t.icon}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center text-[8px]">
                    {t.chain.includes('Avalanche') ? '🔺' : '⛓️'}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-white">{t.name}</span>
                    <span className="font-bold text-white">{t.displayBalance} {t.symbol}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-white/40">{t.chain}</span>
                    <div className="flex gap-2">
                      {displayFiat != null
                        ? <span className="text-white/60">${displayFiat}</span>
                        : prices === null && t.coinGeckoId
                          ? <span className="text-white/30 animate-pulse text-[10px]">…</span>
                          : null
                      }
                      <span className={t.change.startsWith('+') ? 'text-green-400' : t.change.startsWith('-') ? 'text-red-400' : 'text-white/40'}>{t.change}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {nfts.map((n, i) => (
              <GlassCard key={i} className="p-3 space-y-3">
                <div className={`aspect-square w-full rounded-xl bg-gradient-to-br ${n.color} opacity-80`} />
                <div>
                  <h4 className="text-xs font-bold text-white truncate">{n.name}</h4>
                  <p className="text-[10px] text-white/40 mt-1">Floor: {n.floor}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <BottomSheet isOpen={!!sheet} onClose={() => setSheet(null)} title={sheet}>
        <div className="py-10 text-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <GradientText className="text-3xl font-bold">✨</GradientText>
          </div>
          <p className="text-white/60">The {sheet} experience is being optimized for zero-gas abstraction.</p>
          <button onClick={() => setSheet(null)} className="w-full py-4 bg-white/10 rounded-2xl font-bold text-white">Got it</button>
        </div>
      </BottomSheet>
    </div>
  );
};

const ActivityTab = () => {
  const [filter, setFilter] = useState('ALL');
  const txs = [
    { type: 'send', label: 'Sent ETH', sub: 'To: 0x82...1a', time: '2h ago', amount: '-0.5 ETH', fiat: '$1,650', chain: 'C-Chain', color: 'text-red-400' },
    { type: 'receive', label: 'Received AVAX', sub: 'From: Coinbase', time: '5h ago', amount: '+42 AVAX', fiat: '$1,900', chain: 'Avalanche', color: 'text-green-400' },
    { type: 'swap', label: 'Swapped USDC → JOE', sub: 'via Trader Joe', time: 'Yesterday', amount: '2,000 JOE', fiat: '$1,000', chain: 'Avalanche', color: 'text-purple-400' },
    { type: 'bridge', label: 'Bridged to Dexalot', sub: 'Moving funds...', time: '2 days ago', amount: '500 USDC', fiat: '$500', chain: 'Dexalot', color: 'text-blue-400' },
  ];

  return (
    <div className="pt-12 pb-24 px-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <h2 className="text-3xl font-bold text-white">Activity</h2>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {['ALL', 'Avalanche', 'C-Chain', 'Dexalot', 'Gunzilla'].map(f => (
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
        {Array(10).fill(0).map((_, i) => {
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

const DAppsTab = () => {
  const [browserUrl, setBrowserUrl] = useState(null);
  const iframeRef = useRef(null);

  const favorites = [
    { name: 'Dexalot', url: 'https://app.dexalot.com/swap', color: 'from-blue-600 to-cyan-500', icon: '📈' },
    { name: 'Uniswap', url: 'https://app.uniswap.org', color: 'from-pink-500 to-purple-500', icon: '🦄' },
  ];

  const curated = [
    {
      name: 'Dexalot',
      url: 'https://app.dexalot.com/swap',
      description: 'Non-custodial order-book DEX on Avalanche',
      gradient: 'from-blue-600 to-cyan-500',
      icon: '📈',
    },
    {
      name: 'Uniswap',
      url: 'https://app.uniswap.org',
      description: 'The leading decentralized exchange',
      gradient: 'from-pink-500 to-rose-500',
      icon: '🦄',
    },
  ];

  const goBack = () => {
    try { iframeRef.current?.contentWindow?.history?.back(); } catch (e) {}
  };

  return (
    <>
      <div className="pt-12 pb-24 px-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

        {/* Favorites banner */}
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

        {/* Featured dApp cards */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white/80 px-1">Featured</h3>
          <div className="space-y-3">
            {curated.map((d, i) => (
              <GlassCard key={i} className="p-4 flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${d.gradient} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                  {d.icon}
                </div>
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

      {/* In-app browser modal */}
      {browserUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#050510]">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 pt-12 pb-3 bg-white/5 border-b border-white/10 flex-shrink-0">
            <button
              onClick={goBack}
              className="p-2 rounded-full bg-white/5 active:bg-white/10 transition-colors flex-shrink-0"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            <div className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="text-xs text-white/60 font-mono truncate block">{browserUrl}</span>
            </div>
            <button
              onClick={() => setBrowserUrl(null)}
              className="p-2 rounded-full bg-white/5 active:bg-white/10 transition-colors flex-shrink-0"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
          {/* iframe */}
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

const ProfileTab = ({ isMainnet, onToggleNetwork }) => {
  const [faceId, setFaceId] = useState(true);
  const [rpcStealth, setRpcStealth] = useState(false);
  const [spamFilter, setSpamFilter] = useState(true);
  const [gasAsset, setGasAsset] = useState('BEST');

  return (
    <div className="pt-12 pb-24 px-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto max-h-screen no-scrollbar">
      {/* User Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#A855F7] flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-purple-500/20">
          EL
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Electric</h2>
          <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <span className="text-[10px] font-mono text-white/40">0xb302...FEf1</span>
            <Copy size={10} className="text-white/20" />
          </div>
        </div>
      </div>

      {/* Network Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Network</h3>
        <GlassCard className="overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMainnet ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
              <Globe size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">Mainnet</h4>
              <p className="text-[10px] text-white/40">{isMainnet ? 'Connected to real networks' : 'Using test networks'}</p>
            </div>
            <Toggle enabled={isMainnet} onChange={onToggleNetwork} />
          </div>
          {isMainnet && (
            <div className="mx-4 mb-4 px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
              <p className="text-[11px] text-amber-300 font-semibold">You are now using real funds</p>
            </div>
          )}
        </GlassCard>
      </section>

      {/* Security Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Security</h3>
        <GlassCard className="overflow-hidden">
          <div className="p-4 flex items-center gap-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Shield size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">Face ID Signature</h4>
              <p className="text-[10px] text-white/40 leading-relaxed">Sign transactions with your face — no password needed</p>
            </div>
            <Toggle enabled={faceId} onChange={() => setFaceId(!faceId)} />
          </div>
          <div className="p-4 flex items-center gap-4 opacity-50">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
              <Smartphone size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">Touch ID Fallback</h4>
              <p className="text-[10px] text-white/40">Secondary biometric layer</p>
            </div>
            <Toggle enabled={false} onChange={() => {}} />
          </div>
        </GlassCard>
      </section>

      {/* Guardians Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Guardians</h3>
          <CheckCircle2 size={14} className="text-green-400" />
        </div>
        <p className="text-[10px] text-white/30 px-1 italic">If you lose your phone, these trusted people can restore your wallet. 2-of-3 required.</p>
        <GlassCard className="p-4 space-y-4">
          {[
            { name: 'Alex M.', role: 'Friend', init: 'AM', color: 'bg-blue-500' },
            { name: 'Sarah K.', role: 'Family', init: 'SK', color: 'bg-orange-500' },
            { name: 'Ledger Nano X', role: 'Hardware', init: 'LX', color: 'bg-zinc-700' }
          ].map((g, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${g.color} flex items-center justify-center text-[10px] font-bold text-white`}>{g.init}</div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">{g.name}</p>
                <p className="text-[10px] text-white/40">{g.role}</p>
              </div>
              <span className="text-[8px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full uppercase">Active</span>
            </div>
          ))}
          <button className="w-full py-2 bg-white/5 border border-dashed border-white/20 rounded-xl text-[10px] font-bold text-white/60 flex items-center justify-center gap-2">
            <Plus size={12} /> Add Guardian
          </button>
        </GlassCard>
      </section>

      {/* Gas Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Gas & Fees</h3>
        <GlassCard className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Pay Gas With</span>
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5">
              {['USDC', 'ETH', 'BEST'].map(t => (
                <button
                  key={t}
                  onClick={() => setGasAsset(t)}
                  className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all ${gasAsset === t ? 'bg-gradient-to-r from-[#6C63FF] to-[#A855F7] text-white shadow-lg' : 'text-white/40'}`}
                >
                  {t === 'BEST' ? '✨ BEST' : t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs font-bold text-white">Speed</span>
                <p className="text-[10px] text-white/40">Affects time & cost</p>
              </div>
              <p className="text-[10px] text-white/60 font-mono">~$0.08 · ~12 sec</p>
            </div>
            <div className="relative h-6 flex items-center">
              <div className="absolute inset-0 h-1 bg-white/10 rounded-full my-auto" />
              <div className="absolute inset-0 h-1 bg-[#6C63FF] rounded-full my-auto w-1/2" />
              <div className="absolute left-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-[0_0_15px_rgba(108,99,255,0.8)] border-2 border-[#6C63FF]" />
              <div className="flex justify-between w-full text-[10px] mt-8">
                <span>🐢</span>
                <span>🐇</span>
                <span>⚡️</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Privacy Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Privacy</h3>
        <GlassCard className="overflow-hidden">
          <div className="p-4 flex items-center gap-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Shield size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">RPC Stealth Mode</h4>
              <p className="text-[10px] text-white/40">Routes through private relay — hides your IP</p>
            </div>
            <Toggle enabled={rpcStealth} onChange={() => setRpcStealth(!rpcStealth)} />
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <Hand size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">Spam Filter</h4>
              <p className="text-[10px] text-white/40">Hides unrecognized airdrop tokens</p>
            </div>
            <Toggle enabled={spamFilter} onChange={() => setSpamFilter(!spamFilter)} />
          </div>
        </GlassCard>
      </section>

      {/* Danger Zone */}
      <section className="pt-4 pb-8">
        <GlassCard className="p-4 space-y-4 border-red-500/20">
          <button className="w-full py-4 border border-white/10 rounded-2xl text-xs font-bold text-white active:bg-white/5">Export Recovery Proof</button>
          <button className="w-full py-4 text-xs font-bold text-red-400 active:text-red-300">Remove Wallet</button>
        </GlassCard>
      </section>
    </div>
  );
};

/**
 * MAIN APP CONTAINER
 */

export default function App() {
  const [activeTab, setActiveTab] = useState('wallet');
  const [isMainnet, setIsMainnet] = useState(() => localStorage.getItem('networkMode') === 'mainnet');

  const handleToggleNetwork = () => {
    const next = !isMainnet;
    setIsMainnet(next);
    localStorage.setItem('networkMode', next ? 'mainnet' : 'testnet');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 flex items-center justify-center overflow-hidden">
      {/* Background Gradients (fixed, behind the frame) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6C63FF]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#A855F7]/10 blur-[120px] rounded-full" />
      </div>

      {/* Mobile Frame — phone bezel, centered on any screen */}
      <div
        className="relative bg-[#050510] flex flex-col"
        style={{ width: '100vw', height: '100vh', maxWidth: '390px', maxHeight: '844px', margin: 'auto', borderRadius: '40px', overflow: 'hidden' }}
      >
        {/* Safe Area Top */}
        <div className="h-12 w-full flex-shrink-0" />

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {activeTab === 'wallet' && <WalletTab isMainnet={isMainnet} />}
          {activeTab === 'activity' && <ActivityTab />}
          {activeTab === 'dapps' && <DAppsTab />}
          {activeTab === 'profile' && <ProfileTab isMainnet={isMainnet} onToggleNetwork={handleToggleNetwork} />}
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

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(168, 85, 247, 0); }
          100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
      `}</style>
    </div>
  );
}
