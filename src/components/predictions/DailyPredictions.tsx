import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, TrendingUp, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";

interface Match {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  prediction: string;
  odds: {
    home: number;
    draw: number;
    away: number;
    over25: number;
    under25: number;
  };
  confidence: number;
  reasoning: string;
  monteCarloProbs: {
    home: number;
    draw: number;
    away: number;
    over25: number;
  };
}

interface MatchResult extends Match {
  finalScore: string;
  outcome: "win" | "loss" | "push";
}

interface PredictionsData {
  matches: Match[];
  betOfTheDay?: {
    matchId: string;
    reason: string;
  };
  totalMatches: number;
  message?: string;
}

interface ResultsData {
  matchesWithResults: MatchResult[];
  summary?: {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
  };
}

export function DailyPredictions() {
  const [todayPredictions, setTodayPredictions] = useState<PredictionsData | null>(null);
  const [yesterdayResults, setYesterdayResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      // Fetch today's predictions
      const { data: todayData, error: todayError } = await supabase
        .from("daily_predictions")
        .select("*")
        .eq("prediction_date", today)
        .maybeSingle();

      if (todayError) throw todayError;
      
      if (todayData) {
        setTodayPredictions(todayData.matches as unknown as PredictionsData);
      }

      // Fetch yesterday's results
      const { data: resultsData, error: resultsError } = await supabase
        .from("prediction_results")
        .select("*")
        .eq("prediction_date", yesterday)
        .maybeSingle();

      if (resultsError) throw resultsError;
      
      if (resultsData) {
        setYesterdayResults(resultsData.matches_with_results as unknown as ResultsData);
      }
    } catch (err) {
      console.error("Error fetching predictions:", err);
      setError("Nu am putut încărca predicțiile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const betOfTheDayMatch = todayPredictions?.matches?.find(
    (m) => m.id === todayPredictions.betOfTheDay?.matchId
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold">Predicții Zilnice</h1>
          <p className="text-muted-foreground text-sm">
            <Calendar className="inline h-4 w-4 mr-1" />
            {new Date().toLocaleDateString("ro-RO", { 
              weekday: "long", 
              day: "numeric", 
              month: "long",
              year: "numeric"
            })}
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Bet of the Day */}
      {betOfTheDayMatch && (
        <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <Target className="h-5 w-5" />
              🔥 PARIUL ZILEI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MatchCard match={betOfTheDayMatch} isBetOfDay />
            {todayPredictions.betOfTheDay?.reason && (
              <p className="mt-3 text-sm text-muted-foreground italic">
                💡 {todayPredictions.betOfTheDay.reason}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today's Predictions */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Meciurile de Astăzi
          {todayPredictions?.message && (
            <Badge variant="secondary" className="ml-2">{todayPredictions.message}</Badge>
          )}
        </h2>

        {!todayPredictions?.matches?.length ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Predicțiile de azi vor fi generate la ora 05:00</p>
            <p className="text-sm mt-2">Verifică mai târziu!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayPredictions.matches
              .filter((m) => m.id !== todayPredictions.betOfTheDay?.matchId)
              .map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
          </div>
        )}
      </div>

      {/* Yesterday's Results */}
      {yesterdayResults?.matchesWithResults?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📊 Rezultatele de Ieri
            {yesterdayResults.summary && (
              <Badge 
                variant={yesterdayResults.summary.winRate >= 50 ? "default" : "secondary"}
                className="ml-2"
              >
                {yesterdayResults.summary.wins}/{yesterdayResults.summary.total} câștigate (
                {yesterdayResults.summary.winRate.toFixed(0)}%)
              </Badge>
            )}
          </h2>

          <div className="space-y-2">
            {yesterdayResults.matchesWithResults.map((match, idx) => (
              <ResultCard key={idx} match={match} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, isBetOfDay = false }: { match: Match; isBetOfDay?: boolean }) {
  const probs = match.monteCarloProbs;
  
  return (
    <Card className={`transition-all ${isBetOfDay ? "" : "hover:border-primary/50"}`}>
      <CardContent className="p-4">
        {/* Competition & Time */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {match.competition}
          </Badge>
          <span className="text-xs text-muted-foreground">⏰ {match.kickoff}</span>
        </div>

        {/* Teams */}
        <div className="text-center mb-3">
          <span className="font-semibold">{match.homeTeam}</span>
          <span className="text-muted-foreground mx-2">vs</span>
          <span className="font-semibold">{match.awayTeam}</span>
        </div>

        {/* Probability Bars */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-8">1</span>
            <Progress value={probs.home} className="flex-1 h-2" />
            <span className="w-12 text-right">{probs.home.toFixed(1)}%</span>
            <Badge variant="secondary" className="w-12 text-center">@{match.odds.home}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-8">X</span>
            <Progress value={probs.draw} className="flex-1 h-2" />
            <span className="w-12 text-right">{probs.draw.toFixed(1)}%</span>
            <Badge variant="secondary" className="w-12 text-center">@{match.odds.draw}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-8">2</span>
            <Progress value={probs.away} className="flex-1 h-2" />
            <span className="w-12 text-right">{probs.away.toFixed(1)}%</span>
            <Badge variant="secondary" className="w-12 text-center">@{match.odds.away}</Badge>
          </div>
        </div>

        {/* Prediction & Confidence */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-bold">
              {match.prediction}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Încredere: {match.confidence}%
            </span>
          </div>
          <Badge variant="outline">O2.5: {probs.over25.toFixed(0)}%</Badge>
        </div>

        {/* Reasoning */}
        {match.reasoning && (
          <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
            💭 {match.reasoning}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ResultCard({ match }: { match: MatchResult }) {
  const isWin = match.outcome === "win";
  const isLoss = match.outcome === "loss";

  return (
    <Card className={`border-l-4 ${isWin ? "border-l-green-500" : isLoss ? "border-l-red-500" : "border-l-yellow-500"}`}>
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Badge variant="outline" className="text-xs">{match.competition}</Badge>
          </div>
          <p className="text-sm font-medium">
            {match.homeTeam} vs {match.awayTeam}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary">{match.prediction}</Badge>
          <span className="font-bold text-lg">{match.finalScore}</span>
          {isWin ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : isLoss ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : (
            <span className="text-yellow-500">⏸️</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DailyPredictions;
