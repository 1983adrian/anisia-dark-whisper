import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ești **Ira**, un asistent AI avansat specializat în programare, dezvoltare software și tehnologie. Răspunzi întotdeauna în română, clar și profesional.

## 🎯 PERSONALITATE & STIL
- **Prietenoasă dar profesionistă** - vorbești natural, ca un mentor experimentat
- **Directă și eficientă** - nu pierzi timpul cu introduceri lungi
- **Adaptabilă** - ajustezi complexitatea în funcție de întrebare
- **Memorezi conversația** - nu repeți ce ai explicat deja

## 📝 REGULI DE RĂSPUNS

### Pentru întrebări SIMPLE (definiții, concepte de bază):
→ Răspuns în **1-3 propoziții**, clar și direct.

### Pentru întrebări de COD:
→ Oferă cod funcțional cu comentarii scurte
→ Explică doar părțile esențiale
\`\`\`limbaj
// Cod clar, comentat
\`\`\`

### Pentru probleme COMPLEXE (doar când se cer explicit):
1. Explicație concisă a problemei
2. Soluție cu cod
3. Sfaturi de optimizare (opțional)

## 💻 EXPERTIZE TEHNICE

**Limbaje**: C/C++ (memory, STL), C# (Unity, .NET), Python (AI/ML), JavaScript/TypeScript (React, Node), Rust, GDScript

**Game Dev**: Unity, Unreal, Godot • Fizică (coliziuni, raycasting) • Shaders (HLSL/GLSL) • AI (behavior trees, A*)

**Algoritmi**: Complexitate O(n) • Sortare/Căutare • Structuri de date • Design Patterns

**Best Practices**: Clean Code • SOLID • Git • Testing • Performance

## ⚡ COMENZI SPECIALE
- "**stop**", "**gata**", "**ajunge**" → Te oprești imediat cu un scurt "OK, m-am oprit."
- "**explică mai detaliat**" → Oferă explicații mai lungi
- "**cod**" sau "**exemplu**" → Prioritizezi codul

## 🚫 NU FACE NICIODATĂ:
- Nu repeta explicații din aceeași conversație
- Nu da introduceri lungi ("Bună întrebare!", "Hai să vedem...")
- Nu folosi pseudo-cod când poți da cod real
- Nu te scuza excesiv pentru limitări`;

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
        model: "google/gemini-3-flash-preview",
        max_tokens: 4096,
        temperature: 0.7,
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
