import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_COMPETITIONS = [
  "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1",
  "Primeira Liga", "Eredivisie", "Belgian Pro League", "Scottish Premiership",
  "Super Lig", "Championship", "Serie B", "2. Bundesliga", "Ligue 2",
  "Liga Romania", "Liga 1", "SuperLiga",
  "UEFA Champions League", "Champions League", "UCL",
  "UEFA Europa League", "Europa League", "UEL",
  "UEFA Conference League", "Conference League", "UECL",
  "World Cup", "Euro", "UEFA Nations League", "Nations League",
  "World Cup Qualifiers", "Euro Qualifiers"
];

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
  riskLevel: "low" | "medium" | "high";
  monteCarloProbs: { home: number; draw: number; away: number; over25: number; btts: number };
  firecrawlData?: {
    form: string;
    standings: string;
    injuries: string;
    news: string;
    weatherConditions: string;
  };
}

async function scrapeMatchData(firecrawlApiKey: string, query: string): Promise<any> {
  console.log(`[Firecrawl] Searching: ${query}`);
  
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] }
      }),
    });

    if (!response.ok) {
      console.error(`[Firecrawl] Error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[Firecrawl] Request failed:", error);
    return null;
  }
}

async function runMonteCarloSimulation(
  homeStrength: number,
  awayStrength: number,
  iterations: number = 100000
): Promise<{ home: number; draw: number; away: number; over25: number; btts: number }> {
  let homeWins = 0, draws = 0, awayWins = 0, over25 = 0, btts = 0;

  const poissonProb = (lambda: number, k: number): number => {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
  };

  const factorial = (n: number): number => {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  };

  const homeExpected = homeStrength;
  const awayExpected = awayStrength;

  for (let i = 0; i < iterations; i++) {
    let homeGoals = 0, awayGoals = 0;
    
    for (let g = 0; g < 8; g++) {
      if (Math.random() < poissonProb(homeExpected, g)) homeGoals = g;
      if (Math.random() < poissonProb(awayExpected, g)) awayGoals = g;
    }

    if (homeGoals > awayGoals) homeWins++;
    else if (homeGoals < awayGoals) awayWins++;
    else draws++;

    if (homeGoals + awayGoals > 2.5) over25++;
    if (homeGoals > 0 && awayGoals > 0) btts++;
  }

  return {
    home: (homeWins / iterations) * 100,
    draw: (draws / iterations) * 100,
    away: (awayWins / iterations) * 100,
    over25: (over25 / iterations) * 100,
    btts: (btts / iterations) * 100,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    console.log(`[Daily Predictions] Running for date: ${today}`);

    // Check if already ran today
    const { data: existingPrediction } = await supabase
      .from("daily_predictions")
      .select("*")
      .eq("prediction_date", today)
      .single();

    if (existingPrediction) {
      console.log(`[Daily Predictions] Already generated for ${today}`);
      return new Response(
        JSON.stringify({ success: true, message: "Already generated", data: existingPrediction }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Use Firecrawl to get today's matches
    console.log("[Step 1] Fetching match data with Firecrawl...");
    
    let firecrawlData = null;
    if (firecrawlApiKey) {
      firecrawlData = await scrapeMatchData(
        firecrawlApiKey,
        `football matches today ${today} Premier League La Liga Serie A Bundesliga Champions League odds predictions`
      );
      console.log("[Firecrawl] Data received:", firecrawlData?.success ? "success" : "failed");
    }

    // Step 2: AI Analysis with 80/20 Rule
    console.log("[Step 2] AI analysis with Monte Carlo + 80/20 factor...");

    const analysisPrompt = `
DATA: ${today}
FIRECRAWL DATA: ${JSON.stringify(firecrawlData?.data || [], null, 2).slice(0, 8000)}

TASK STRICT:
1. Extrage DOAR meciuri DEZECHILIBRATE din ligile de top
2. Aplică factorul 80/20:
   - 80% date reale (formă, clasament, absențe, cote)
   - 20% incertitudine (penalty, cartonaș roșu, accidentări)
3. MAX 8 meciuri, MIN 1
4. NU include meciuri echilibrate

FILTRE OBLIGATORII:
- Diferență mare clasament SAU
- Diferență clară formă SAU
- Absențe majore echipa slabă SAU
- Diferență semnificativă cote SAU
- Avantaj puternic acasă pentru favorită

RETURN JSON STRICT:
{
  "matches": [
    {
      "id": "uuid",
      "competition": "Premier League",
      "homeTeam": "Echipa",
      "awayTeam": "Echipa",
      "kickoff": "HH:MM",
      "prediction": "1|X|2|O2.5|U2.5|BTTS",
      "odds": {"home": 1.5, "draw": 4.0, "away": 6.0, "over25": 1.8, "under25": 2.0},
      "confidence": 75,
      "reasoning": "Motiv scurt",
      "riskLevel": "low|medium|high",
      "monteCarloProbs": {"home": 65, "draw": 20, "away": 15, "over25": 55, "btts": 45},
      "keyFactors": ["Factor1", "Factor2"],
      "uncertaintyAdjustment": "20% risc: penalty posibil"
    }
  ],
  "betOfTheDay": {"matchId": "id", "reason": "Cel mai mare edge"},
  "totalMatches": 5,
  "message": "5 meciuri dezechilibrate găsite"
}

DOAR JSON, FĂRĂ TEXT!`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: `Expert predicții fotbal. Aplică:
- Monte Carlo 5M simulări
- Poisson Distribution
- 80% date reale / 20% incertitudine
- DOAR meciuri clar dezechilibrate
Răspuns: JSON STRICT, fără explicații.`
          },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 10000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON
    let predictionsData;
    try {
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/) || aiContent.match(/(\{[\s\S]*\})/);
      predictionsData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : aiContent.trim());
    } catch (e) {
      console.error("[Parse Error]:", aiContent.slice(0, 500));
      throw new Error("Failed to parse predictions");
    }

    // Step 3: Run Monte Carlo on each match
    console.log("[Step 3] Running Monte Carlo simulations...");
    
    if (predictionsData.matches) {
      for (const match of predictionsData.matches) {
        const homeStrength = match.monteCarloProbs?.home ? match.monteCarloProbs.home / 40 : 1.5;
        const awayStrength = match.monteCarloProbs?.away ? match.monteCarloProbs.away / 40 : 1.0;
        
        const simResults = await runMonteCarloSimulation(homeStrength, awayStrength, 100000);
        
        // Apply 80/20 adjustment
        match.monteCarloProbs = {
          home: simResults.home * 0.8 + (100 - simResults.home) * 0.04,
          draw: simResults.draw * 0.8 + 20 * 0.2,
          away: simResults.away * 0.8 + (100 - simResults.away) * 0.04,
          over25: simResults.over25 * 0.8 + 50 * 0.2,
          btts: simResults.btts * 0.8 + 50 * 0.2,
        };
      }
    }

    // Save predictions
    const { error: insertError } = await supabase
      .from("daily_predictions")
      .insert({ prediction_date: today, matches: predictionsData });

    if (insertError) throw insertError;

    console.log(`[Daily Predictions] Saved ${predictionsData.matches?.length || 0} predictions`);

    // Process yesterday's results
    const { data: yesterdayPredictions } = await supabase
      .from("daily_predictions")
      .select("*")
      .eq("prediction_date", yesterday)
      .single();

    if (yesterdayPredictions) {
      console.log("[Step 4] Processing yesterday's results...");

      let yesterdayData = null;
      if (firecrawlApiKey) {
        yesterdayData = await scrapeMatchData(
          firecrawlApiKey,
          `football results ${yesterday} scores final`
        );
      }

      const resultsPrompt = `
PREDICȚII IERI (${yesterday}):
${JSON.stringify(yesterdayPredictions.matches, null, 2)}

REZULTATE FIRECRAWL:
${JSON.stringify(yesterdayData?.data || [], null, 2).slice(0, 5000)}

RETURN JSON:
{
  "matchesWithResults": [
    {...match, "finalScore": "2-1", "outcome": "win|loss|push"}
  ],
  "summary": {"total": 8, "wins": 5, "losses": 3, "winRate": 62.5}
}`;

      const resultsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Expert rezultate. DOAR JSON valid." },
            { role: "user", content: resultsPrompt }
          ],
          max_tokens: 5000,
        }),
      });

      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const resultsContent = resultsData.choices?.[0]?.message?.content || "";
        
        try {
          const rMatch = resultsContent.match(/```(?:json)?\s*([\s\S]*?)```/) || resultsContent.match(/(\{[\s\S]*\})/);
          const resultsJson = JSON.parse(rMatch ? rMatch[1].trim() : resultsContent.trim());
          
          await supabase.from("prediction_results").upsert({
            prediction_date: yesterday,
            matches_with_results: resultsJson
          });
          console.log(`[Results] Saved for ${yesterday}`);
        } catch (e) {
          console.error("[Results Parse Error]:", e);
        }
      }
    }

    // Send push notifications
    console.log("[Step 5] Sending push notifications...");
    
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subscriptions && subscriptions.length > 0) {
      console.log(`[Push] ${subscriptions.length} subscribers found`);
      // Push notification logic would go here with web-push
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        matchCount: predictionsData.matches?.length || 0,
        predictions: predictionsData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Daily Predictions] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});