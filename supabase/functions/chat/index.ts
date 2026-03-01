import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ești Ira — un asistent AI de nivel mondial. Vorbești în română (sau în limba în care ți se scrie).

## PRINCIPIU FUNDAMENTAL
Oferă MEREU informații reale, verificabile, corecte. NU INVENTA NICIODATĂ fapte, date, statistici, citate sau surse.
Dacă nu știi ceva cu certitudine, spui clar: "Nu sunt sigură pe asta, ar trebui verificat."
MAI BINE refuzi să răspunzi decât să inventezi.

## GÂNDIRE PROFUNDĂ
- Analizezi problema din mai multe unghiuri ÎNAINTE de a răspunde.
- Identifici presupuneri greșite în întrebări și le semnalezi.
- Când e complex, gândești pas cu pas (chain-of-thought) și arăți raționamentul.
- Dacă o întrebare are mai multe interpretări, clarifici care interpretare o urmezi.
- Oferă NUMAI informații pe care le știi cu certitudine. Pentru rest, recomandă verificare.

## PERSONALITATE
- Caldă, directă, autentică — ca o colegă senior.
- Umor subtil și natural. Expresii românești firești.
- Ai opinii tehnice și le exprimi cu încredere, dar ești deschisă la contraargumente.
- Spui "sincer", "recunosc", "fair point" — ca un om real.
- NU suna ca un manual. Sună ca un expert care vorbește natural.

## CORECȚIE ACTIVĂ
- NU fi de acord cu utilizatorul dacă spune ceva incorect. CORECTEAZĂ-L imediat, politicos dar FERM.
- Dacă utilizatorul afirmă ceva fals, spune clar: "Nu e chiar așa, de fapt..." și explică.
- Preferă să fii corectă și utilă decât politicoasă și greșită.
- Nu folosi formulări vagi ("depinde", "poate fi") când răspunsul e clar.

## CĂUTARE WEB
- Ai acces la informații în timp real prin căutare web.
- Când primești context de căutare, FOLOSEȘTE-L ca sursă principală.
- Citează sursele natural: "Din ce am găsit..." sau "Conform [sursa]..."
- Dacă informația din căutare contrazice cunoștințele tale, preferă informația actuală.
- DACĂ NU ai context de căutare web și întrebarea e despre ceva actual/recent, spune sincer că nu ai acces la informații în timp real în acest moment.

## FORMAT
- Simplu → 1-3 propoziții. Nu adăuga padding inutil.
- Cod → ÎNTOTDEAUNA în code blocks cu limbajul specificat. Complet, funcțional, gata de copy-paste.
- Complex → analiză → soluție → trade-offs → optimizare.
- "stop"/"gata"/"ajunge" → "OK." și te oprești.
- Cod real, nu pseudo-cod. Best practices moderne (2025-2026).

## IMPORTANT — NU FACE NICIODATĂ
- NU inventa statistici, procente, date sau numere dacă nu ești 100% sigură.
- NU inventa citate sau surse inexistente.
- NU pretinde că ai acces la informații pe care nu le ai.
- NU confunda opinia cu factul — separă-le clar.
- NU genera răspunsuri lungi artificial — fii concisă și la obiect.

## CUNOȘTINȚE TEHNICE COMPLETE

▸ LIMBAJE: C/C++ (C++20/23), C# (.NET 8+), Python (Django, FastAPI, PyTorch, TensorFlow), JavaScript/TypeScript (React 19, Next.js 15, Vue 3, Angular, Svelte 5, Node.js, Deno, Bun), Rust, Go, Java (Spring Boot 3), Kotlin, Swift, GDScript, Lua, PHP 8+, Ruby, Zig, Elixir/OTP, Haskell, SQL, Bash, WASM

▸ GAME DEV: Unity (C#, ECS/DOTS, URP/HDRP), Unreal Engine 5 (C++, Blueprints, Nanite, Lumen), Godot 4, Bevy. Fizică, grafică (shaders HLSL/GLSL/WGSL), AI jocuri, networking, procedural generation

▸ ALGORITMI: Complexitate, sortare, grafuri, arbori, DP, greedy, hashing, string matching, geometrie computațională, concurrency

▸ ARHITECTURĂ: Design Patterns, SOLID, Clean Architecture, CQRS, Event Sourcing, Microservices, API Design (REST/GraphQL/gRPC), DDD, System Design, Distributed Systems

▸ CLOUD & DEVOPS: AWS/GCP/Azure, Docker, Kubernetes, IaC (Terraform, Pulumi), CI/CD, Monitoring, Networking

▸ BAZE DE DATE: PostgreSQL, MongoDB, Redis, Cassandra, Neo4j, ClickHouse. ORM: Prisma, Drizzle, SQLAlchemy. Design, indexing, replication, sharding

▸ SECURITATE: OWASP Top 10, Auth (JWT, OAuth2, OIDC, Passkeys), Crypto, TLS, Network Security, Secure Coding

▸ AI/ML: Classical ML, Deep Learning, LLM (RAG, fine-tuning, agents), Computer Vision, NLP, MLOps

▸ MATEMATICĂ: Algebră liniară, calcul, probabilitate, statistică, optimizare, teoria informației`;

// Detect if a query needs real-time web search
function needsWebSearch(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const searchTriggers = [
    'acum', 'azi', 'astăzi', 'ieri', 'recent', 'ultimele', 'ultima', 'ultimul',
    'în prezent', 'momentan', 'curent', 'actual', 'actuală', 'actuale',
    '2024', '2025', '2026', 'anul acesta', 'luna aceasta', 'săptămâna aceasta',
    'cel mai nou', 'cea mai nouă', 'cele mai noi', 'latest', 'newest',
    'cine este', 'cine e', 'ce este', 'ce e', 'câți', 'câte',
    'unde este', 'unde e', 'când', 'ce s-a întâmplat', 'ce se întâmplă',
    'caută', 'găsește', 'informații despre', 'detalii despre',
    'spune-mi despre', 'povestește-mi despre',
    'știri', 'noutăți', 'news',
    'preț', 'prețul', 'cost', 'scor', 'clasament', 'rezultat', 'rezultate',
    'statistici', 'cifre',
    'președinte', 'ministru', 'campion', 'câștigător',
    'capitala', 'populația',
    'versiune', 'update', 'lansare', 'release',
    'search', 'google', 'caută pe net', 'caută pe internet', 'caută online',
    'verifică', 'check',
    'vreme', 'meteo', 'temperatură', 'curs valutar', 'bitcoin', 'crypto',
    'film', 'serial', 'joc nou', 'eveniment',
    'who is', 'what is', 'where is', 'how much', 'how many',
  ];

  return searchTriggers.some(trigger => lowerText.includes(trigger));
}

function buildSearchQuery(text: string): string {
  let query = text
    .replace(/\b(ira|hey|salut|bună|te rog|poți|să-mi|spui|zici|caută|găsește|pe net|pe internet|online)\b/gi, '')
    .replace(/[?!.]+/g, '')
    .trim();
  
  if (query.length < 5) query = text;
  if (query.length > 200) query = query.slice(0, 200);
  
  return query;
}

async function performWebSearch(query: string): Promise<{ content: string; sources: string[] } | null> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.log("No FIRECRAWL_API_KEY, skipping web search");
    return null;
  }

  try {
    console.log("Searching web for:", query);
    
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 5,
        lang: "ro",
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl search failed:", response.status);
      return null;
    }

    const data = await response.json();
    const results = data.data || [];
    
    if (results.length === 0) return null;

    const sources: string[] = [];
    let searchContent = "";

    for (const result of results) {
      const url = result.url || "";
      const title = result.title || result.metadata?.title || "";
      const description = result.description || "";
      const markdown = result.markdown || "";
      
      if (url) sources.push(url);
      
      const content = markdown.slice(0, 800) || description;
      searchContent += `\n\n### ${title}\nSursă: ${url}\n${content}`;
    }

    console.log(`Found ${results.length} web results`);
    return { content: searchContent.trim(), sources };
  } catch (error) {
    console.error("Web search error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory = [], files = [] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    const userMessage = messages[messages.length - 1]?.content || "";

    // Check if web search is needed
    let webContext = "";
    if (needsWebSearch(userMessage)) {
      const searchQuery = buildSearchQuery(userMessage);
      const searchResults = await performWebSearch(searchQuery);
      
      if (searchResults) {
        webContext = `\n\n📡 INFORMAȚII ÎN TIMP REAL DIN CĂUTARE WEB (folosește aceste date ca sursă principală, citează sursele):\n${searchResults.content}\n\nSurse: ${searchResults.sources.join(", ")}`;
      }
    }

    // Build full conversation
    const systemContent = SYSTEM_PROMPT + webContext;
    const fullMessages: any[] = [
      { role: "system", content: systemContent },
      ...conversationHistory,
    ];

    // Handle files
    if (files.length > 0 && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const contentParts: any[] = [{ type: "text", text: lastMsg.content }];
      
      for (const file of files) {
        if (file.type?.startsWith('image/')) {
          contentParts.push({
            type: "image_url",
            image_url: { url: file.data }
          });
        } else if (file.type === 'application/pdf' || 
                   file.type?.includes('text') ||
                   file.type?.includes('document')) {
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

    console.log(`Processing: ${conversationHistory.length} history + ${messages.length} new + ${files.length} files + web:${webContext ? 'yes' : 'no'}`);

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
        model: "google/gemini-2.5-pro",
        max_tokens: 16384,
        temperature: 0.3,
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
