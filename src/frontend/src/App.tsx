import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Google GSI type ──────────────────────────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// Google OAuth Client ID - Replace with your actual Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID =
  "921482164764-tq6kq9j993v05jmebcncmcdum470maqh.apps.googleusercontent.com";

function parseJwt(token: string): { name?: string; email?: string } {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface WithdrawEntry {
  id: number;
  coins: number;
  upiId: string;
  amount: number;
  status: string;
  date: string;
}

interface AdminWithdrawEntry extends WithdrawEntry {
  userName: string;
}

interface AbsenceRecord {
  id: number;
  name: string;
  date: string;
  reason: string;
  status: "Absent" | "Present" | "Late";
}

interface AppState {
  isLoggedIn: boolean;
  userName: string;
  referralCode: string;
  coins: number;
  checkInStreak: number;
  lastCheckInDate: string;
  lastSpinDate: string;
  lastScratchDate: string;
  dailyAdsWatched: number;
  lastAdsDate: string;
  withdrawHistory: WithdrawEntry[];
  referredUsers: string[];
  totalCoinsEarned: number;
  totalAdsWatched: number;
}

const DEFAULT_STATE: AppState = {
  isLoggedIn: false,
  userName: "",
  referralCode: "",
  coins: 0,
  checkInStreak: 0,
  lastCheckInDate: "",
  lastSpinDate: "",
  lastScratchDate: "",
  dailyAdsWatched: 0,
  lastAdsDate: "",
  withdrawHistory: [],
  referredUsers: [],
  totalCoinsEarned: 0,
  totalAdsWatched: 0,
};

const STORAGE_KEY = "adreward_state";
const MAX_DAILY_ADS = 10;
const COINS_PER_AD = 5;
const COINS_TO_INR = 1000 / 10; // 1000 coins = ₹10
const MIN_WITHDRAW_COINS = 5000;

const SPIN_SEGMENTS = [
  { coins: 20, color: "#7C3AED", label: "20" },
  { coins: 50, color: "#F59E0B", label: "50" },
  { coins: 100, color: "#10B981", label: "100" },
  { coins: 200, color: "#EF4444", label: "200" },
];

const SCRATCH_REWARDS = [10, 25, 50, 100];

const CHECK_IN_REWARDS: Record<number, number> = {
  1: 20,
  2: 30,
  3: 50,
};

type Tab = "home" | "earn" | "tasks" | "wallet" | "profile";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function isToday(dateStr: string) {
  return dateStr === getTodayString();
}

function coinsToInr(coins: number) {
  return (coins / COINS_TO_INR).toFixed(2);
}

function genReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getCheckInReward(streak: number) {
  return CHECK_IN_REWARDS[streak] ?? 100;
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({
  onLogin,
  onAdminAccess,
}: {
  onLogin: (name: string, referral: string) => void;
  onAdminAccess: () => void;
}) {
  const [name, setName] = useState("");
  const [referral, setReferral] = useState("");
  const [logoClicks, setLogoClicks] = useState(0);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const handleLogoClick = () => {
    setLogoClicks((c) => c + 1);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter your name!");
      return;
    }
    onLogin(name.trim(), referral.trim());
  };

  // Initialize Google Sign-In
  useEffect(() => {
    const initGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            const payload = parseJwt(response.credential);
            if (payload.name) {
              onLogin(payload.name, referral.trim());
              toast.success(`Welcome, ${payload.name}! 🎉`);
            }
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: "100%",
          text: "signin_with",
          shape: "rectangular",
        });
      }
    };
    // Try immediately or wait for script load
    if (window.google) {
      initGoogle();
    } else {
      const script = document.querySelector(
        'script[src*="accounts.google.com/gsi"]',
      );
      if (script) {
        script.addEventListener("load", initGoogle);
        return () => script.removeEventListener("load", initGoogle);
      }
    }
  }, [onLogin, referral]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <button
            type="button"
            onClick={handleLogoClick}
            className="block w-full text-center bg-transparent border-0 p-0 cursor-default"
            aria-label="Secret admin access"
          >
            <div className="text-7xl mb-4 animate-float inline-block">🪙</div>
            <h1 className="font-display text-5xl font-black shimmer-text mb-2">
              AdReward
            </h1>
            <p className="text-muted-foreground text-lg font-body tracking-widest uppercase text-xs">
              Watch · Earn · Redeem
            </p>
          </button>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8 space-y-5">
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-body uppercase tracking-wider">
              Your Name
            </p>
            <Input
              data-ocid="login.input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 h-12 rounded-xl font-body"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-body uppercase tracking-wider">
              Referral Code (optional)
            </p>
            <Input
              placeholder="Friend's referral code"
              value={referral}
              onChange={(e) => setReferral(e.target.value.toUpperCase())}
              maxLength={6}
              className="bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 h-12 rounded-xl font-body"
            />
          </div>
          <Button
            data-ocid="login.submit_button"
            onClick={handleSubmit}
            className="w-full h-14 bg-gold-gradient text-sm font-display font-bold text-primary-foreground rounded-xl text-base shadow-gold-lg hover:opacity-90 transition-opacity"
          >
            🚀 Start Earning
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-xs text-muted-foreground font-body">or</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          {/* Google Sign-In Button */}
          <div
            data-ocid="login.google_button"
            ref={googleBtnRef}
            className="w-full flex justify-center"
          />

          {logoClicks >= 5 && (
            <Button
              data-ocid="admin.open_modal_button"
              onClick={onAdminAccess}
              variant="outline"
              className="w-full h-10 border-border/40 text-muted-foreground text-xs rounded-xl"
            >
              🛡 Admin Access
            </Button>
          )}
        </div>

        {/* Info strip */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-muted-foreground text-xs font-body">
            1000 coins = ₹10 &nbsp;|&nbsp; Min withdraw ₹50
          </p>
          <p className="text-muted-foreground text-xs font-body">
            Watch ads, spin wheel & earn daily!
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── AdSense Banner Component ─────────────────────────────────────────────────
function AdBanner({
  slot = "auto",
  format = "auto",
  style = {},
}: { slot?: string; format?: string; style?: React.CSSProperties }) {
  const adRef = useRef<HTMLModElement>(null);
  useEffect(() => {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: adsbygoogle global
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      // biome-ignore lint/suspicious/noExplicitAny: adsbygoogle global
      ((window as any).adsbygoogle as unknown[]).push({});
    } catch (_e) {
      // AdSense not loaded yet
    }
  }, []);
  return (
    <div
      className="w-full overflow-hidden rounded-xl my-2"
      style={{ minHeight: 60, ...style }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight: 60 }}
        data-ad-client="ca-pub-6188518298786560"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({
  state,
  onNavigate,
}: {
  state: AppState;
  onNavigate: (tab: Tab) => void;
}) {
  const inrValue = coinsToInr(state.coins);
  const adsProgress = (state.dailyAdsWatched / MAX_DAILY_ADS) * 100;
  const canCheckin = !isToday(state.lastCheckInDate);
  const canSpin = !isToday(state.lastSpinDate);
  const canScratch = !isToday(state.lastScratchDate);
  const tasksDone = [!canCheckin, !canSpin, !canScratch].filter(Boolean).length;

  return (
    <div className="p-4 space-y-4 pb-2">
      {/* Coin Balance Card */}
      <div className="bg-coin-card rounded-3xl p-6 relative overflow-hidden shadow-gold">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-gold-500/5 -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-gold-500/5 translate-y-8 -translate-x-8" />
        <div className="relative z-10">
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-body mb-1">
            Total Balance
          </p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-5xl font-display font-black text-gold-400">
              {state.coins.toLocaleString()}
            </span>
            <span className="text-gold-600 text-sm font-body">coins</span>
          </div>
          <p className="text-muted-foreground text-sm font-body">
            ≈ ₹{inrValue} INR
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-body">
              Today's Ads: {state.dailyAdsWatched}/{MAX_DAILY_ADS}
            </span>
          </div>
          <Progress value={adsProgress} className="h-1.5 mt-1 bg-muted/30" />
        </div>
      </div>

      {/* Today's Progress */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-body mb-3">
          Today's Progress
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/30 rounded-xl p-3 text-center">
            <p className="text-2xl font-display font-bold text-gold-400">
              {state.dailyAdsWatched}
            </p>
            <p className="text-xs text-muted-foreground font-body">
              Ads Watched
            </p>
          </div>
          <div className="bg-secondary/30 rounded-xl p-3 text-center">
            <p className="text-2xl font-display font-bold text-gold-400">
              {tasksDone}/3
            </p>
            <p className="text-xs text-muted-foreground font-body">
              Tasks Done
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-body mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard
            emoji="📺"
            label="Watch Ad"
            sublabel="+5 coins"
            disabled={state.dailyAdsWatched >= MAX_DAILY_ADS}
            onClick={() => onNavigate("earn")}
            color="from-violet-900/60 to-violet-800/40"
          />
          <QuickActionCard
            emoji="📅"
            label="Daily Check-in"
            sublabel={
              canCheckin
                ? `+${getCheckInReward(state.checkInStreak + 1)} coins`
                : "Done ✓"
            }
            disabled={!canCheckin}
            onClick={() => onNavigate("tasks")}
            color="from-emerald-900/60 to-emerald-800/40"
          />
          <QuickActionCard
            emoji="🎰"
            label="Spin Wheel"
            sublabel={canSpin ? "up to 200 coins" : "Done ✓"}
            disabled={!canSpin}
            onClick={() => onNavigate("tasks")}
            color="from-orange-900/60 to-orange-800/40"
          />
          <QuickActionCard
            emoji="🎁"
            label="Scratch Card"
            sublabel={canScratch ? "up to 100 coins" : "Done ✓"}
            disabled={!canScratch}
            onClick={() => onNavigate("tasks")}
            color="from-pink-900/60 to-pink-800/40"
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gold-500/10 border border-gold-500/30 rounded-2xl p-4 flex items-center gap-3">
        <span className="text-2xl">💡</span>
        <p className="text-xs text-gold-300 font-body">
          1000 coins = ₹10 &nbsp;·&nbsp; Min withdraw ₹50 (5000 coins)
        </p>
      </div>

      {/* AdSense Banner Ad */}
      <AdBanner slot="YOUR_HOME_AD_SLOT" />
    </div>
  );
}

function QuickActionCard({
  emoji,
  label,
  sublabel,
  disabled,
  onClick,
  color,
}: {
  emoji: string;
  label: string;
  sublabel: string;
  disabled: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`bg-gradient-to-br ${color} glass-card rounded-2xl p-4 text-left transition-all active:scale-95 hover:shadow-card disabled:opacity-50 disabled:cursor-not-allowed border border-white/5`}
    >
      <span className="text-3xl block mb-2">{emoji}</span>
      <p className="text-sm font-display font-bold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground font-body mt-0.5">
        {sublabel}
      </p>
    </button>
  );
}

// ─── Earn Tab ─────────────────────────────────────────────────────────────────
function EarnTab({
  state,
  onEarnCoins,
}: {
  state: AppState;
  onEarnCoins: (coins: number) => void;
}) {
  const [isWatching, setIsWatching] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [coinsToday, setCoinsToday] = useState(
    state.dailyAdsWatched * COINS_PER_AD,
  );

  const remaining = MAX_DAILY_ADS - state.dailyAdsWatched;
  const isDone = state.dailyAdsWatched >= MAX_DAILY_ADS;

  const watchAd = useCallback(() => {
    if (isWatching || isDone) return;
    setIsWatching(true);
    setCountdown(5);

    // Push AdSense ad when watching starts
    setTimeout(() => {
      try {
        // biome-ignore lint/suspicious/noExplicitAny: adsbygoogle global
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        // biome-ignore lint/suspicious/noExplicitAny: adsbygoogle global
        ((window as any).adsbygoogle as unknown[]).push({});
      } catch (_e) {
        // AdSense not loaded yet - ok
      }
    }, 100);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsWatching(false);
          onEarnCoins(COINS_PER_AD);
          setCoinsToday((p) => p + COINS_PER_AD);
          toast.success(`+${COINS_PER_AD} Coins Earned! 🪙`, {
            description: "Keep watching to earn more!",
          });
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isWatching, isDone, onEarnCoins]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-body mb-2">
          Today's Ads
        </p>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-center">
            <p className="text-4xl font-display font-black text-gold-400">
              {state.dailyAdsWatched}
            </p>
            <p className="text-xs text-muted-foreground font-body">Watched</p>
          </div>
          <div className="text-2xl text-muted-foreground">/</div>
          <div className="text-center">
            <p className="text-4xl font-display font-black text-muted-foreground">
              {MAX_DAILY_ADS}
            </p>
            <p className="text-xs text-muted-foreground font-body">Total</p>
          </div>
        </div>
        <Progress
          value={(state.dailyAdsWatched / MAX_DAILY_ADS) * 100}
          className="h-2 mb-3"
        />
        <p className="text-sm text-gold-400 font-body font-medium">
          {isDone
            ? "🎉 All ads watched today!"
            : `${remaining} ads remaining — earn ${remaining * COINS_PER_AD} more coins`}
        </p>
      </div>

      {/* Watch Ad Button */}
      <div className="glass-card rounded-3xl p-8 text-center">
        {isWatching ? (
          <div data-ocid="earn.loading_state" className="space-y-4">
            {/* Real AdSense Ad Unit */}
            <div className="w-full overflow-hidden rounded-xl border border-border/40 bg-secondary/20 min-h-[100px] flex flex-col items-center justify-center">
              <ins
                className="adsbygoogle"
                style={{ display: "block", width: "100%", minHeight: "100px" }}
                data-ad-client="ca-pub-6188518298786560"
                data-ad-slot="YOUR_WATCHAD_SLOT"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            </div>
            <div className="w-20 h-20 rounded-full bg-gold-500/10 border-2 border-gold-500 flex items-center justify-center mx-auto animate-pulse">
              <span className="text-3xl font-display font-black text-gold-400">
                {countdown}
              </span>
            </div>
            <p className="text-muted-foreground font-body text-sm">
              📺 Ad chal rahi hai... {countdown} seconds
            </p>
            <div className="text-xs text-muted-foreground/60 font-body">
              Ad khatam hone tak wait karein
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl mb-2">📺</div>
            <p className="font-display font-bold text-xl text-foreground">
              Watch a Short Ad
            </p>
            <p className="text-sm text-muted-foreground font-body">
              Earn {COINS_PER_AD} coins per ad • 5 seconds each
            </p>
            <Button
              data-ocid="earn.watch_button"
              onClick={watchAd}
              disabled={isDone}
              className="w-full h-14 bg-gold-gradient font-display font-bold text-primary-foreground rounded-xl text-base shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isDone ? "✅ Daily Limit Reached" : "▶ Watch Ad Now"}
            </Button>
          </div>
        )}
      </div>

      {/* AdSense Banner Ad */}
      <AdBanner slot="YOUR_EARN_AD_SLOT" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-gold-400">
            {coinsToday}
          </p>
          <p className="text-xs text-muted-foreground font-body">Coins Today</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-gold-400">
            {state.totalAdsWatched}
          </p>
          <p className="text-xs text-muted-foreground font-body">Total Ads</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-secondary/20 rounded-2xl p-4">
        <p className="text-xs text-muted-foreground font-body text-center">
          📌 Daily limit: {MAX_DAILY_ADS} ads/day · Resets at midnight
        </p>
      </div>
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────
function TasksTab({
  state,
  onStateUpdate,
}: {
  state: AppState;
  onStateUpdate: (updates: Partial<AppState>) => void;
}) {
  // Check-in
  const canCheckin = !isToday(state.lastCheckInDate);
  const nextStreak = canCheckin ? state.checkInStreak + 1 : state.checkInStreak;
  const todayReward = getCheckInReward(nextStreak);

  const handleCheckin = () => {
    if (!canCheckin) return;
    const newStreak = state.checkInStreak + 1;
    const reward = getCheckInReward(newStreak);
    onStateUpdate({
      coins: state.coins + reward,
      checkInStreak: newStreak,
      lastCheckInDate: getTodayString(),
      totalCoinsEarned: state.totalCoinsEarned + reward,
    });
    toast.success(`+${reward} Coins! 📅`, {
      description: `Day ${newStreak} streak bonus!`,
    });
  };

  // Spin wheel
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [spinDeg, setSpinDeg] = useState(0);
  const canSpin = !isToday(state.lastSpinDate);

  const handleSpin = () => {
    if (!canSpin || isSpinning) return;
    const segIdx = Math.floor(Math.random() * SPIN_SEGMENTS.length);
    const reward = SPIN_SEGMENTS[segIdx].coins;
    const baseDeg = 1440 + segIdx * 90 + Math.random() * 70;
    setSpinDeg(baseDeg);
    setIsSpinning(true);
    setSpinResult(null);

    setTimeout(() => {
      setIsSpinning(false);
      setSpinResult(reward);
      onStateUpdate({
        coins: state.coins + reward,
        lastSpinDate: getTodayString(),
        totalCoinsEarned: state.totalCoinsEarned + reward,
      });
      toast.success(`🎰 +${reward} Coins from Spin!`);
    }, 3000);
  };

  // Scratch card
  const [isScratched, setIsScratched] = useState(false);
  const [scratchReward] = useState(
    () => SCRATCH_REWARDS[Math.floor(Math.random() * SCRATCH_REWARDS.length)],
  );
  const canScratch = !isToday(state.lastScratchDate);

  const handleScratch = () => {
    if (!canScratch || isScratched) return;
    setIsScratched(true);
    onStateUpdate({
      coins: state.coins + scratchReward,
      lastScratchDate: getTodayString(),
      totalCoinsEarned: state.totalCoinsEarned + scratchReward,
    });
    toast.success(`🎁 +${scratchReward} Coins from Scratch!`);
  };

  // Copy referral
  const handleCopyCode = () => {
    navigator.clipboard.writeText(state.referralCode).then(() => {
      toast.success("Referral code copied! 📋");
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Daily Check-in */}
      <div className="glass-card rounded-3xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-body">
              Daily Check-in
            </p>
            <p className="font-display font-bold text-xl text-foreground mt-0.5">
              🔥 {state.checkInStreak} Day Streak
            </p>
          </div>
          {!canCheckin && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-body text-xs">
              Done ✓
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map((day) => (
            <div
              key={day}
              className={`rounded-xl p-2 text-center border ${
                day <= state.checkInStreak
                  ? "bg-gold-500/20 border-gold-500/40"
                  : day === nextStreak && canCheckin
                    ? "bg-gold-500/10 border-gold-500/30 ring-1 ring-gold-500/50"
                    : "bg-secondary/20 border-border/30"
              }`}
            >
              <p className="text-xs text-muted-foreground font-body">
                Day {day}
              </p>
              <p className="text-sm font-display font-bold text-gold-400">
                {getCheckInReward(day)}
              </p>
              <p className="text-xs text-muted-foreground font-body">🪙</p>
            </div>
          ))}
        </div>
        <Button
          data-ocid="tasks.checkin_button"
          onClick={handleCheckin}
          disabled={!canCheckin}
          className="w-full h-12 bg-gold-gradient font-display font-bold text-primary-foreground rounded-xl disabled:opacity-50"
        >
          {canCheckin ? `Claim +${todayReward} Coins` : "Come Back Tomorrow"}
        </Button>
      </div>

      {/* Spin Wheel */}
      <div className="glass-card rounded-3xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-body">
              Lucky Spin
            </p>
            <p className="font-display font-bold text-xl text-foreground mt-0.5">
              🎰 Spin to Win
            </p>
          </div>
          {!canSpin && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-body text-xs">
              Done ✓
            </Badge>
          )}
        </div>

        {/* Visual Spin Wheel */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20 text-2xl">
              ▼
            </div>
            <div
              className="w-48 h-48 rounded-full relative overflow-hidden shadow-gold border-4 border-gold-500/40"
              style={{
                transform: `rotate(${spinDeg}deg)`,
                transition: isSpinning
                  ? "transform 3s cubic-bezier(0.17,0.67,0.12,0.99)"
                  : "none",
              }}
            >
              {SPIN_SEGMENTS.map((seg, i) => {
                const angle = i * 90;
                return (
                  <div
                    key={seg.coins}
                    className="absolute w-full h-full"
                    style={{
                      clipPath:
                        i === 0
                          ? "polygon(50% 50%, 100% 0%, 100% 50%)"
                          : i === 1
                            ? "polygon(50% 50%, 100% 50%, 50% 100%)"
                            : i === 2
                              ? "polygon(50% 50%, 50% 100%, 0% 50%)"
                              : "polygon(50% 50%, 0% 50%, 0% 0%)",
                      backgroundColor: seg.color,
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: "50% 50%",
                    }}
                  />
                );
              })}
              {/* Labels overlay */}
              {SPIN_SEGMENTS.map((seg, i) => {
                const angle = i * 90 + 22.5;
                const rad = (angle * Math.PI) / 180;
                const r = 34;
                const x = 50 + r * Math.cos(rad - Math.PI / 2);
                const y = 50 + r * Math.sin(rad - Math.PI / 2);
                return (
                  <div
                    key={`label-${seg.coins}`}
                    className="absolute text-white font-display font-black text-xs"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%,-50%)",
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    }}
                  >
                    {seg.label}
                  </div>
                );
              })}
              {/* Center circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background border-2 border-gold-500/60 flex items-center justify-center z-10">
                <span className="text-lg">🪙</span>
              </div>
            </div>
          </div>

          {spinResult !== null && !isSpinning && (
            <div className="mt-3 animate-bounce-in text-center">
              <p className="text-gold-400 font-display font-black text-2xl">
                +{spinResult} Coins! 🎉
              </p>
            </div>
          )}
        </div>

        <Button
          data-ocid="tasks.spin_button"
          onClick={handleSpin}
          disabled={!canSpin || isSpinning}
          className="w-full h-12 bg-gold-gradient font-display font-bold text-primary-foreground rounded-xl disabled:opacity-50"
        >
          {isSpinning
            ? "Spinning..."
            : !canSpin
              ? "Come Back Tomorrow"
              : "🎰 Spin Now"}
        </Button>
      </div>

      {/* Scratch Card */}
      <div className="glass-card rounded-3xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-body">
              Scratch Card
            </p>
            <p className="font-display font-bold text-xl text-foreground mt-0.5">
              🎁 Daily Scratch
            </p>
          </div>
          {!canScratch && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-body text-xs">
              Done ✓
            </Badge>
          )}
        </div>

        <button
          type="button"
          data-ocid="tasks.scratch_card"
          className={`scratch-card w-full rounded-2xl overflow-hidden mb-4 border-2 ${
            isScratched || !canScratch
              ? "border-gold-500/40 bg-gold-500/10"
              : "border-dashed border-muted/40 bg-secondary/20"
          }`}
          onClick={handleScratch}
        >
          {isScratched || !canScratch ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-2">🎁</p>
              <p className="text-gold-400 font-display font-black text-3xl">
                +{scratchReward}
              </p>
              <p className="text-gold-600 font-body text-sm">Coins Won!</p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-full bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-6">
                <p className="text-white font-display font-black text-lg tracking-widest">
                  SCRATCH ME!
                </p>
                <p className="text-slate-400 text-xs font-body mt-1">
                  Tap to reveal your reward
                </p>
              </div>
            </div>
          )}
        </button>

        {canScratch && !isScratched && (
          <p className="text-center text-xs text-muted-foreground font-body mb-2">
            👆 Tap the card to scratch
          </p>
        )}
      </div>

      {/* Referral Card */}
      <div className="glass-card rounded-3xl p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-body mb-2">
          Refer & Earn
        </p>
        <p className="font-display font-bold text-xl text-foreground mb-1">
          👥 Invite Friends
        </p>
        <p className="text-sm text-muted-foreground font-body mb-4">
          Each friend who joins earns you 500 coins!
        </p>

        <div className="bg-secondary/30 rounded-2xl p-4 text-center mb-4 border border-border/30">
          <p className="text-xs text-muted-foreground font-body mb-1">
            Your Referral Code
          </p>
          <p className="text-3xl font-display font-black tracking-widest text-gold-400">
            {state.referralCode}
          </p>
          <p className="text-xs text-muted-foreground font-body mt-1">
            {state.referredUsers.length} friends joined
          </p>
        </div>

        <Button
          onClick={handleCopyCode}
          className="w-full h-12 bg-secondary/50 border border-border/40 text-foreground font-body rounded-xl hover:bg-secondary/70 transition-colors"
        >
          📋 Copy Code
        </Button>
      </div>

      {/* AdSense Banner Ad */}
      <AdBanner slot="YOUR_TASKS_AD_SLOT" />
    </div>
  );
}

// ─── Wallet Tab ───────────────────────────────────────────────────────────────
function WalletTab({
  state,
  onStateUpdate,
}: {
  state: AppState;
  onStateUpdate: (updates: Partial<AppState>) => void;
}) {
  const [upiId, setUpiId] = useState("");
  const [coinsInput, setCoinsInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const coinsNum = Number.parseInt(coinsInput) || 0;
  const inrAmount = coinsNum > 0 ? Number.parseFloat(coinsToInr(coinsNum)) : 0;

  const handleRedeem = () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!upiId.trim() || !upiId.includes("@")) {
      setErrorMsg("Please enter a valid UPI ID (e.g., name@upi)");
      return;
    }
    if (coinsNum < MIN_WITHDRAW_COINS) {
      setErrorMsg(
        `Minimum withdrawal is ${MIN_WITHDRAW_COINS} coins (₹${coinsToInr(MIN_WITHDRAW_COINS)})`,
      );
      return;
    }
    if (coinsNum > state.coins) {
      setErrorMsg(`Insufficient coins. You have ${state.coins} coins.`);
      return;
    }

    const entry: WithdrawEntry = {
      id: Date.now(),
      coins: coinsNum,
      upiId: upiId.trim(),
      amount: inrAmount,
      status: "Pending",
      date: new Date().toLocaleDateString("en-IN"),
    };

    onStateUpdate({
      coins: state.coins - coinsNum,
      withdrawHistory: [entry, ...state.withdrawHistory],
    });

    // Push to global admin requests list
    const adminEntry: AdminWithdrawEntry = {
      ...entry,
      userName: state.userName,
    };
    const existingRaw = localStorage.getItem("adreward_all_requests");
    const existing: AdminWithdrawEntry[] = existingRaw
      ? JSON.parse(existingRaw)
      : [];
    localStorage.setItem(
      "adreward_all_requests",
      JSON.stringify([adminEntry, ...existing]),
    );

    setSuccessMsg(`₹${inrAmount} withdrawal request submitted successfully!`);
    setUpiId("");
    setCoinsInput("");
    toast.success("Withdrawal request submitted! 💰");
  };

  return (
    <div className="p-4 space-y-4">
      {/* AdSense Banner Ad */}
      <AdBanner slot="YOUR_WALLET_AD_SLOT" />

      {/* Balance */}
      <div className="bg-coin-card rounded-3xl p-6 text-center shadow-gold">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-body mb-1">
          Available Balance
        </p>
        <p className="text-5xl font-display font-black text-gold-400">
          {state.coins.toLocaleString()}
        </p>
        <p className="text-muted-foreground font-body text-sm">
          ≈ ₹{coinsToInr(state.coins)} INR
        </p>
      </div>

      {/* Redeem Section */}
      <div className="glass-card rounded-3xl p-5 space-y-4">
        <p className="font-display font-bold text-lg text-foreground">
          💳 Redeem Coins
        </p>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">
            UPI ID
          </p>
          <Input
            data-ocid="wallet.upi_input"
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground/40 h-12 rounded-xl font-body"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">
            Coins to Redeem
          </p>
          <Input
            data-ocid="wallet.coins_input"
            type="number"
            placeholder={`Min ${MIN_WITHDRAW_COINS} coins`}
            value={coinsInput}
            onChange={(e) => setCoinsInput(e.target.value)}
            className="bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground/40 h-12 rounded-xl font-body"
          />
          {coinsNum > 0 && (
            <p className="text-xs text-gold-400 font-body">
              = ₹{inrAmount.toFixed(2)} INR
            </p>
          )}
        </div>

        {errorMsg && (
          <div
            data-ocid="wallet.error_state"
            className="bg-destructive/10 border border-destructive/30 rounded-xl p-3"
          >
            <p className="text-destructive text-xs font-body">⚠ {errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div
            data-ocid="wallet.success_state"
            className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3"
          >
            <p className="text-emerald-400 text-xs font-body">
              ✅ {successMsg}
            </p>
          </div>
        )}

        <Button
          data-ocid="wallet.redeem_button"
          onClick={handleRedeem}
          className="w-full h-12 bg-gold-gradient font-display font-bold text-primary-foreground rounded-xl shadow-gold hover:opacity-90 transition-opacity"
        >
          💰 Redeem Now
        </Button>

        <p className="text-xs text-muted-foreground font-body text-center">
          Min: {MIN_WITHDRAW_COINS} coins · Supports UPI, Paytm, Bank Transfer
        </p>
      </div>

      {/* Withdraw History */}
      <div className="glass-card rounded-3xl p-5">
        <p className="font-display font-bold text-lg text-foreground mb-4">
          📜 Withdraw History
        </p>
        {state.withdrawHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-muted-foreground font-body text-sm">
              No withdrawals yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-muted-foreground font-body text-xs">
                    Date
                  </TableHead>
                  <TableHead className="text-muted-foreground font-body text-xs">
                    Coins
                  </TableHead>
                  <TableHead className="text-muted-foreground font-body text-xs">
                    Amount
                  </TableHead>
                  <TableHead className="text-muted-foreground font-body text-xs">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.withdrawHistory.map((entry, idx) => (
                  <TableRow
                    key={entry.id}
                    data-ocid={`wallet.row.${idx + 1}`}
                    className="border-border/20"
                  >
                    <TableCell className="text-xs font-body text-muted-foreground">
                      {entry.date}
                    </TableCell>
                    <TableCell className="text-xs font-body text-gold-400">
                      {entry.coins}
                    </TableCell>
                    <TableCell className="text-xs font-body text-foreground">
                      ₹{entry.amount}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs font-body">
                        {entry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({
  state,
  onLogout,
}: {
  state: AppState;
  onLogout: () => void;
}) {
  const initials = state.userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <div className="glass-card rounded-3xl p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gold-gradient mx-auto flex items-center justify-center mb-3 shadow-gold">
          <span className="text-2xl font-display font-black text-primary-foreground">
            {initials}
          </span>
        </div>
        <h2 className="font-display font-black text-2xl text-foreground">
          {state.userName}
        </h2>
        <p className="text-muted-foreground text-sm font-body mt-0.5">
          AdReward Member
        </p>
        <div className="mt-3 bg-secondary/30 rounded-xl p-3 inline-block">
          <p className="text-xs text-muted-foreground font-body">
            Your Referral Code
          </p>
          <p className="text-xl font-display font-black text-gold-400 tracking-widest">
            {state.referralCode}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-xl font-display font-bold text-gold-400">
            {state.totalCoinsEarned.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            Total Earned
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-xl font-display font-bold text-gold-400">
            {state.totalAdsWatched}
          </p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            Ads Watched
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-xl font-display font-bold text-gold-400">
            {state.checkInStreak}🔥
          </p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            Day Streak
          </p>
        </div>
      </div>

      {/* Referral stats */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-body mb-2">
          Referral Stats
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-bold text-foreground">
              {state.referredUsers.length} Friends Referred
            </p>
            <p className="text-xs text-muted-foreground font-body">
              {state.referredUsers.length * 500} coins earned from referrals
            </p>
          </div>
          <span className="text-3xl">👥</span>
        </div>
      </div>

      {/* Account Info */}
      <div className="glass-card rounded-2xl p-4 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-body mb-2">
          Account
        </p>
        <div className="flex justify-between items-center py-2 border-b border-border/20">
          <span className="text-sm font-body text-muted-foreground">
            Current Balance
          </span>
          <span className="text-sm font-display font-bold text-gold-400">
            {state.coins.toLocaleString()} 🪙
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border/20">
          <span className="text-sm font-body text-muted-foreground">
            INR Value
          </span>
          <span className="text-sm font-display font-bold text-foreground">
            ₹{coinsToInr(state.coins)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm font-body text-muted-foreground">
            Withdrawals
          </span>
          <span className="text-sm font-display font-bold text-foreground">
            {state.withdrawHistory.length}
          </span>
        </div>
      </div>

      {/* Logout */}
      <Button
        onClick={onLogout}
        className="w-full h-12 bg-destructive/20 border border-destructive/30 text-destructive font-body rounded-xl hover:bg-destructive/30 transition-colors"
      >
        🚪 Logout
      </Button>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground/40 font-body pb-4">
        © {new Date().getFullYear()} AdReward · Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-muted-foreground/80"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}

// ─── Bottom Nav ────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Tab; label: string; emoji: string }[] = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "earn", label: "Earn", emoji: "📺" },
  { id: "tasks", label: "Tasks", emoji: "✅" },
  { id: "wallet", label: "Wallet", emoji: "💰" },
  { id: "profile", label: "Profile", emoji: "👤" },
];

function BottomNav({
  active,
  onNavigate,
}: { active: Tab; onNavigate: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <button
            type="button"
            key={item.id}
            data-ocid={`${item.id}.tab`}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
              active === item.id
                ? "bg-gold-500/20 text-gold-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-xl">{item.emoji}</span>
            <span
              className={`text-xs font-body ${active === item.id ? "font-bold" : "font-normal"}`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── Admin Helpers ────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "admin123";
const ADMIN_REQUESTS_KEY = "adreward_all_requests";
const ADMIN_ABSENCES_KEY = "adreward_absences";

function loadAdminRequests(): AdminWithdrawEntry[] {
  try {
    const raw = localStorage.getItem(ADMIN_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAdminRequests(list: AdminWithdrawEntry[]) {
  localStorage.setItem(ADMIN_REQUESTS_KEY, JSON.stringify(list));
}

function loadAbsences(): AbsenceRecord[] {
  try {
    const raw = localStorage.getItem(ADMIN_ABSENCES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAbsences(list: AbsenceRecord[]) {
  localStorage.setItem(ADMIN_ABSENCES_KEY, JSON.stringify(list));
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ onExit }: { onExit: () => void }) {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pwError, setPwError] = useState("");
  const [activeTab, setActiveTab] = useState<"withdrawals" | "absences">(
    "withdrawals",
  );

  // Withdraw requests state
  const [requests, setRequests] = useState<AdminWithdrawEntry[]>(() =>
    loadAdminRequests(),
  );

  // Absence state
  const [absences, setAbsences] = useState<AbsenceRecord[]>(() =>
    loadAbsences(),
  );
  const [absName, setAbsName] = useState("");
  const [absDate, setAbsDate] = useState("");
  const [absReason, setAbsReason] = useState("");
  const [absStatus, setAbsStatus] = useState<AbsenceRecord["status"]>("Absent");

  const handleAdminLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setPwError("");
    } else {
      setPwError("Incorrect password. Try again.");
    }
  };

  const handleApprove = (id: number) => {
    const updated = requests.map((r) =>
      r.id === id ? { ...r, status: "Approved" } : r,
    );
    setRequests(updated);
    saveAdminRequests(updated);
    // Update user's own state if it exists
    try {
      const userState = localStorage.getItem(STORAGE_KEY);
      if (userState) {
        const parsed = JSON.parse(userState) as AppState;
        const updatedHistory = parsed.withdrawHistory.map((r) =>
          r.id === id ? { ...r, status: "Approved" } : r,
        );
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...parsed, withdrawHistory: updatedHistory }),
        );
      }
    } catch {
      /* ignore */
    }
    toast.success("Request approved!");
  };

  const handleReject = (id: number) => {
    const updated = requests.map((r) =>
      r.id === id ? { ...r, status: "Rejected" } : r,
    );
    setRequests(updated);
    saveAdminRequests(updated);
    try {
      const userState = localStorage.getItem(STORAGE_KEY);
      if (userState) {
        const parsed = JSON.parse(userState) as AppState;
        const updatedHistory = parsed.withdrawHistory.map((r) =>
          r.id === id ? { ...r, status: "Rejected" } : r,
        );
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...parsed, withdrawHistory: updatedHistory }),
        );
      }
    } catch {
      /* ignore */
    }
    toast.error("Request rejected.");
  };

  const handleAddAbsence = () => {
    if (!absName.trim() || !absDate || !absReason.trim()) {
      toast.error("Please fill in all absence fields.");
      return;
    }
    const record: AbsenceRecord = {
      id: Date.now(),
      name: absName.trim(),
      date: absDate,
      reason: absReason.trim(),
      status: absStatus,
    };
    const updated = [record, ...absences];
    setAbsences(updated);
    saveAbsences(updated);
    setAbsName("");
    setAbsDate("");
    setAbsReason("");
    setAbsStatus("Absent");
    toast.success("Absence record added!");
  };

  const handleDeleteAbsence = (id: number) => {
    const updated = absences.filter((a) => a.id !== id);
    setAbsences(updated);
    saveAbsences(updated);
    toast.success("Record deleted.");
  };

  const statusBadge = (status: string) => {
    if (status === "Approved" || status === "Present")
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (status === "Rejected" || status === "Absent")
      return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">🛡</div>
            <h1 className="font-display text-4xl font-black text-foreground mb-2">
              Admin Panel
            </h1>
            <p className="text-muted-foreground text-xs font-body uppercase tracking-widest">
              Restricted Access
            </p>
          </div>
          <div className="glass-card rounded-3xl p-8 space-y-5">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-body uppercase tracking-wider">
                Password
              </Label>
              <Input
                data-ocid="admin.password_input"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                className="bg-secondary/30 border-border/50 text-foreground h-12 rounded-xl font-body"
              />
              {pwError && (
                <p className="text-red-400 text-xs font-body">{pwError}</p>
              )}
            </div>
            <Button
              data-ocid="admin.login_button"
              onClick={handleAdminLogin}
              className="w-full h-12 bg-gold-gradient font-display font-bold rounded-xl shadow-gold-lg hover:opacity-90 transition-opacity"
            >
              🔐 Login as Admin
            </Button>
            <Button
              onClick={onExit}
              variant="ghost"
              className="w-full text-muted-foreground text-xs"
            >
              ← Back to App
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡</span>
          <span className="font-display font-black text-xl text-foreground">
            Admin Panel
          </span>
          <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 font-body">
            ADMIN
          </span>
        </div>
        <Button
          onClick={onExit}
          variant="outline"
          size="sm"
          className="border-border/50 text-muted-foreground text-xs rounded-xl"
        >
          Logout
        </Button>
      </header>

      {/* Sidebar + Content layout */}
      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-56 border-r border-border/30 p-4 space-y-1 hidden md:block">
          <button
            type="button"
            data-ocid="admin.withdraw_tab"
            onClick={() => setActiveTab("withdrawals")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-body transition-colors ${activeTab === "withdrawals" ? "bg-gold-400/20 text-gold-400 font-bold" : "text-muted-foreground hover:bg-secondary/40"}`}
          >
            💳 Withdraw Requests
          </button>
          <button
            type="button"
            data-ocid="admin.absence_tab"
            onClick={() => setActiveTab("absences")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-body transition-colors ${activeTab === "absences" ? "bg-gold-400/20 text-gold-400 font-bold" : "text-muted-foreground hover:bg-secondary/40"}`}
          >
            📅 Absence Management
          </button>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full"
          >
            <TabsList className="w-full rounded-none border-b border-border/30 bg-transparent h-12">
              <TabsTrigger
                data-ocid="admin.withdraw_tab"
                value="withdrawals"
                className="flex-1 text-xs font-body data-[state=active]:text-gold-400"
              >
                💳 Withdrawals
              </TabsTrigger>
              <TabsTrigger
                data-ocid="admin.absence_tab"
                value="absences"
                className="flex-1 text-xs font-body data-[state=active]:text-gold-400"
              >
                📅 Absences
              </TabsTrigger>
            </TabsList>
            <TabsContent value="withdrawals" className="mt-0 p-4">
              <AdminWithdrawalsContent
                requests={requests}
                onApprove={handleApprove}
                onReject={handleReject}
                statusBadge={statusBadge}
              />
            </TabsContent>
            <TabsContent value="absences" className="mt-0 p-4 space-y-6">
              <AdminAbsenceForm
                absName={absName}
                setAbsName={setAbsName}
                absDate={absDate}
                setAbsDate={setAbsDate}
                absReason={absReason}
                setAbsReason={setAbsReason}
                absStatus={absStatus}
                setAbsStatus={setAbsStatus}
                onAdd={handleAddAbsence}
              />
              <AdminAbsenceTable
                absences={absences}
                onDelete={handleDeleteAbsence}
                statusBadge={statusBadge}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop content */}
        <main className="flex-1 p-6 hidden md:block">
          {activeTab === "withdrawals" && (
            <AdminWithdrawalsContent
              requests={requests}
              onApprove={handleApprove}
              onReject={handleReject}
              statusBadge={statusBadge}
            />
          )}
          {activeTab === "absences" && (
            <div className="space-y-6">
              <AdminAbsenceForm
                absName={absName}
                setAbsName={setAbsName}
                absDate={absDate}
                setAbsDate={setAbsDate}
                absReason={absReason}
                setAbsReason={setAbsReason}
                absStatus={absStatus}
                setAbsStatus={setAbsStatus}
                onAdd={handleAddAbsence}
              />
              <AdminAbsenceTable
                absences={absences}
                onDelete={handleDeleteAbsence}
                statusBadge={statusBadge}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function AdminWithdrawalsContent({
  requests,
  onApprove,
  onReject,
  statusBadge,
}: {
  requests: AdminWithdrawEntry[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  statusBadge: (s: string) => string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-xl text-foreground">
        💳 Withdraw Requests
      </h2>
      {requests.length === 0 ? (
        <div
          data-ocid="admin.empty_state"
          className="glass-card rounded-2xl p-12 text-center"
        >
          <p className="text-muted-foreground font-body">
            No withdrawal requests yet.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="text-muted-foreground font-body text-xs">
                  Date
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  User
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  UPI ID
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  Coins
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  Amount
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req, idx) => (
                <TableRow
                  key={req.id}
                  data-ocid={`admin.row.${idx + 1}`}
                  className="border-border/20"
                >
                  <TableCell className="text-xs font-body text-muted-foreground">
                    {req.date}
                  </TableCell>
                  <TableCell className="text-xs font-body text-foreground font-medium">
                    {req.userName}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-foreground">
                    {req.upiId}
                  </TableCell>
                  <TableCell className="text-xs font-body text-gold-400">
                    {req.coins.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs font-body text-foreground">
                    ₹{req.amount}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-body ${statusBadge(req.status)}`}
                    >
                      {req.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {req.status === "Pending" && (
                      <div className="flex gap-1">
                        <Button
                          data-ocid={`admin.approve_button.${idx + 1}`}
                          size="sm"
                          onClick={() => onApprove(req.id)}
                          className="h-7 px-2 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg"
                          variant="ghost"
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          data-ocid={`admin.reject_button.${idx + 1}`}
                          size="sm"
                          onClick={() => onReject(req.id)}
                          className="h-7 px-2 text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg"
                          variant="ghost"
                        >
                          ✗ Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function AdminAbsenceForm({
  absName,
  setAbsName,
  absDate,
  setAbsDate,
  absReason,
  setAbsReason,
  absStatus,
  setAbsStatus,
  onAdd,
}: {
  absName: string;
  setAbsName: (v: string) => void;
  absDate: string;
  setAbsDate: (v: string) => void;
  absReason: string;
  setAbsReason: (v: string) => void;
  absStatus: AbsenceRecord["status"];
  setAbsStatus: (v: AbsenceRecord["status"]) => void;
  onAdd: () => void;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <h2 className="font-display font-bold text-lg text-foreground">
        ➕ Add Absence Record
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-body uppercase tracking-wider">
            Name
          </Label>
          <Input
            data-ocid="admin.absence_name_input"
            placeholder="Student / Employee name"
            value={absName}
            onChange={(e) => setAbsName(e.target.value)}
            className="bg-secondary/30 border-border/50 text-foreground h-10 rounded-xl font-body text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-body uppercase tracking-wider">
            Date
          </Label>
          <Input
            data-ocid="admin.absence_date_input"
            type="date"
            value={absDate}
            onChange={(e) => setAbsDate(e.target.value)}
            className="bg-secondary/30 border-border/50 text-foreground h-10 rounded-xl font-body text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-body uppercase tracking-wider">
            Reason
          </Label>
          <Input
            data-ocid="admin.absence_reason_input"
            placeholder="Reason for absence"
            value={absReason}
            onChange={(e) => setAbsReason(e.target.value)}
            className="bg-secondary/30 border-border/50 text-foreground h-10 rounded-xl font-body text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-body uppercase tracking-wider">
            Status
          </Label>
          <Select
            value={absStatus}
            onValueChange={(v) => setAbsStatus(v as AbsenceRecord["status"])}
          >
            <SelectTrigger
              data-ocid="admin.absence_status_select"
              className="bg-secondary/30 border-border/50 text-foreground h-10 rounded-xl font-body text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="Absent">🔴 Absent</SelectItem>
              <SelectItem value="Present">🟢 Present</SelectItem>
              <SelectItem value="Late">🟡 Late</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        data-ocid="admin.absence_submit_button"
        onClick={onAdd}
        className="bg-gold-gradient font-display font-bold rounded-xl shadow-gold-lg hover:opacity-90 transition-opacity"
      >
        ➕ Add Record
      </Button>
    </div>
  );
}

function AdminAbsenceTable({
  absences,
  onDelete,
  statusBadge,
}: {
  absences: AbsenceRecord[];
  onDelete: (id: number) => void;
  statusBadge: (s: string) => string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-display font-bold text-lg text-foreground">
        📋 Absence Records
      </h2>
      {absences.length === 0 ? (
        <div
          data-ocid="admin.absence_empty_state"
          className="glass-card rounded-2xl p-12 text-center"
        >
          <p className="text-muted-foreground font-body">
            No absence records yet. Add one above.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="text-muted-foreground font-body text-xs">
                  Name
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  Date
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  Reason
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground font-body text-xs">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absences.map((rec, idx) => (
                <TableRow
                  key={rec.id}
                  data-ocid={`admin.absence_row.${idx + 1}`}
                  className="border-border/20"
                >
                  <TableCell className="text-sm font-body text-foreground font-medium">
                    {rec.name}
                  </TableCell>
                  <TableCell className="text-xs font-body text-muted-foreground">
                    {rec.date}
                  </TableCell>
                  <TableCell className="text-xs font-body text-muted-foreground max-w-[200px] truncate">
                    {rec.reason}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-body ${statusBadge(rec.status)}`}
                    >
                      {rec.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      data-ocid={`admin.absence_delete_button.${idx + 1}`}
                      size="sm"
                      onClick={() => onDelete(rec.id)}
                      variant="ghost"
                      className="h-7 px-2 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg"
                    >
                      🗑 Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [adminMode, setAdminMode] = useState(
    () => window.location.hash === "#admin",
  );

  // Listen to hash changes
  useEffect(() => {
    const onHash = () => setAdminMode(window.location.hash === "#admin");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Reset daily limits on mount only
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run once on mount
  useEffect(() => {
    setState((prev) => {
      const today = getTodayString();
      if (prev.lastAdsDate !== today) {
        const next = { ...prev, dailyAdsWatched: 0, lastAdsDate: today };
        saveState(next);
        return next;
      }
      return prev;
    });
  }, []);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      saveState(next);
      return next;
    });
  }, []);

  const handleLogin = (name: string, referral: string) => {
    const newState: Partial<AppState> = {
      isLoggedIn: true,
      userName: name,
      referralCode: genReferralCode(),
    };
    // Referral bonus
    if (referral && referral.length === 6) {
      newState.coins = (state.coins || 0) + 500;
      newState.totalCoinsEarned = (state.totalCoinsEarned || 0) + 500;
      toast.success("🎉 Referral bonus! +500 Coins");
    }
    updateState(newState);
  };

  const handleLogout = () => {
    const fresh: AppState = { ...DEFAULT_STATE };
    saveState(fresh);
    setState(fresh);
    setActiveTab("home");
  };

  const handleEarnCoins = useCallback((coins: number) => {
    setState((prev) => {
      const next = {
        ...prev,
        coins: prev.coins + coins,
        dailyAdsWatched: prev.dailyAdsWatched + 1,
        lastAdsDate: getTodayString(),
        totalCoinsEarned: prev.totalCoinsEarned + coins,
        totalAdsWatched: prev.totalAdsWatched + 1,
      };
      saveState(next);
      return next;
    });
  }, []);

  if (adminMode) {
    return (
      <>
        <Toaster richColors position="top-center" />
        <AdminPanel
          onExit={() => {
            window.location.hash = "";
            setAdminMode(false);
          }}
        />
      </>
    );
  }

  if (!state.isLoggedIn) {
    return (
      <>
        <Toaster richColors position="top-center" />
        <LoginScreen
          onLogin={handleLogin}
          onAdminAccess={() => {
            window.location.hash = "#admin";
            setAdminMode(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />

      {/* App wrapper — mobile-first, max 430px, centered */}
      <div className="max-w-[430px] mx-auto relative min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 glass-card border-b border-border/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪙</span>
            <span className="font-display font-black text-xl shimmer-text">
              AdReward
            </span>
          </div>
          <div className="flex items-center gap-2 bg-secondary/40 rounded-full px-3 py-1.5">
            <span className="text-gold-400 font-display font-bold text-sm">
              {state.coins.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-body">🪙</span>
          </div>
        </header>

        {/* Page title */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="font-display font-black text-2xl text-foreground">
            {activeTab === "home" && "Dashboard"}
            {activeTab === "earn" && "Watch & Earn"}
            {activeTab === "tasks" && "Daily Tasks"}
            {activeTab === "wallet" && "My Wallet"}
            {activeTab === "profile" && "My Profile"}
          </h1>
        </div>

        {/* Main content with scroll */}
        <main className="overflow-y-auto pb-24">
          {activeTab === "home" && (
            <HomeTab state={state} onNavigate={setActiveTab} />
          )}
          {activeTab === "earn" && (
            <EarnTab state={state} onEarnCoins={handleEarnCoins} />
          )}
          {activeTab === "tasks" && (
            <TasksTab state={state} onStateUpdate={updateState} />
          )}
          {activeTab === "wallet" && (
            <WalletTab state={state} onStateUpdate={updateState} />
          )}
          {activeTab === "profile" && (
            <ProfileTab state={state} onLogout={handleLogout} />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav active={activeTab} onNavigate={setActiveTab} />
      </div>
    </div>
  );
}
