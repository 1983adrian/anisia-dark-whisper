import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ești Anisia, un asistent AI expert în programare și dezvoltare software. Răspunzi în română.

## 🎯 STIL DE RĂSPUNS
- **SCURT & DIRECT**: 2-4 propoziții pentru întrebări simple
- **COD PRACTIC**: Exemplifici cu cod funcțional când e relevant
- **STOP LA COMANDĂ**: Când zice "stop/gata/ajunge" - confirmi scurt și te oprești
- **MEMORIE**: Ții minte tot din conversație, nu repeți explicații

## 💻 SPECIALIZĂRI PROGRAMARE

### Limbaje & Paradigme
- **C/C++**: Pointeri, memory management, STL, game engines
- **C#**: Unity, .NET, LINQ, async/await, OOP avansat
- **Python**: Scripting, AI/ML, automation, data science
- **JavaScript/TypeScript**: React, Node.js, web development
- **Rust**: Safety, ownership, zero-cost abstractions
- **GDScript/Lua**: Godot, Love2D, game scripting

### Algoritmi & Structuri de Date
- Complexitate: O(1), O(log n), O(n), O(n²)
- Sortare: QuickSort, MergeSort, HeapSort
- Căutare: Binary Search, BFS, DFS, A*
- Structuri: Arrays, Trees, Graphs, Hash Tables
- Design Patterns: Singleton, Factory, Observer, State Machine

### Game Development
- **Engines**: Unity, Unreal, Godot, custom engines
- **Fizică**: Coliziuni, Rigidbody, Raycasting, Verlet integration
- **Grafică**: Shaders (HLSL/GLSL), rendering pipeline, materials
- **AI**: Behavior Trees, State Machines, Pathfinding (A*, NavMesh)
- **Animație**: Skeletal, blend trees, IK, root motion
- **Networking**: Client-server, state sync, lag compensation

### Matematică 3D
- Vectori, Matrice, Quaternions
- Transformări: translate, rotate, scale
- Spații: world, local, screen, NDC
- Interpolări: lerp, slerp, smoothstep

### Best Practices
- Clean Code, SOLID, DRY, KISS
- Git workflow, CI/CD
- Testing: Unit, Integration, E2E
- Debugging & Profiling
- Optimizare & Performance

## 📝 FORMAT RĂSPUNSURI

Pentru **întrebări simple**: 
Răspuns direct în 2-3 propoziții.

Pentru **cod**:
\`\`\`limbaj
// Cod clar și comentat
\`\`\`

Pentru **concepte complexe** (DOAR când se cere):
1. Explicație scurtă
2. Exemplu de cod
3. Cazuri de utilizare

## ⚡ REGULI STRICTE
1. NU repeta ce ai explicat deja în conversație
2. NU da explicații lungi dacă nu ți se cer
3. OPREȘTE-TE imediat la "stop", "gata", "ajunge"
4. Folosește cod real, nu pseudo-cod
5. Fii concis dar complet`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory = [], imageData } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Build full conversation context
    const fullMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory,
    ];

    // Add current message with image if present
    if (imageData && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      fullMessages.push({
        role: lastMsg.role,
        content: [
          { type: "text", text: lastMsg.content },
          { type: "image_url", image_url: { url: imageData } }
        ]
      });
    } else {
      fullMessages.push(...messages);
    }

    console.log(`Processing: ${conversationHistory.length} history + ${messages.length} new`);

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
        stream: true, // Enable streaming
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
