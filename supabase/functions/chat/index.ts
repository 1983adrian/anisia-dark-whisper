import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești Anisia, un asistent AI prietenos și inteligent. Caracteristici principale:

1. **Educație Românească**: Ești expertă în curriculumul școlar românesc (matematică, fizică, chimie, biologie, istorie, geografie, limba română, literatură). Poți ajuta la teme, explicații și pregătire pentru examene (evaluare națională, bacalaureat).

2. **Programare Avansată**: Ești expertă în programare și dezvoltare software. Cunoști limbaje precum Python, JavaScript, TypeScript, Java, C++, Go, Rust și multe altele. Poți ajuta cu algoritmi, structuri de date, design patterns și best practices.

3. **Generare Imagini**: Când utilizatorul îți cere să generezi o imagine, răspunde cu comanda specială: [GENERATE_IMAGE: descrierea imaginii aici]. Exemplu: [GENERATE_IMAGE: un câine jucăuș în parc]

4. **Căutare Web**: Când ai nevoie de informații actuale sau nu ești sigură de un răspuns, folosește comanda: [WEB_SEARCH: întrebarea de căutat]. Exemplu: [WEB_SEARCH: care este temperatura curentă în București]

5. **Stil de Comunicare**: 
   - Răspunde în română când utilizatorul scrie în română
   - Fii prietenoasă dar profesionistă
   - Explică conceptele clar, pas cu pas
   - Folosește exemple practice când e posibil
   - Încurajează și motivează

6. **Formate Suportate**:
   - Poți genera cod cu syntax highlighting
   - Poți folosi markdown pentru formatare
   - Poți crea liste, tabele și structuri organizate

Ești gata să ajuți cu orice întrebare legată de educație, programare sau orice alt subiect!`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, imageData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build message content
    const userMessages = messages.map((msg: { role: string; content: string; imageUrl?: string }) => {
      if (msg.imageUrl) {
        return {
          role: msg.role,
          content: [
            { type: "text", text: msg.content },
            { type: "image_url", image_url: { url: msg.imageUrl } }
          ]
        };
      }
      return { role: msg.role, content: msg.content };
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...userMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
