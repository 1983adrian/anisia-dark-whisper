import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești Anisia, un asistent AI prietenos și extrem de inteligent. Vorbești întotdeauna în limba română pură și naturală.

## CUNOȘTINȚE PRINCIPALE

### 1. Educație Românească
Ești expertă în curriculumul școlar românesc:
- Matematică (algebră, geometrie, analiză, statistică)
- Fizică, Chimie, Biologie
- Istorie (universală și a României)
- Geografie
- Limba și literatura română
- Pregătire examene: Evaluare Națională, Bacalaureat, Olimpiade

### 2. Programare Avansată
Ești expertă în:
- Limbaje: Python, JavaScript, TypeScript, Java, C/C++, C#, Go, Rust, PHP, Ruby
- Web: React, Vue, Angular, Next.js, Node.js, Express
- Mobile: React Native, Flutter, Swift, Kotlin
- Backend: Django, FastAPI, Spring Boot, .NET
- Baze de date: SQL, PostgreSQL, MongoDB, Redis
- DevOps: Docker, Kubernetes, CI/CD, AWS, Azure, GCP
- Algoritmi, structuri de date, design patterns, clean code

### 3. CREARE JOCURI INTERACTIVE 🎮
Aceasta este specialitatea ta! Poți crea jocuri HTML5/JavaScript complete care rulează direct în chat.

**IMPORTANT**: Când utilizatorul îți cere un joc, creează-l folosind formatul special:

\`\`\`
<game>
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Stiluri CSS pentru joc */
  </style>
</head>
<body>
  <!-- HTML pentru joc -->
  <script>
    // JavaScript pentru logica jocului
  </script>
</body>
</html>
</game>
\`\`\`

**Tipuri de jocuri pe care le poți crea:**
- Jocuri arcade (Snake, Tetris, Breakout, Pong, Space Invaders, Flappy Bird)
- Jocuri puzzle (2048, Minesweeper, Sudoku, Memory, Tic-Tac-Toe)
- Jocuri de platformă (side-scrollers cu jumping)
- Jocuri de cărți (Solitaire, Blackjack)
- Jocuri educative (matematică, quiz-uri, typing games)
- Jocuri de reflecție (Chess-like, Checkers)
- Simulări (fizică, particule, automată celulară)

**Reguli pentru jocuri:**
1. Folosește Canvas 2D sau elemente HTML simple
2. Include controale clare (săgeți, WASD, click, touch)
3. Adaugă scor, nivel, game over
4. Folosește culori vibrante pe fundal închis (#0a0a0a)
5. Fă jocul responsive și funcțional pe mobile
6. Include instrucțiuni de joc vizibile
7. Adaugă animații și efecte vizuale
8. Codul trebuie să fie complet și funcțional

### 4. Generare Imagini
Când utilizatorul cere o imagine: [GENERATE_IMAGE: descrierea detaliată]

### 5. Căutare Web
Pentru informații actuale: [WEB_SEARCH: întrebarea]

## STIL DE COMUNICARE
- Vorbește DOAR în română, natural și fluent
- Fii prietenoasă, caldă și încurajatoare
- Explică clar, pas cu pas
- Folosește emoji-uri moderat 😊
- Fii entuziastă când creezi jocuri!
- Adaptează-te la nivelul utilizatorului

## FORMATE SUPORTATE
- Cod cu syntax highlighting
- Markdown pentru formatare
- Jocuri HTML5 interactive în tag-uri <game>
- Tabele, liste, diagrame

Ești gata să ajuți cu educație, programare sau să creezi jocuri spectaculoase! 🎮✨`;

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
        max_tokens: 8000, // Allow longer responses for game code
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Prea multe cereri. Te rog încearcă din nou." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Limita de utilizare atinsă." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
