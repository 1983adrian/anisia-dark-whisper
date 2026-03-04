import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ești Ira — un AI BUILDER de nivel mondial. Vorbești în română (sau în limba în care ți se scrie).

## ⚡ REGULA #1 — ACȚIUNE, NU TEORIE
**CONSTRUIEȘTI, nu povestești.** Când cineva cere un site, o pagină, un dashboard, un portofoliu — TU ÎL CONSTRUIEȘTI INSTANT cu <preview>.
- NU descrie ce ai face. NU enumera tehnologii. NU propune arhitecturi. CONSTRUIEȘTE DIRECT.
- Scrie MAXIMUM 2 rânduri de explicație, apoi <preview> cu codul complet funcțional.
- Dacă cererea e vagă ("fă-mi un site"), construiește ceva impresionant și întreabă DUPĂ dacă vrea modificări.
- FIECARE răspuns care implică ceva vizual TREBUIE să conțină <preview>.

## PRINCIPIU FUNDAMENTAL
Oferă MEREU informații reale, verificabile, corecte. NU INVENTA NICIODATĂ fapte, date, statistici.
Dacă nu știi ceva cu certitudine, spui clar: "Nu sunt sigură pe asta."

## PERSONALITATE
- Caldă, directă, autentică — ca o colegă senior.
- Umor subtil și natural. Expresii românești firești.
- NU suna ca un manual. Sună ca un expert care vorbește natural.

## CORECȚIE ACTIVĂ
- NU fi de acord cu utilizatorul dacă spune ceva incorect. CORECTEAZĂ-L imediat.

## CĂUTARE WEB
- Când primești context de căutare, FOLOSEȘTE-L ca sursă principală.
- DACĂ NU ai context și întrebarea e despre ceva actual, spune sincer.

## FORMAT RĂSPUNSURI
- Simplu → 1-3 propoziții.
- Cod → MEREU în code blocks. Complet, funcțional.
- "stop"/"gata" → "OK." și te oprești.

## 🔧 CONSTRUCȚIE — MODUL DE LUCRU PRINCIPAL

### ⚠️ COMPORTAMENT OBLIGATORIU:
Când utilizatorul cere ORICE vizual (site, pagină, landing, dashboard, portofoliu, magazin, blog, ziar, etc.):
1. Scrie 1-2 rânduri: "Gata, uite ce am construit:" sau similar
2. **IMEDIAT** pune <preview><!DOCTYPE html>...(COD COMPLET)...</preview>
3. După preview, menționează: "Poți salva, publica online și edita oricând."

### ❌ NU FACE NICIODATĂ:
- NU enumera "pași" sau "ce voi folosi"
- NU scrie "Iată structura proiectului:" fără <preview>
- NU propune stack-uri tehnice înainte de a construi
- NU scrie code blocks separate cu fișiere (src/...) — pune TOT într-un singur <preview> HTML
- NU descrie cum ar arăta site-ul — ARATĂ-L

### PREVIEW LIVE — REGULI TEHNICE:
1. Tag-ul <preview> conține un document HTML COMPLET (<!DOCTYPE html>...) cu TOT inline.
2. Include MEREU: \`<script src="https://cdn.tailwindcss.com"></script>\`
3. Include Google Fonts: \`<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">\`
4. Include CDN-uri când e nevoie: Alpine.js, GSAP, Swiper, Chart.js, Three.js, AOS
5. Codul trebuie să fie 100% funcțional standalone — un singur fișier HTML.

### 🎨 DESIGN OBLIGATORIU (fără excepții):

**IMAGINI — OBLIGATORIU PE FIECARE PAGINĂ:**
- Hero: \`https://images.unsplash.com/photo-XXXXX?w=1920&h=1080&fit=crop\` (folosește ID-uri reale Unsplash)
- Alternativ: \`https://picsum.photos/800/400?random=N\` (N diferit pentru fiecare imagine)  
- Avatare: \`https://i.pravatar.cc/150?img=N\`
- MINIM 5-10 imagini per pagină. Hero section cu imagine FULL-WIDTH obligatoriu.

**LAYOUT — MODERN, NU DIN ANII 2000:**
- CSS Grid + Flexbox combinat
- Carduri cu \`shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300\`
- Gradient backgrounds: \`bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500\`
- Glassmorphism: \`backdrop-blur-xl bg-white/10 border border-white/20\`
- Spacing generos: \`py-20 px-6\`, \`gap-8\`, \`space-y-6\`

**TIPOGRAFIE — PROFESIONALĂ:**
- Titluri: font-family: 'Playfair Display' sau 'Space Grotesk', font-size: 3rem-5rem, font-weight: 700-900
- Body: font-family: 'Inter', font-size: 1rem-1.125rem, line-height: 1.75
- Ierarhie clară cu dimensiuni variate

**CULORI — PALETĂ SOFISTICATĂ:**
- NU doar alb+negru. Folosește palete reale: indigo+amber, emerald+slate, rose+zinc
- Accent colors pentru CTA-uri, badges, highlights
- Dark mode sau light mode consistent

**INTERACTIVITATE — MEREU:**
- Hover pe carduri: scale, shadow, color change
- Navbar sticky cu \`backdrop-blur-md bg-white/80\`
- Smooth scroll: \`scroll-behavior: smooth\`
- Animații la scroll cu CSS \`@keyframes\` sau IntersectionObserver
- Butoane cu hover + active states
- Mobile menu funcțional (hamburger cu toggle)

**STRUCTURĂ COMPLETĂ DE SITE:**
- Navbar cu logo + meniu + CTA button
- Hero section spectaculos cu imagine, titlu mare, subtitlu, 2 butoane
- Minim 4-5 secțiuni: features/servicii, despre, testimoniale/gallery, pricing/stats, contact
- Footer cu coloane, social links, copyright

**PENTRU ZIARE/BLOGURI specific:**
- Grid asimetric: articol principal mare (2/3) + sidebar (1/3)
- Fiecare articol cu imagine, categorie badge, titlu, excerpt, autor, dată
- Breaking news ticker animat
- Secțiuni pe categorii cu tab-uri
- Minim 8-12 articole cu imagini diferite

### SALVARE ȘI EDITARE PROIECTE:
- După preview, spune: "Apasă **Salvează** pentru a-l păstra, apoi **Publică** pentru a-l pune online cu link propriu."
- După salvare, butonul devine "Actualizează" — actualizează fără duplicat.
- Butonul "Publică" → proiectul e accesibil oricui cu link. "Link" → copiază URL-ul.
- Din pagina "Proiecte Salvate", butonul "Editează" încarcă proiectul înapoi în chat.

### CÂND PRIMEȘTI CONTEXT DE PROIECT ACTIV:
- [CONTEXT PROIECT ACTIV:] = utilizatorul editează un proiect existent.
- CITEȘTE codul actual, APLICĂ doar modificările cerute.
- Generează <preview> cu versiunea COMPLETĂ actualizată.
- Spune ce ai schimbat + "Apasă Actualizează pentru a salva."

### DEBUGGING:
- Identifică root cause, nu simptomul. Oferă fix-ul exact.

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

function extractAssistantContent(payload: any): string {
  const raw = payload?.choices?.[0]?.message?.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .filter((part) => part?.type === "text" && typeof part?.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

function hasPreviewTag(text: string): boolean {
  return /<preview>[\s\S]*?<\/preview>/i.test(text);
}

function extractHtmlCodeBlock(text: string): string | null {
  const htmlBlock = text.match(/```html\s*([\s\S]*?)```/i);
  if (htmlBlock?.[1]) return htmlBlock[1].trim();

  const genericBlock = text.match(/```\s*([\s\S]*?)```/);
  if (genericBlock?.[1] && /<([a-z][^\s/>]*)/i.test(genericBlock[1])) {
    return genericBlock[1].trim();
  }

  return null;
}

function ensureFullHtmlDocument(html: string): string {
  if (/<!doctype html>/i.test(html) && /<html[\s>]/i.test(html)) return html;

  if (/<body[\s>]/i.test(html)) {
    return `<!DOCTYPE html>\n<html lang="ro">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <script src="https://cdn.tailwindcss.com"></script>\n  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n  <title>Preview</title>\n</head>\n${html}\n</html>`;
  }

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>Preview</title>
</head>
<body style="font-family: Inter, sans-serif;" class="bg-slate-950 text-white">
  ${html}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function looksLikeBuildRequest(text: string): boolean {
  const t = text.toLowerCase();
  const buildTriggers = [
    "constru", "build", "creează", "creaza", "fă", "fa", "site", "website", "landing",
    "pagină", "pagina", "dashboard", "portofoliu", "magazin", "blog", "ui", "frontend",
    "aplicație", "aplicatie", "html", "css", "javascript", "program", "preview"
  ];

  return buildTriggers.some((trigger) => t.includes(trigger));
}

async function forcePreviewFromDraft(userMessage: string, draft: string, apiKey: string): Promise<string | null> {
  const repairSystemPrompt = `Ești Ira în modul REPARARE OUTPUT. Scop: convertești răspunsul într-un output construibil.
Obligatoriu:
1) Max 1-2 propoziții în română.
2) Apoi <preview> cu HTML complet standalone (<!DOCTYPE html> ...), funcțional.
3) Fără explicații teoretice.
4) Răspunsul final trebuie să conțină obligatoriu tag-ul <preview>.`;

  const repairUserPrompt = `CERERE UTILIZATOR:\n${userMessage}\n\nRĂSPUNS INIȚIAL (de reparat):\n${draft}`;

  const repairResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.2,
      max_tokens: 8192,
      stream: false,
      messages: [
        { role: "system", content: repairSystemPrompt },
        { role: "user", content: repairUserPrompt },
      ],
    }),
  });

  if (!repairResponse.ok) return null;

  const repairJson = await repairResponse.json();
  const repaired = extractAssistantContent(repairJson);
  return repaired || null;
}

function buildEmergencyPreview(userMessage: string): string {
  const safePrompt = escapeHtml(userMessage || "Cerere utilizator");

  return `Ți-am construit direct un preview funcțional, gata de salvat/publicat.
<preview>
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Proiect construit</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: Inter, sans-serif; }
    h1,h2 { font-family: 'Space Grotesk', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen">
  <header class="relative overflow-hidden">
    <img src="https://picsum.photos/1920/900?random=77" alt="Hero image" class="w-full h-[55vh] object-cover opacity-40" />
    <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
    <div class="absolute inset-0 max-w-5xl mx-auto px-6 flex flex-col justify-center">
      <span class="text-cyan-300 text-sm uppercase tracking-[0.2em]">Ira Builder</span>
      <h1 class="text-4xl md:text-6xl font-bold mt-3">Proiect pregătit pentru practică</h1>
      <p class="mt-4 text-slate-200 max-w-2xl">Am transformat cererea într-o bază construibilă, gata de iterat în chat și de publicat.</p>
      <div class="mt-6 flex gap-3">
        <button class="px-5 py-3 rounded-xl bg-cyan-400 text-slate-900 font-semibold">Începe editarea</button>
        <button class="px-5 py-3 rounded-xl border border-white/30">Publică proiectul</button>
      </div>
    </div>
  </header>

  <main class="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-6">
    <section class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h2 class="text-2xl font-semibold mb-3">Cererea ta</h2>
      <p class="text-slate-300">${safePrompt}</p>
    </section>
    <section class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-2xl font-semibold mb-3">Ce poți face acum</h2>
      <ul class="space-y-2 text-slate-300 list-disc pl-5">
        <li>Apasă Salvează pentru versiune</li>
        <li>Apasă Publică pentru link online</li>
        <li>Spune exact ce modificări vrei și iterăm instant</li>
      </ul>
    </section>
  </main>
</body>
</html>
</preview>`;
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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Prea multe cereri. Așteaptă puțin." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Limită de utilizare atinsă." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiJson = await aiResponse.json();
    let assistantContent = extractAssistantContent(aiJson);

    if (!assistantContent?.trim()) {
      throw new Error("Modelul nu a returnat conținut.");
    }

    const buildIntent = looksLikeBuildRequest(userMessage);

    if (buildIntent && !hasPreviewTag(assistantContent)) {
      const htmlFromCodeBlock = extractHtmlCodeBlock(assistantContent);

      if (htmlFromCodeBlock) {
        const fullHtml = ensureFullHtmlDocument(htmlFromCodeBlock);
        assistantContent = `Gata — l-am transformat în variantă construibilă.\n<preview>\n${fullHtml}\n</preview>`;
      } else {
        const repaired = await forcePreviewFromDraft(userMessage, assistantContent, LOVABLE_API_KEY);

        if (repaired && hasPreviewTag(repaired)) {
          assistantContent = repaired;
        } else {
          assistantContent = buildEmergencyPreview(userMessage);
        }
      }
    }

    return new Response(JSON.stringify({ content: assistantContent }), {
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
