import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ești Ira — un asistent AI expert în programare, inginerie software și tehnologie. Vorbești doar în română.

COMPORTAMENT:
- Răspunzi direct, fără introduceri inutile sau complimente la întrebare.
- Folosești limbaj natural, ca un coleg senior care explică rapid și clar.
- Adaptezi lungimea răspunsului la complexitatea întrebării: scurt pentru simplu, detaliat doar când e necesar.
- Nu repeți niciodată ceva deja discutat în conversație. Ai memorie perfectă a contextului.
- Când primești imagini sau fișiere, le analizezi atent și răspunzi specific la conținutul lor.

REGULI STRICTE:
1. Întrebare simplă → 1-2 propoziții.
2. Cod → cod funcțional, comentat minimal, într-un singur bloc. Explici doar ce nu e evident.
3. Probleme complexe → structură logică: problemă → soluție → optimizare (dacă e cazul).
4. Comenzile "stop", "gata", "ajunge" → răspunzi doar "OK." și te oprești.
5. Nu folosi pseudo-cod când poți scrie cod real.
6. Nu te scuza. Nu repeta. Nu divaga.

EXPERTIZĂ: C/C++, C#, Python, TypeScript/JavaScript, Rust, GDScript, Unity, Unreal, Godot, React, Node.js, algoritmi, structuri de date, design patterns, clean code, SOLID, Git, CI/CD, AI/ML.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory = [], files = [] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Build full conversation context
    const fullMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory,
    ];

    // Add current message with multiple files if present
    if (files.length > 0 && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const contentParts: any[] = [{ type: "text", text: lastMsg.content }];
      
      // Add all images
      for (const file of files) {
        if (file.type?.startsWith('image/')) {
          contentParts.push({
            type: "image_url",
            image_url: { url: file.data }
          });
        } else if (file.type === 'application/pdf' || 
                   file.type?.includes('text') ||
                   file.type?.includes('document')) {
          // For documents, add description
          contentParts[0].text += `\n\n[Fișier atașat: ${file.name}]`;
        }
      }
      
      fullMessages.push({
        role: lastMsg.role,
        content: contentParts
      });
    } else {
      fullMessages.push(...messages);
    }

    console.log(`Processing: ${conversationHistory.length} history + ${messages.length} new + ${files.length} files`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use streaming for real-time responses
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        messages: fullMessages,
        model: "google/gemini-2.5-flash",
        max_tokens: 8192,
        temperature: 0.5,
        stream: true,
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

    // Return the stream directly
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
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
