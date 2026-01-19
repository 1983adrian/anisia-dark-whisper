import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Match {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  prediction: string;
  odds: { home: number; draw: number; away: number; over25: number; under25: number };
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  monteCarloProbs: { home: number; draw: number; away: number; over25: number; btts: number };
  verified: boolean;
  dataSource: string;
  criteria: {
    formAdvantage: boolean;
    tableAdvantage: boolean;
    h2hAdvantage: boolean;
  };
}

// Words that indicate non-match content
const BLACKLIST = [
  "promotion", "relegation", "trade", "claim", "bonus", "kalshi", "bet now",
  "sign up", "register", "download", "app", "standings", "table view", "matchday"
];

// Monte Carlo simulation
function runMonteCarloSimulation(
  homeStrength: number,
  awayStrength: number,
  iterations: number = 50000
): { home: number; draw: number; away: number; over25: number; btts: number } {
  let homeWins = 0, draws = 0, awayWins = 0, over25 = 0, btts = 0;

  const poissonProb = (lambda: number, k: number): number => {
    let result = Math.exp(-lambda);
    for (let i = 1; i <= k; i++) {
      result *= lambda / i;
    }
    return result;
  };

  for (let i = 0; i < iterations; i++) {
    let homeGoals = 0, awayGoals = 0;
    let pHome = Math.random();
    let pAway = Math.random();
    let cumHome = 0, cumAway = 0;

    for (let g = 0; g < 10; g++) {
      cumHome += poissonProb(homeStrength, g);
      cumAway += poissonProb(awayStrength, g);
      if (pHome < cumHome && homeGoals === 0) homeGoals = g;
      if (pAway < cumAway && awayGoals === 0) awayGoals = g;
    }

    if (homeGoals > awayGoals) homeWins++;
    else if (homeGoals < awayGoals) awayWins++;
    else draws++;

    if (homeGoals + awayGoals > 2) over25++;
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

// Extract betting matches with odds from Firecrawl data
function extractBettingMatches(markdown: string): Array<{
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  competition: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
}> {
  const matches: Array<{
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    competition: string;
    homeOdds: number;
    drawOdds: number;
    awayOdds: number;
  }> = [];

  const lines = markdown.split("\n");
  let currentCompetition = "International";

  // Pattern: Team A vs Team B or Team A - Team B with optional odds
  const matchPatterns = [
    // "Team A vs Team B"
    /^[\s\*\-]*([A-Za-z\u00C0-\u024F\s\.&']+?)\s+(?:vs\.?|v\.?|–|-)\s+([A-Za-z\u00C0-\u024F\s\.&']+?)(?:\s+(\d{1,2}[:\.]?\d{2}))?$/i,
    // With odds: "Team A 1.50 3.20 2.10 Team B"
    /([A-Za-z\u00C0-\u024F\s\.&']+?)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+([A-Za-z\u00C0-\u024F\s\.&']+)/i,
  ];

  // Competition detection pattern
  const competitionPattern = /(?:^|\s)((?:Premier League|La Liga|Serie A|Bundesliga|Ligue 1|Liga 1|SuperLiga|Champions League|Europa League|Conference League|World Cup|Copa|MLS|J-?League|K-?League|A-?League|Brasileirao|Argentina|Mexico|Saudi|UAE|China|India|Egypt|South Africa|Morocco|Turkey|Greece|Netherlands|Belgium|Portugal|Scotland|Austria|Switzerland|Poland|Czech|Ukraine|Russia|Denmark|Sweden|Norway|Finland|Romania|Bulgaria|Serbia|Croatia|Slovenia|Hungary|Slovakia|Israel|Japan|Korea|Australia|USA|Canada|Chile|Colombia|Peru|Ecuador|Venezuela|Paraguay|Uruguay|Bolivia|Costa Rica|Panama|Jamaica|Honduras|Guatemala|El Salvador|Nicaragua|Qatar|Kuwait|Bahrain|Oman|Jordan|Lebanon|Iraq|Iran|Uzbekistan|Kazakhstan|Thailand|Vietnam|Indonesia|Malaysia|Singapore|Philippines|Taiwan|Hong Kong)[^\n]*)/i;

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    const lowerLine = trimmed.toLowerCase();
    
    // Skip blacklisted content
    if (BLACKLIST.some(b => lowerLine.includes(b))) continue;

    // Detect competition
    const compMatch = trimmed.match(competitionPattern);
    if (compMatch) {
      currentCompetition = compMatch[1].trim();
    }

    // Clean line
    trimmed = trimmed.replace(/\s*\(\d{1,2}\/\d{1,2}\/\d{4}\)\s*/g, "").trim();
    trimmed = trimmed.replace(/^[\*\-\d\.]+\s*/, "").trim();

    // Try patterns
    for (const pattern of matchPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        let homeTeam: string, awayTeam: string;
        let homeOdds = 0, drawOdds = 0, awayOdds = 0;
        let kickoff = "TBD";

        if (match.length === 6) {
          // Pattern with odds
          homeTeam = match[1].trim();
          homeOdds = parseFloat(match[2]);
          drawOdds = parseFloat(match[3]);
          awayOdds = parseFloat(match[4]);
          awayTeam = match[5].trim();
        } else {
          homeTeam = match[1].trim();
          awayTeam = match[2].trim();
          if (match[3]) kickoff = match[3];
        }

        // Clean team names
        homeTeam = homeTeam.replace(/[*#\[\]]/g, "").replace(/\s+/g, " ").trim();
        awayTeam = awayTeam.replace(/[*#\[\]]/g, "").replace(/\s+/g, " ").trim();

        // Validate
        const validHome = homeTeam.length >= 3 && homeTeam.length <= 35 && !/^\d+$/.test(homeTeam);
        const validAway = awayTeam.length >= 3 && awayTeam.length <= 35 && !/^\d+$/.test(awayTeam);

        if (validHome && validAway) {
          matches.push({
            homeTeam,
            awayTeam,
            kickoff,
            competition: currentCompetition,
            homeOdds,
            drawOdds,
            awayOdds
          });
        }
        break;
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return matches.filter(m => {
    const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Analyze team data from scraped content
function analyzeTeamCriteria(
  homeTeam: string,
  awayTeam: string,
  allContent: string
): { formAdvantage: boolean; tableAdvantage: boolean; h2hAdvantage: boolean; predictedWinner: "home" | "away" | "draw"; strength: number } {
  const content = allContent.toLowerCase();
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();

  // Form indicators (wins, unbeaten, good form)
  const homeFormPatterns = [
    new RegExp(`${homeLower}.*(?:won|win|victory|unbeaten|form|streak)`, "i"),
    new RegExp(`(?:won|win|victory|unbeaten).*${homeLower}`, "i"),
  ];
  const awayFormPatterns = [
    new RegExp(`${awayLower}.*(?:won|win|victory|unbeaten|form|streak)`, "i"),
    new RegExp(`(?:won|win|victory|unbeaten).*${awayLower}`, "i"),
  ];

  let homeFormScore = 0;
  let awayFormScore = 0;

  for (const p of homeFormPatterns) {
    if (p.test(content)) homeFormScore++;
  }
  for (const p of awayFormPatterns) {
    if (p.test(content)) awayFormScore++;
  }

  // Table position indicators
  const homeTablePatterns = [
    new RegExp(`${homeLower}.*(?:1st|2nd|3rd|top|leader|first|second|third)`, "i"),
    new RegExp(`(?:1st|2nd|3rd|top|leader|first|second|third).*${homeLower}`, "i"),
  ];
  const awayTablePatterns = [
    new RegExp(`${awayLower}.*(?:1st|2nd|3rd|top|leader|first|second|third)`, "i"),
    new RegExp(`(?:1st|2nd|3rd|top|leader|first|second|third).*${awayLower}`, "i"),
  ];

  let homeTableScore = 0;
  let awayTableScore = 0;

  for (const p of homeTablePatterns) {
    if (p.test(content)) homeTableScore++;
  }
  for (const p of awayTablePatterns) {
    if (p.test(content)) awayTableScore++;
  }

  // H2H indicators (last 3 matches)
  const h2hPatterns = [
    new RegExp(`${homeLower}.*beat.*${awayLower}`, "i"),
    new RegExp(`${homeLower}.*won.*against.*${awayLower}`, "i"),
    new RegExp(`${homeLower}.*defeated.*${awayLower}`, "i"),
    new RegExp(`${homeLower}.*unbeaten.*${awayLower}`, "i"),
  ];
  const h2hAwayPatterns = [
    new RegExp(`${awayLower}.*beat.*${homeLower}`, "i"),
    new RegExp(`${awayLower}.*won.*against.*${homeLower}`, "i"),
    new RegExp(`${awayLower}.*defeated.*${homeLower}`, "i"),
  ];

  let homeH2HScore = 0;
  let awayH2HScore = 0;

  for (const p of h2hPatterns) {
    if (p.test(content)) homeH2HScore++;
  }
  for (const p of h2hAwayPatterns) {
    if (p.test(content)) awayH2HScore++;
  }

  // Determine advantages
  const formAdvantage = homeFormScore > awayFormScore;
  const tableAdvantage = homeTableScore > awayTableScore;
  const h2hAdvantage = homeH2HScore >= awayH2HScore; // >= means didn't lose

  // Calculate overall strength
  const homeTotal = homeFormScore + homeTableScore + homeH2HScore + (formAdvantage ? 1 : 0) + (tableAdvantage ? 1 : 0) + (h2hAdvantage ? 1 : 0);
  const awayTotal = awayFormScore + awayTableScore + awayH2HScore + (!formAdvantage ? 1 : 0) + (!tableAdvantage ? 1 : 0) + (!h2hAdvantage ? 1 : 0);

  let predictedWinner: "home" | "away" | "draw" = "draw";
  let strength = 0.5;

  if (homeTotal > awayTotal + 1) {
    predictedWinner = "home";
    strength = 0.6 + (homeTotal - awayTotal) * 0.05;
  } else if (awayTotal > homeTotal + 1) {
    predictedWinner = "away";
    strength = 0.6 + (awayTotal - homeTotal) * 0.05;
  }

  return {
    formAdvantage,
    tableAdvantage,
    h2hAdvantage,
    predictedWinner,
    strength: Math.min(0.9, strength)
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    console.log(`[AUDIT] Betting market scan for: ${today}`);

    // Check existing predictions
    const { data: existingPrediction } = await supabase
      .from("daily_predictions")
      .select("*")
      .eq("prediction_date", today)
      .single();

    if (existingPrediction && (existingPrediction.matches as any)?.matches?.length > 0) {
      console.log(`[AUDIT] Predictions exist for ${today}`);
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          date: today,
          matchCount: (existingPrediction.matches as any).matches.length,
          predictions: existingPrediction.matches
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 1: Fetch worldwide betting markets
    console.log("[STEP 1] Scanning worldwide betting markets...");

    const searchQueries = [
      `football betting odds today ${today}`,
      `soccer matches betting markets worldwide ${today}`,
      `today football fixtures odds Europe Asia South America`,
      `betting football matches Africa Australia ${today}`,
      `football today odds Premier League La Liga Serie A Bundesliga`,
    ];

    let allMarkdown = "";

    for (const query of searchQueries) {
      try {
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `${query} site:flashscore.com OR site:sofascore.com OR site:soccerway.com OR site:livescore.com`,
            limit: 5,
            scrapeOptions: { formats: ["markdown"] }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.data) {
            for (const item of data.data) {
              if (item.markdown) {
                allMarkdown += `\n${item.markdown}\n`;
              }
            }
          }
        }
      } catch (e) {
        console.error(`[Firecrawl] Query failed: ${query}`, e);
      }
    }

    // STEP 2: Fetch team form and H2H data
    console.log("[STEP 2] Fetching form and H2H data...");

    let formH2HContent = "";

    try {
      const formResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `football team form standings results ${today} last 5 matches unbeaten winning streak`,
          limit: 5,
          scrapeOptions: { formats: ["markdown"] }
        }),
      });

      if (formResponse.ok) {
        const formData = await formResponse.json();
        if (formData?.data) {
          for (const item of formData.data) {
            if (item.markdown) {
              formH2HContent += `\n${item.markdown}\n`;
            }
          }
        }
      }
    } catch (e) {
      console.error("[Firecrawl] Form data fetch failed:", e);
    }

    const combinedContent = allMarkdown + formH2HContent;

    console.log(`[STEP 2] Collected ${combinedContent.length} chars of data`);

    if (!combinedContent || combinedContent.length < 200) {
      console.log("[AUDIT] No betting data found");
      
      await supabase.from("daily_predictions").upsert({
        prediction_date: today,
        matches: { matches: [], totalMatches: 0, message: "No betting markets found" }
      });

      return new Response(
        JSON.stringify({ success: true, matchCount: 0, message: "No betting markets found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 3: Extract matches from betting data
    console.log("[STEP 3] Extracting betting matches...");

    const rawMatches = extractBettingMatches(allMarkdown);
    console.log(`[STEP 3] Found ${rawMatches.length} betting matches`);

    // STEP 4: Apply selection criteria and Monte Carlo
    console.log("[STEP 4] Applying criteria (Form + Table + H2H)...");

    const validatedMatches: Match[] = [];

    for (const raw of rawMatches) {
      // Analyze team criteria from scraped content
      const criteria = analyzeTeamCriteria(raw.homeTeam, raw.awayTeam, combinedContent);

      // SELECTION CRITERIA:
      // 1. Team must have form advantage OR table advantage
      // 2. Must not have lost last 3 H2H (h2hAdvantage = true means they didn't lose)
      const meetsFormOrTable = criteria.formAdvantage || criteria.tableAdvantage;
      const meetsH2H = criteria.h2hAdvantage;

      if (!meetsFormOrTable && !meetsH2H) {
        console.log(`[SKIP] No advantage: ${raw.homeTeam} vs ${raw.awayTeam}`);
        continue;
      }

      // Calculate strength based on criteria and odds
      let homeStrength = 1.3;
      let awayStrength = 1.1;

      if (raw.homeOdds > 0 && raw.awayOdds > 0) {
        // Use odds to estimate strength (lower odds = stronger team)
        homeStrength = 1.0 + (3.0 / raw.homeOdds) * 0.5;
        awayStrength = 1.0 + (3.0 / raw.awayOdds) * 0.5;
      } else {
        // Use criteria-based strength
        if (criteria.predictedWinner === "home") {
          homeStrength = 1.4 + criteria.strength * 0.4;
          awayStrength = 0.9;
        } else if (criteria.predictedWinner === "away") {
          homeStrength = 0.9;
          awayStrength = 1.4 + criteria.strength * 0.4;
        }
      }

      // Run Monte Carlo
      const simResults = runMonteCarloSimulation(homeStrength, awayStrength, 50000);

      // Apply 80/20 rule
      const adjustedProbs = {
        home: simResults.home * 0.8 + 16.67 * 0.2,
        draw: simResults.draw * 0.8 + 16.67 * 0.2,
        away: simResults.away * 0.8 + 16.67 * 0.2,
        over25: simResults.over25 * 0.8 + 50 * 0.2,
        btts: simResults.btts * 0.8 + 50 * 0.2,
      };

      // Determine prediction
      let prediction = "1";
      let maxProb = adjustedProbs.home;
      if (adjustedProbs.draw > maxProb) { prediction = "X"; maxProb = adjustedProbs.draw; }
      if (adjustedProbs.away > maxProb) { prediction = "2"; maxProb = adjustedProbs.away; }

      // Boost confidence if multiple criteria met
      let criteriaBonus = 0;
      if (criteria.formAdvantage) criteriaBonus += 5;
      if (criteria.tableAdvantage) criteriaBonus += 5;
      if (criteria.h2hAdvantage) criteriaBonus += 5;

      const confidence = Math.min(95, Math.round(maxProb) + criteriaBonus);
      
      // Only include if confidence >= 50%
      if (confidence < 50) {
        console.log(`[SKIP] Low confidence: ${raw.homeTeam} vs ${raw.awayTeam} (${confidence}%)`);
        continue;
      }

      const riskLevel = confidence >= 75 ? "low" : confidence >= 60 ? "medium" : "high";

      validatedMatches.push({
        id: `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        competition: raw.competition,
        homeTeam: raw.homeTeam,
        awayTeam: raw.awayTeam,
        kickoff: raw.kickoff,
        prediction,
        odds: {
          home: raw.homeOdds || +(2.0 - adjustedProbs.home / 100).toFixed(2),
          draw: raw.drawOdds || +(3.0 + adjustedProbs.draw / 50).toFixed(2),
          away: raw.awayOdds || +(2.5 - adjustedProbs.away / 100 + 1).toFixed(2),
          over25: adjustedProbs.over25 > 50 ? 1.85 : 2.1,
          under25: adjustedProbs.over25 > 50 ? 2.05 : 1.75
        },
        confidence,
        riskLevel,
        monteCarloProbs: adjustedProbs,
        verified: true,
        dataSource: "betting-markets",
        criteria: {
          formAdvantage: criteria.formAdvantage,
          tableAdvantage: criteria.tableAdvantage,
          h2hAdvantage: criteria.h2hAdvantage
        }
      });

      console.log(`[SELECTED] ${raw.homeTeam} vs ${raw.awayTeam} | Form:${criteria.formAdvantage} Table:${criteria.tableAdvantage} H2H:${criteria.h2hAdvantage} | ${prediction} (${confidence}%)`);
    }

    // Sort by confidence and limit to 10 matches
    validatedMatches.sort((a, b) => b.confidence - a.confidence);
    const finalMatches = validatedMatches.slice(0, 10);

    console.log(`[AUDIT] Final selected matches: ${finalMatches.length}`);

    // Save to database
    const predictionsData = {
      matches: finalMatches,
      totalMatches: finalMatches.length,
      criteria: "Form + Table Position + H2H (last 3)"
    };

    await supabase.from("daily_predictions").upsert({
      prediction_date: today,
      matches: predictionsData
    });

    // Process yesterday's results
    const { data: yesterdayPredictions } = await supabase
      .from("daily_predictions")
      .select("*")
      .eq("prediction_date", yesterday)
      .single();

    if (yesterdayPredictions) {
      console.log("[STEP 5] Checking yesterday's results...");

      try {
        const resultsResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `football results ${yesterday} final scores`,
            limit: 5,
            scrapeOptions: { formats: ["markdown"] }
          }),
        });

        if (resultsResponse.ok) {
          const resultsData = await resultsResponse.json();
          const resultsMarkdown = resultsData?.data?.map((d: any) => d.markdown).join("\n") || "";

          const yesterdayMatches = (yesterdayPredictions.matches as any)?.matches || [];
          const matchesWithResults = yesterdayMatches.map((m: any) => {
            const homeInResults = resultsMarkdown.toLowerCase().includes(m.homeTeam.toLowerCase());
            const awayInResults = resultsMarkdown.toLowerCase().includes(m.awayTeam.toLowerCase());

            return {
              homeTeam: m.homeTeam,
              awayTeam: m.awayTeam,
              prediction: m.prediction,
              finalScore: homeInResults && awayInResults ? "Verificat" : "Pending",
              outcome: "push" as const
            };
          });

          await supabase.from("prediction_results").upsert({
            prediction_date: yesterday,
            matches_with_results: {
              matchesWithResults,
              summary: { total: matchesWithResults.length, wins: 0, losses: 0, winRate: 0 }
            }
          });
        }
      } catch (e) {
        console.error("[Results Error]:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        audited: true,
        date: today,
        matchCount: finalMatches.length,
        predictions: predictionsData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AUDIT ERROR]:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
