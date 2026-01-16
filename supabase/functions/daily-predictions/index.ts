import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Top-tier leagues and competitions to include
const ALLOWED_COMPETITIONS = [
  // Top 5 European Leagues
  "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1",
  // Other top leagues
  "Primeira Liga", "Eredivisie", "Belgian Pro League", "Scottish Premiership",
  "Super Lig", "Russian Premier League", "Ukrainian Premier League",
  "Liga Romania", "Liga 1", "SuperLiga",
  // UEFA Competitions
  "UEFA Champions League", "Champions League", "UCL",
  "UEFA Europa League", "Europa League", "UEL",
  "UEFA Conference League", "Conference League", "UECL",
  // National Teams
  "World Cup", "Euro", "UEFA Nations League", "Nations League",
  "World Cup Qualifiers", "Euro Qualifiers", "Friendlies"
];

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    console.log(`[Daily Predictions] Running for date: ${today}`);

    // Check if we already ran today
    const { data: existingPrediction } = await supabase
      .from("daily_predictions")
      .select("*")
      .eq("prediction_date", today)
      .single();

    if (existingPrediction) {
      console.log(`[Daily Predictions] Already generated for ${today}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Predictions already generated for today",
          data: existingPrediction 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get yesterday's predictions to update with results
    const { data: yesterdayPredictions } = await supabase
      .from("daily_predictions")
      .select("*")
      .eq("prediction_date", yesterday)
      .single();

    // Generate today's predictions using AI
    const promptForMatches = `
Ești un expert în predicții sportive cu acces la date live.

DATA DE ASTĂZI: ${today}

TASK: Generează EXACT 8 predicții pentru meciurile de fotbal de ASTĂZI din:
- Ligi de top: Premier League, La Liga, Serie A, Bundesliga, Ligue 1
- Alte ligi de nivel 1: Primeira Liga, Eredivisie, SuperLig, Liga 1 România
- UEFA: Champions League, Europa League, Conference League
- Naționale: Calificări, Nations League, Turnee finale

Pentru fiecare meci returnează un JSON VALID cu structura:
{
  "matches": [
    {
      "id": "unique-id",
      "competition": "Numele competiției",
      "homeTeam": "Echipa gazdă",
      "awayTeam": "Echipa oaspete",
      "kickoff": "HH:MM",
      "prediction": "1" sau "X" sau "2" sau "O2.5" sau "U2.5" sau "BTTS",
      "odds": {
        "home": 1.85,
        "draw": 3.40,
        "away": 4.20,
        "over25": 1.90,
        "under25": 1.95
      },
      "confidence": 75,
      "reasoning": "Motivul predicției în 1-2 propoziții",
      "monteCarloProbs": {
        "home": 52.3,
        "draw": 26.1,
        "away": 21.6,
        "over25": 58.4
      }
    }
  ],
  "betOfTheDay": {
    "matchId": "id-ul meciului recomandat",
    "reason": "De ce acest pariu are cea mai mare valoare"
  },
  "totalMatches": 8,
  "message": "Mesaj scurt dacă sunt mai puțin de 8 meciuri disponibile"
}

REGULI IMPORTANTE:
1. Folosește date REALE pentru meciurile de azi
2. Cotele să fie realiste (între 1.10 și 10.00)
3. Probabilitățile Monte Carlo să totalizeze ~100% pentru 1/X/2
4. Confidence între 60-95%
5. Dacă nu sunt 8 meciuri, pune câte găsești și explică în message
6. Returnează DOAR JSON valid, fără text suplimentar!
`;

    const promptForResults = yesterdayPredictions ? `
Ai predicțiile de IERI (${yesterday}):
${JSON.stringify(yesterdayPredictions.matches, null, 2)}

TASK: Pentru fiecare meci, adaugă rezultatul final real.
Returnează JSON cu structura:
{
  "matchesWithResults": [
    {
      ...meciul original...,
      "finalScore": "2-1",
      "outcome": "win" sau "loss" sau "push"
    }
  ],
  "summary": {
    "total": 8,
    "wins": 5,
    "losses": 3,
    "winRate": 62.5
  }
}

Folosește scorurile REALE din meciurile de ieri. Returnează DOAR JSON valid!
` : null;

    // Call AI for today's predictions
    console.log("[Daily Predictions] Calling AI for today's matches...");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Ești un expert în predicții sportive. Răspunzi DOAR cu JSON valid." },
          { role: "user", content: promptForMatches }
        ],
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[Daily Predictions] AI error:", errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    console.log("[Daily Predictions] AI response received, parsing...");

    // Extract JSON from AI response
    let predictionsData;
    try {
      // Try to extract JSON from markdown code blocks or raw text
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                        aiContent.match(/(\{[ \s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      predictionsData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[Daily Predictions] JSON parse error:", parseError);
      console.error("[Daily Predictions] Raw content:", aiContent);
      throw new Error("Failed to parse AI predictions");
    }

    // Save today's predictions
    const { error: insertError } = await supabase
      .from("daily_predictions")
      .insert({
        prediction_date: today,
        matches: predictionsData
      });

    if (insertError) {
      console.error("[Daily Predictions] DB insert error:", insertError);
      throw insertError;
    }

    console.log(`[Daily Predictions] Saved ${predictionsData.matches?.length || 0} predictions for ${today}`);

    // Process yesterday's results if we have predictions
    if (yesterdayPredictions && promptForResults) {
      console.log("[Daily Predictions] Fetching yesterday's results...");
      
      const resultsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Ești un expert în rezultate sportive. Răspunzi DOAR cu JSON valid." },
            { role: "user", content: promptForResults }
          ],
          max_tokens: 4000,
        }),
      });

      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const resultsContent = resultsData.choices?.[0]?.message?.content || "";
        
        try {
          const resultsJsonMatch = resultsContent.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                                   resultsContent.match(/(\{[ \s\S]*\})/);
          const resultsJsonStr = resultsJsonMatch ? resultsJsonMatch[1].trim() : resultsContent.trim();
          const resultsJson = JSON.parse(resultsJsonStr);

          // Save results
          await supabase
            .from("prediction_results")
            .upsert({
              prediction_date: yesterday,
              matches_with_results: resultsJson
            });

          console.log(`[Daily Predictions] Saved results for ${yesterday}`);
        } catch (e) {
          console.error("[Daily Predictions] Failed to parse results:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Predictions generated for ${today}`,
        predictions: predictionsData,
        date: today
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
