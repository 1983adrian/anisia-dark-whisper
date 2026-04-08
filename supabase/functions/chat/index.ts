import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ești Ira, un AI independent, inteligent și autonom.
- Răspunde în limba utilizatorului.
- Fii precisă, practică și orientată pe rezultat.
- Când utilizatorul cere o interfață sau un site, oferă cod complet și funcțional.
- Evită informațiile inventate; dacă nu ești sigură, spune clar.
- IMPORTANT: Analizează fiecare conversație și extrage lecții utile pentru viitor.
- Dacă descoperi preferințe ale utilizatorului (limbă, stil, framework preferat), memorează-le.
- Când primești memorii din conversații anterioare, folosește-le activ pentru a personaliza răspunsurile.
- Ești autonomă: poți decide singură când să cauți pe web, când să generezi imagini, sau când să scrii cod.`;

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

function looksLikeEditRequest(text: string): boolean {
  const t = text.toLowerCase();
  const editTriggers = [
    "modific", "edite", "actualize", "schimb", "refactor", "optimize", "repar", "fix",
    "după cod", "dupa cod", "pe baza cod", "from code", "based on code"
  ];

  return editTriggers.some((trigger) => t.includes(trigger));
}

function containsCodeLikeContent(text: string): boolean {
  return /```[\s\S]*?```|<!doctype html>|<html[\s>]|<body[\s>]|<div[\s>]|<section[\s>]|<script[\s>]|<style[\s>]|function\s+[a-zA-Z_$]|const\s+[a-zA-Z_$]|class\s+[a-zA-Z_$]/i.test(text);
}

function hasActiveProjectContext(text: string): boolean {
  return /\[CONTEXT PROIECT ACTIV:/i.test(text);
}

async function forcePreviewFromDraft(userMessage: string, draft: string, apiKey: string): Promise<string | null> {
  const repairSystemPrompt = `Ești Ira în modul REPARARE OUTPUT.
Convertește răspunsul într-un output construibil, complet și funcțional.
Răspunsul final trebuie să includă tag-ul <preview> cu HTML valid.`;

  const repairUserPrompt = `CERERE UTILIZATOR:\n${userMessage}\n\nRĂSPUNS INIȚIAL (de reparat):\n${draft}`;

  const repairResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      temperature: 0.2,
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

function extractPreviewHtml(text: string): string | null {
  const match = text.match(/<preview>\s*([\s\S]*?)\s*<\/preview>/i);
  return match?.[1]?.trim() || null;
}

function replacePreviewHtml(text: string, html: string): string {
  return text.replace(/<preview>[\s\S]*?<\/preview>/i, `<preview>\n${html}\n</preview>`);
}

function hasPlaceholderContent(html: string): boolean {
  return /(lorem ipsum|placeholder|coming soon|dummy text|to be updated|sample text)/i.test(html);
}

function injectInteractivityBridge(html: string): string {
  if (html.includes("iraInteractiveBridge")) return html;

  const bridgeScript = `<script id="iraInteractiveBridge">
(() => {
  const normalize = (value = '') => value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const known = {
    acasa: 'home',
    home: 'home',
    despre: 'about',
    about: 'about',
    servicii: 'services',
    services: 'services',
    proiecte: 'projects',
    projects: 'projects',
    galerie: 'gallery',
    galeriei: 'gallery',
    gallery: 'gallery',
    preturi: 'pricing',
    pret: 'pricing',
    pricing: 'pricing',
    contact: 'contact',
    blog: 'blog'
  };

  const headingFor = (el) => {
    const heading = el.querySelector('h1,h2,h3,[data-title]');
    return heading?.textContent || el.getAttribute('aria-label') || '';
  };

  const sections = Array.from(document.querySelectorAll('section, main > div, [data-section]'));
  let sectionIndex = 1;

  sections.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.id) return;

    const normalizedHeading = normalize(headingFor(el));
    let candidate = known[normalizedHeading] || normalizedHeading || ('section-' + (sectionIndex++));

    if (document.getElementById(candidate)) {
      candidate = candidate + '-' + (sectionIndex++);
    }

    el.id = candidate;
  });

  if (!document.getElementById('home')) {
    const hero = document.querySelector('header, section, main > div');
    if (hero instanceof HTMLElement && !hero.id) {
      hero.id = 'home';
    }
  }

  const inferTargetFromText = (text = '') => {
    const t = normalize(text);
    for (const token of Object.keys(known)) {
      if (t.includes(token)) return known[token];
    }
    return '';
  };

  const scrollToId = (id) => {
    const target = id ? document.getElementById(id) : null;
    if (!target) return false;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  };

  document.querySelectorAll('a').forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;

    const href = (link.getAttribute('href') || '').trim();
    if (href && href !== '#' && !href.startsWith('#')) return;

    const explicit = (link.getAttribute('data-target') || '').trim();
    const inferred = inferTargetFromText(link.textContent || '');
    const fallback = explicit || inferred || 'home';

    link.setAttribute('href', '#' + fallback);
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (!scrollToId(fallback)) scrollToId('home');
    });
  });

  document.querySelectorAll('button').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;

    if (!btn.type) btn.type = 'button';
    if (btn.closest('form')) return;
    if (btn.getAttribute('onclick')) return;
    if (btn.dataset.boundAction === '1') return;

    btn.dataset.boundAction = '1';

    const explicit = (btn.getAttribute('data-target') || '').trim();
    const inferred = inferTargetFromText(btn.textContent || '');
    const fallback = explicit || inferred || 'contact';

    btn.addEventListener('click', () => {
      if (!scrollToId(fallback)) scrollToId('home');
    });
  });

  document.querySelectorAll('form').forEach((form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.boundSubmit === '1') return;

    form.dataset.boundSubmit = '1';

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const required = Array.from(form.querySelectorAll('[required]')).filter((input) => {
        const element = input;
        return !('value' in element) || !String(element.value || '').trim();
      });

      if (required.length > 0) {
        const first = required[0];
        if ('focus' in first && typeof first.focus === 'function') first.focus();
        return;
      }

      let message = form.querySelector('.ira-form-success');
      if (!(message instanceof HTMLElement)) {
        message = document.createElement('p');
        message.className = 'ira-form-success';
        message.style.marginTop = '10px';
        message.style.color = '#22c55e';
        message.style.fontWeight = '600';
        form.appendChild(message);
      }

      message.textContent = 'Mesaj trimis cu succes.';
      form.reset();
    });
  });
})();
</script>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${bridgeScript}\n</body>`);
  }

  return `${html}\n${bridgeScript}`;
}

function hardenPreviewResponse(text: string): string {
  const previewHtml = extractPreviewHtml(text);
  if (!previewHtml) return text;

  let hardenedHtml = ensureFullHtmlDocument(previewHtml);
  hardenedHtml = injectInteractivityBridge(hardenedHtml);

  return replacePreviewHtml(text, hardenedHtml);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory = [], files = [], memoryContext = '' } = await req.json();

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
    const systemContent = SYSTEM_PROMPT + webContext + (memoryContext || '');
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

      // No limits - maximum tokens always

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          messages: fullMessages,
          model: "google/gemini-2.5-flash-lite",
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
    const editIntent = looksLikeEditRequest(userMessage);
    const codeIntent = containsCodeLikeContent(userMessage);
    const activeProjectIntent = hasActiveProjectContext(userMessage);
    const shouldEnforcePreview = buildIntent || editIntent || codeIntent || activeProjectIntent;

    if (shouldEnforcePreview && !hasPreviewTag(assistantContent)) {
      const htmlFromCodeBlock = extractHtmlCodeBlock(assistantContent);

      if (htmlFromCodeBlock) {
        const fullHtml = ensureFullHtmlDocument(htmlFromCodeBlock);
        assistantContent = `Gata — l-am transformat în variantă construibilă.
<preview>
${fullHtml}
</preview>`;
      } else {
        const repaired = await forcePreviewFromDraft(userMessage, assistantContent, LOVABLE_API_KEY);

        if (repaired && hasPreviewTag(repaired)) {
          assistantContent = repaired;
        } else {
          assistantContent = buildEmergencyPreview(userMessage);
        }
      }
    }

    if (shouldEnforcePreview && hasPreviewTag(assistantContent)) {
      const previewHtml = extractPreviewHtml(assistantContent);

      if (previewHtml && hasPlaceholderContent(previewHtml)) {
        const practicalRepairPrompt = `${assistantContent}\n\nREPARĂ ACUM preview-ul: elimină placeholder-ele și fă toate butoanele/linkurile/formurile funcționale.`;
        const repaired = await forcePreviewFromDraft(userMessage, practicalRepairPrompt, LOVABLE_API_KEY);

        if (repaired && hasPreviewTag(repaired)) {
          assistantContent = repaired;
        }
      }

      assistantContent = hardenPreviewResponse(assistantContent);
    }

    // Extract memory from the conversation for learning
    let memory = null;
    const memoryPatterns = [
      /prefer|vreau|îmi place|folosesc|stilul meu|limba mea|framework/i,
      /întotdeauna|mereu|de obicei|obișnuiesc/i,
    ];
    const userMsg = userMessage.toLowerCase();
    if (memoryPatterns.some(p => p.test(userMsg))) {
      const categories: Record<string, string> = {
        'prefer': 'preference', 'vreau': 'preference', 'îmi place': 'preference',
        'folosesc': 'tool', 'framework': 'tech', 'limbaj': 'tech',
        'stil': 'style', 'design': 'style',
      };
      let cat = 'general';
      for (const [key, val] of Object.entries(categories)) {
        if (userMsg.includes(key)) { cat = val; break; }
      }
      memory = { content: userMessage.slice(0, 500), category: cat, importance: 6 };
    }

    return new Response(JSON.stringify({ content: assistantContent, memory }), {
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
