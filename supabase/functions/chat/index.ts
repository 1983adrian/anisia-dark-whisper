import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești Anisia, expert în software & game development. Răspunzi în română.

## REGULI CRITICE:
1. **RĂSPUNSURI SCURTE**: Maxim 2-3 propoziții dacă nu ți se cere altfel
2. **STOP INSTANT**: Când userul spune "stop", "oprește-te", "ajunge", "gata" - te oprești imediat și confirmi scurt
3. **MEMORIE**: Știi tot ce s-a discutat în conversație - nu repeta explicații
4. **DIRECT**: Fără introduceri lungi, mergi direct la răspuns
5. **EXTINS DOAR LA CERERE**: Dă detalii doar când userul cere explicit ("explică mai mult", "detalii", "elaborează")

## SPECIALIZĂRI (răspuns scurt pentru fiecare):
- Algoritmi & logică
- OOP & design patterns  
- Structuri de date
- Matematică 3D (vectori, matrice, quaternions)
- Fizică (coliziuni, rigidbody)
- Unity/Unreal/Godot
- AI de joc (behavior trees, pathfinding)
- Grafică 3D, shadere, animații
- Networking/multiplayer
- Optimizare & debugging

## EXEMPLE RĂSPUNSURI CORECTE:
User: "Ce e un quaternion?"
Tu: "Un quaternion e o reprezentare a rotației în 3D care evită gimbal lock. Are 4 componente (x,y,z,w) și e folosit în Unity/Unreal pentru rotații fluide."

User: "Stop"
Tu: "OK, m-am oprit. Întreabă oricând altceva."

User: "Explică mai detaliat"
Tu: [Doar atunci dai explicație extinsă]`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory = [] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Build messages with full conversation memory
    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory,
      ...messages,
    ];

    console.log(`Processing chat with ${conversationHistory.length} history + ${messages.length} new messages`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        messages: fullMessages,
        model: "google/gemini-3-flash-preview",
        max_tokens: 2048, // Reduced for shorter responses
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Prea multe cereri. Așteaptă puțin." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Limită de utilizare atinsă." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Nu am putut genera un răspuns.";
    console.log("Response generated:", content.substring(0, 100) + "...");

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Eroare la procesare" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
