import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, CheckCircle, XCircle, Bell, BellOff, RefreshCw, Shield } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Match {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  prediction: string;
  odds: { home: number; draw: number; away: number; over25: number; under25: number };
  confidence: number;
  riskLevel?: "low" | "medium" | "high";
  monteCarloProbs: { home: number; draw: number; away: number; over25: number; btts?: number };
  verified?: boolean;
  criteria?: {
    formAdvantage?: boolean;
    tableAdvantage?: boolean;
    h2hAdvantage?: boolean;
  };
}

interface MatchResult extends Match {
  finalScore: string;
  outcome: "win" | "loss" | "push";
}

interface PredictionsData {
  matches: Match[];
  totalMatches: number;
}

interface ResultsData {
  matchesWithResults: MatchResult[];
  summary?: { total: number; wins: number; losses: number; winRate: number };
}

export function DailyPredictions() {
  const { user } = useAuth();
  const { isSubscribed, isSupported, subscribe, unsubscribe } = usePushNotifications();
  const [todayPredictions, setTodayPredictions] = useState<PredictionsData | null>(null);
  const [yesterdayResults, setYesterdayResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      const { data: todayData } = await supabase
        .from("daily_predictions")
        .select("*")
        .eq("prediction_date", today)
        .maybeSingle();

      if (todayData) {
        setTodayPredictions(todayData.matches as unknown as PredictionsData);
      }

      const { data: resultsData } = await supabase
        .from("prediction_results")
        .select("*")
        .eq("prediction_date", yesterday)
        .maybeSingle();

      if (resultsData) {
        setYesterdayResults(resultsData.matches_with_results as unknown as ResultsData);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateNow = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-predictions");
      if (error) throw error;

      if (data?.limitation === "AI_CREDITS_EXHAUSTED") {
        toast.error("Limita AI (402) — nu pot extrage meciuri azi.");
      } else if (data?.limitation === "AI_RATE_LIMIT") {
        toast.error("Limită rată (429) — încearcă mai târziu.");
      } else {
        toast.success(`${data.matchCount ?? 0} meciuri verificate!`);
      }

      fetchPredictions();
    } catch (err) {
      console.error(err);
      toast.error("Eroare generare");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  const matches = todayPredictions?.matches || [];
  const hasMatches = matches.length > 0;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      {/* Minimal Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <div>
            <h1 className="text-xl font-bold">Predicții Zilnice</h1>
            <p className="text-xs text-muted-foreground">
              <Calendar className="inline h-3 w-3 mr-1" />
              {new Date().toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && isSupported && (
            <Button
              variant={isSubscribed ? "secondary" : "ghost"}
              size="icon"
              onClick={isSubscribed ? unsubscribe : subscribe}
              title={isSubscribed ? "Dezactivează notificări" : "Activează notificări"}
            >
              {isSubscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </Button>
          )}
          <Button onClick={generateNow} disabled={generating} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Match Cards Grid - No text, only boxes */}
      {!hasMatches ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Următoarele predicții vor apărea mâine la 05:00 UK</p>
          <Button onClick={generateNow} disabled={generating} className="mt-4" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            Scanează Acum
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchBox key={match.id} match={match} />
          ))}
        </div>
      )}

      {/* Yesterday Results - Minimal */}
      {yesterdayResults?.matchesWithResults?.length > 0 && (
        <div className="border-t border-border pt-6 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-muted-foreground">Rezultate Ieri</span>
            {yesterdayResults.summary && (
              <Badge variant={yesterdayResults.summary.winRate >= 50 ? "default" : "secondary"}>
                {yesterdayResults.summary.wins}/{yesterdayResults.summary.total}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {yesterdayResults.matchesWithResults.map((match, idx) => (
              <ResultBadge key={idx} match={match} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact Match Box - No text, only essential data
function MatchBox({ match }: { match: Match }) {
  const probs = match.monteCarloProbs;
  const riskColors = { 
    low: "border-l-green-500", 
    medium: "border-l-yellow-500", 
    high: "border-l-red-500" 
  };

  return (
    <Card className={`border-l-4 ${riskColors[match.riskLevel || "medium"]} bg-card hover:bg-accent/5 transition-colors`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] font-normal">
            {match.competition}
          </Badge>
          <div className="flex items-center gap-1">
            {match.verified && <Shield className="h-3 w-3 text-green-500" />}
            <span className="text-[10px] text-muted-foreground">{match.kickoff}</span>
          </div>
        </div>

        {/* Teams */}
        <div className="text-center py-2">
          <div className="font-semibold text-sm">{match.homeTeam}</div>
          <div className="text-[10px] text-muted-foreground my-1">vs</div>
          <div className="font-semibold text-sm">{match.awayTeam}</div>
        </div>

        {/* Probability Bars */}
        <div className="space-y-1.5">
          <ProbRow label="1" value={probs.home} />
          <ProbRow label="X" value={probs.draw} />
          <ProbRow label="2" value={probs.away} />
        </div>

        {/* Prediction */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Badge className="font-bold">{match.prediction}</Badge>
          <span className="text-[10px] text-muted-foreground">{match.confidence}%</span>
        </div>

        {/* Criteria & Extra Stats */}
        <div className="flex flex-wrap gap-1 justify-center">
          {match.criteria?.formAdvantage && (
            <Badge variant="outline" className="text-[9px] border-green-500/50 text-green-500">Formă ✓</Badge>
          )}
          {match.criteria?.tableAdvantage && (
            <Badge variant="outline" className="text-[9px] border-blue-500/50 text-blue-500">Clasament ✓</Badge>
          )}
          {match.criteria?.h2hAdvantage && (
            <Badge variant="outline" className="text-[9px] border-purple-500/50 text-purple-500">H2H ✓</Badge>
          )}
        </div>
        <div className="flex gap-1 justify-center">
          <Badge variant="secondary" className="text-[9px]">O2.5: {probs.over25?.toFixed(0)}%</Badge>
          {probs.btts !== undefined && (
            <Badge variant="secondary" className="text-[9px]">BTTS: {probs.btts?.toFixed(0)}%</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProbRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-3 font-medium">{label}</span>
      <Progress value={value} className="flex-1 h-1.5" />
      <span className="w-8 text-right text-muted-foreground">{value?.toFixed(0)}%</span>
    </div>
  );
}

function ResultBadge({ match }: { match: MatchResult }) {
  const isWin = match.outcome === "win";
  const isLoss = match.outcome === "loss";

  return (
    <Badge 
      variant="outline" 
      className={`text-[10px] ${isWin ? "border-green-500 text-green-500" : isLoss ? "border-red-500 text-red-500" : "border-yellow-500 text-yellow-500"}`}
    >
      {match.homeTeam.slice(0, 3)} {match.finalScore} {match.awayTeam.slice(0, 3)}
      {isWin ? <CheckCircle className="h-3 w-3 ml-1" /> : isLoss ? <XCircle className="h-3 w-3 ml-1" /> : null}
    </Badge>
  );
}

export default DailyPredictions;
