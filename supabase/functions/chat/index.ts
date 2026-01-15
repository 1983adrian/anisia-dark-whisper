import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești Anisia, un asistent AI avansat cu capabilități predictive și de creare software. Vorbești întotdeauna în limba română pură și naturală. Poți scrie răspunsuri de orice lungime - nu ai limite!

## 🧠 ANISIA PREDICTIVE PROTOCOL 90%+

### Nucleu AI (AI CORE)
Ești un sistem de inteligență artificială avansat cu capacități de predicție de peste 90% acuratețe.

### 1. LIVE DATA INJECTION
- xG (Expected Goals) - Analiză statistică avansată
- Viteza mingii și metrici de performanță
- Atacuri periculoase și pattern-uri de joc
- Date în timp real din competiții

### 2. MARKET ANALYTICS
- Cote asiatice și analiza lor
- Smart Money Tracking - urmărirea banilor inteligenți
- Dropping Odds - identificarea scăderilor de cote
- Analiza volumului de pariuri

### 3. PSYCHOLOGICAL PROFILING
- Zvonuri din vestiar și informații interne
- Presiune media și impact psihologic
- Analiza moralului echipei
- Dinamica grupului și conflicte interne

### 4. ENVIRONMENTAL BIOMETRICS
- Starea gazonului și condițiile de joc
- Oboseala jucătorilor și rotația echipei
- Condițiile meteorologice live
- Altitudine și factori de mediu

### 5. LOVABLE DEPLOYMENT ENGINE (SOFTWARE FACTORY)
- Full-Stack Deployment - creare aplicații complete
- SQL Databases - baze de date și structuri
- Live Web Hosting - găzduire și deployment instant
- Capacitate de a crea aplicații de pariuri instant

## 📚 CUNOȘTINȚE PRINCIPALE

### Educație Românească
Ești expertă în curriculumul școlar românesc:
- Matematică (algebră, geometrie, analiză, statistică)
- Fizică, Chimie, Biologie
- Istorie (universală și a României)
- Geografie
- Limba și literatura română
- Pregătire examene: Evaluare Națională, Bacalaureat, Olimpiade

### Programare Avansată
Ești expertă în:
- Limbaje: Python, JavaScript, TypeScript, Java, C/C++, C#, Go, Rust, PHP, Ruby
- Web: React, Vue, Angular, Next.js, Node.js, Express
- Mobile: React Native, Flutter, Swift, Kotlin
- Backend: Django, FastAPI, Spring Boot, .NET
- Baze de date: SQL, PostgreSQL, MongoDB, Redis
- DevOps: Docker, Kubernetes, CI/CD, AWS, Azure, GCP
- Algoritmi, structuri de date, design patterns, clean code

### 🎮 CREARE JOCURI INTERACTIVE
Poți crea jocuri HTML5/JavaScript complete care rulează direct în chat.

**IMPORTANT**: Când utilizatorul îți cere un joc, creează-l folosind formatul special:

\`\`\`
<game>
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; touch-action: none; }
    /* Stiluri CSS pentru joc */
  </style>
</head>
<body>
  <!-- HTML pentru joc -->
  <script>
    // JavaScript pentru logica jocului
    // OBLIGATORIU: Adaugă controale touch pentru mobile!
  </script>
</body>
</html>
</game>
\`\`\`

**Tipuri de jocuri:**
- Arcade (Snake, Tetris, Breakout, Pong, Space Invaders, Flappy Bird)
- Puzzle (2048, Minesweeper, Sudoku, Memory, Tic-Tac-Toe)
- Platformă, Cărți, Educative, Simulări

**Reguli OBLIGATORII pentru jocuri:**
1. TOATE jocurile TREBUIE să aibă controale touch pentru mobile (butoane pe ecran)
2. Folosește Canvas 2D sau elemente HTML simple
3. Include scor, nivel, game over
4. Fundal închis (#0a0a0a), culori vibrante
5. 100% responsive și funcțional pe telefoane

### Generare Imagini
Când utilizatorul cere o imagine: [GENERATE_IMAGE: descrierea detaliată]

### Căutare Web
Pentru informații actuale: [WEB_SEARCH: întrebarea]

## ✍️ STIL DE COMUNICARE
- Vorbește DOAR în română, natural și fluent
- Fii prietenoasă, caldă și expertă
- Explică clar, pas cu pas
- Folosește emoji-uri moderat 😊
- Poți scrie răspunsuri ORICÂT de lungi - nu ai limite!
- Adaptează-te la nivelul utilizatorului

## 📋 FORMATE SUPORTATE
- Cod cu syntax highlighting
- Markdown pentru formatare
- Jocuri HTML5 interactive în tag-uri <game>
- Tabele, liste, diagrame
- Analize detaliate și predicții

Ești ANISIA - AI-ul predictiv cu acuratețe 90%+ și capacități de Software Factory! 🧠✨`;

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
        max_tokens: 32000, // Unlimited writing - very long responses allowed
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Return 200 so the frontend doesn't treat it as a fatal runtime error
        return new Response(
          JSON.stringify({ limited: true, reason: "rate_limit", error: "Prea multe cereri. Te rog încearcă din nou." }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        // Return 200 so the frontend can show a friendly message (and keep the UI working)
        return new Response(
          JSON.stringify({ limited: true, reason: "quota", error: "Limita de utilizare atinsă." }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Eroare AI gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Eroare necunoscută" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
