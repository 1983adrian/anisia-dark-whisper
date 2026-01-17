import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trophy, Target, TrendingUp, Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Bell, BellOff, RefreshCw } from "lucide-react";
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
  reasoning: string;
  riskLevel?: "low" | "medium" | "high";
  monteCarloProbs: { home: number; draw: number; away: number; over25: number; btts?: number };
  keyFactors?: string[];
  uncertaintyAdjustment?: string;
}

interface MatchResult extends Match {
  finalScore: string;
  outcome: "win" | "loss" | "push";
}

interface PredictionsData {
  matches: Match[];
  betOfTheDay?: { matchId: string; reason: string };
  totalMatches: number;
  message?: string;
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
  const [error, setError] = useState<string | null>(null);

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
      setError("Eroare încărcare");
    } finally {
      setLoading(false);
    }
  };

  const generateNow = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-predictions");
      if (error) throw error;
      toast.success(`${data.matchCount} predicții generate!`);
      fetchPredictions();
    } catch (err) {
      toast.error("Eroare generare predicții");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const betOfTheDay = todayPredictions?.matches?.find((m) => m.id === todayPredictions.betOfTheDay?.matchId);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold">Predicții Zilnice</h1>
            <p className="text-muted-foreground text-sm">
              <Calendar className="inline h-4 w-4 mr-1" />
              {new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && isSupported && (
            <Button
              variant={isSubscribed ? "secondary" : "outline"}
              size="sm"
              onClick={isSubscribed ? unsubscribe : subscribe}
            >
              {isSubscribed ? <BellOff className="h-4 w-4 mr-1" /> : <Bell className="h-4 w-4 mr-1" />}
              {isSubscribed ? "Dezactivează" : "Notificări"}
            </Button>
          )}
          <Button onClick={generateNow} disabled={generating} size="sm">
            <RefreshCw className={`h-4 w-4 mr-1 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generare..." : "Generează"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Bet of the Day */}
      {betOfTheDay && (
        <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <Target className="h-5 w-5" />
              🔥 PARIUL ZILEI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MatchCard match={betOfTheDay} isBetOfDay />
            {todayPredictions?.betOfTheDay?.reason && (
              <p className="mt-3 text-sm text-muted-foreground italic">💡 {todayPredictions.betOfTheDay.reason}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today's Matches */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Meciuri Dezechilibrate
          {todayPredictions?.message && <Badge variant="secondary" className="ml-2">{todayPredictions.message}</Badge>}
        </h2>

        {!todayPredictions?.matches?.length ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Predicțiile sunt generate automat la 05:00 UK</p>
            <Button onClick={generateNow} disabled={generating} className="mt-4">
              <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
              Generează Manual
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayPredictions.matches
              .filter((m) => m.id !== todayPredictions.betOfTheDay?.matchId)
              .map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        )}
      </div>

      {/* Yesterday's Results */}
      {yesterdayResults?.matchesWithResults?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📊 Rezultate Ieri
            {yesterdayResults.summary && (
              <Badge variant={yesterdayResults.summary.winRate >= 50 ? "default" : "secondary"} className="ml-2">
                {yesterdayResults.summary.wins}/{yesterdayResults.summary.total} ({yesterdayResults.summary.winRate.toFixed(0)}%)
              </Badge>
            )}
          </h2>
          <div className="space-y-2">
            {yesterdayResults.matchesWithResults.map((match, idx) => <ResultCard key={idx} match={match} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, isBetOfDay = false }: { match: Match; isBetOfDay?: boolean }) {
  const probs = match.monteCarloProbs;
  const riskColors = { low: "text-green-500", medium: "text-yellow-500", high: "text-red-500" };

  return (
    <Card className={`transition-all ${isBetOfDay ? "" : "hover:border-primary/50"}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">{match.competition}</Badge>
          <div className="flex items-center gap-2">
            {match.riskLevel && (
              <span className={`text-xs ${riskColors[match.riskLevel]}`}>
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                {match.riskLevel.toUpperCase()}
              </span>
            )}
            <span className="text-xs text-muted-foreground">⏰ {match.kickoff}</span>
          </div>
        </div>

        <div className="text-center mb-3">
          <span className="font-semibold">{match.homeTeam}</span>
          <span className="text-muted-foreground mx-2">vs</span>
          <span className="font-semibold">{match.awayTeam}</span>
        </div>

        <div className="space-y-2 mb-3">
          <ProbBar label="1" value={probs.home} odds={match.odds.home} />
          <ProbBar label="X" value={probs.draw} odds={match.odds.draw} />
          <ProbBar label="2" value={probs.away} odds={match.odds.away} />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-bold">{match.prediction}</Badge>
            <span className="text-xs text-muted-foreground">Încredere: {match.confidence}%</span>
          </div>
          <div className="flex gap-1">
            <Badge variant="outline">O2.5: {probs.over25?.toFixed(0)}%</Badge>
            {probs.btts !== undefined && <Badge variant="outline">BTTS: {probs.btts?.toFixed(0)}%</Badge>}
          </div>
        </div>

        {match.keyFactors && match.keyFactors.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {match.keyFactors.map((f, i) => <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>)}
          </div>
        )}

        {match.uncertaintyAdjustment && (
          <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">⚠️ {match.uncertaintyAdjustment}</p>
        )}

        {match.reasoning && (
          <p className="mt-2 text-xs text-muted-foreground border-t pt-2">💭 {match.reasoning}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProbBar({ label, value, odds }: { label: string; value: number; odds: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-6">{label}</span>
      <Progress value={value} className="flex-1 h-2" />
      <span className="w-12 text-right">{value?.toFixed(1)}%</span>
      <Badge variant="secondary" className="w-14 text-center">@{odds?.toFixed(2)}</Badge>
    </div>
  );
}

function ResultCard({ match }: { match: MatchResult }) {
  const isWin = match.outcome === "win";
  const isLoss = match.outcome === "loss";

  return (
    <Card className={`border-l-4 ${isWin ? "border-l-green-500" : isLoss ? "border-l-red-500" : "border-l-yellow-500"}`}>
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex-1">
          <Badge variant="outline" className="text-xs mb-1">{match.competition}</Badge>
          <p className="text-sm font-medium">{match.homeTeam} vs {match.awayTeam}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{match.prediction}</Badge>
          <span className="font-bold text-lg">{match.finalScore}</span>
          {isWin ? <CheckCircle className="h-5 w-5 text-green-500" /> : isLoss ? <XCircle className="h-5 w-5 text-red-500" /> : <span className="text-yellow-500">⏸️</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default DailyPredictions;