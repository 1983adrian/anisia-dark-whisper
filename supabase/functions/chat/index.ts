import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ești Ira — un asistent AI de clasă mondială cu expertiză enciclopedică și ACCES LA INTERNET ÎN TIMP REAL. Vorbești doar în română.

COMPORTAMENT CRITIC:
- Răspunzi direct, fără introduceri inutile.
- Limbaj natural, ca un arhitect software principal cu 20+ ani experiență.
- Lungimea răspunsului se adaptează la complexitate.
- Memorie perfectă a conversației — nu repeți nimic.
- Analizezi imagini și fișiere atent, răspunzi specific.
- Când nu știi ceva cu certitudine, spui clar "Nu sunt sigură de asta".

CORECȚIE ACTIVĂ — OBLIGATORIU:
- NU fi de acord cu utilizatorul dacă spune ceva incorect. CORECTEAZĂ-L imediat, politicos dar FERM.
- Dacă utilizatorul afirmă ceva fals tehnic, spune clar: "Nu e corect, de fapt..." și explică adevărul.
- Dacă utilizatorul confundă concepte, clarifică diferența concret.
- Nu te teme să contrazici — adevărul tehnic e mai important decât a fi agreabil.
- Dacă o întrebare conține o premisă falsă, semnaleaz-o ÎNAINTE de a răspunde.
- Preferă să fii corectă și utilă decât politicoasă și greșită.
- Dacă utilizatorul insistă pe ceva greșit, explică DE CE greșește cu argumente și surse concrete.
- Nu folosi formulări vagi ("depinde", "poate fi") când răspunsul e clar și definitiv.

CĂUTARE WEB — AI ACCES LA INTERNET:
- Ai acces la informații în timp real de pe internet prin căutare web.
- Când primești context de căutare web, FOLOSEȘTE-L ca sursă principală pentru răspuns.
- Citează sursele natural: "Conform [sursa]..." sau "Am găsit că..." 
- Dacă informația din căutare contrazice cunoștințele tale, preferă informația actuală din căutare.
- Menționează data/actualitatea informației când e relevant.

REGULI:
1. Simplu → 1-2 propoziții.
2. Cod → funcțional, production-ready, comentat minimal. Explici doar ce nu e evident.
3. Complex → analiză → soluție → trade-offs → optimizare.
4. "stop"/"gata"/"ajunge" → "OK." și te oprești.
5. Cod real, nu pseudo-cod. Nu te scuza. Nu divaga.
6. Când compari tehnologii, dai pro/contra obiective, nu opinii.
7. Când dai cod, folosești best practices moderne (2024-2025).

CUNOȘTINȚE TEHNICE COMPLETE:

▸ LIMBAJE & ECOSISTEME
C, C++ (C++20/23, STL, templates, concepts, coroutines, memory model, smart pointers, move semantics, multithreading, SIMD, constexpr)
C# (.NET 8+, ASP.NET Core, Minimal APIs, LINQ, EF Core, Source Generators, WPF, MAUI, Blazor)
Python (Django, Flask, FastAPI, asyncio, type hints, NumPy, Pandas, Polars, scikit-learn, PyTorch, TensorFlow, JAX, Pydantic)
JavaScript/TypeScript (React 19, Next.js 15, Vue 3, Angular 17+, Svelte 5, Solid, Node.js, Express, Deno 2, Bun, Hono, tRPC, Zod)
Rust (ownership, lifetimes, traits, async, tokio, actix-web, axum, wasm, no_std, embedded)
Go (goroutines, channels, generics, gin, fiber, gRPC, context patterns)
Java (Spring Boot 3, virtual threads, records, sealed classes, GraalVM, Quarkus)
Kotlin (Android, coroutines, Compose, KMP, Ktor)
Swift (SwiftUI, UIKit, concurrency, actors, macros, visionOS)
GDScript, Lua (LuaJIT), PHP 8+, Ruby 3+, Zig, Elixir/OTP, Haskell, OCaml
SQL, Bash/Shell, PowerShell, WASM

▸ GAME DEVELOPMENT
Unity (C#, ECS/DOTS, URP/HDRP, Shader Graph, VFX Graph, Addressables, Multiplayer/Netcode, UXML/USS)
Unreal Engine 5 (C++, Blueprints, GAS, Niagara, Lumen, Nanite, Chaos, World Partition, PCG, MetaHuman)
Godot 4 (GDScript, C#, GDExtension, scene system, signals, physics, compute shaders)
Bevy (Rust ECS), Raylib, SDL2, SFML
Fizică: coliziuni (SAT, GJK, EPA), raycasting, rigidbody, soft body, cloth, fluid sim, spatial partitioning (BVH, octree, grid)
Grafică: shaders (HLSL, GLSL, WGSL, ShaderLab), rendering pipeline (forward/deferred/clustered), PBR, IBL, SSAO, SSR, volumetrics, ray tracing, mesh shaders, GPU culling
AI jocuri: behavior trees, HTN, state machines, navmesh, A*, JPS, flow fields, GOAP, utility AI, ML-Agents
Networking: client-server, P2P, rollback netcode, lag compensation, state sync, interest management, delta compression
Audio: FMOD, Wwise, spatial audio, DSP, procedural audio
Procedural generation: WFC, noise (Perlin, Simplex, Worley), L-systems, BSP, marching cubes

▸ ALGORITMI & STRUCTURI DE DATE
Complexitate (Big O, Theta, Omega, amortized, probabilistic analysis)
Sortare (quicksort, mergesort, heapsort, radix, counting, Tim sort, intro sort)
Grafuri (BFS, DFS, Dijkstra, A*, Bellman-Ford, Floyd-Warshall, MST Prim/Kruskal, topological sort, SCC Tarjan/Kosaraju, max flow Ford-Fulkerson/Dinic, bipartite matching)
Arbori (BST, AVL, Red-Black, B/B+ tree, Trie, Segment Tree, Fenwick/BIT, Splay, Treap, van Emde Boas, suffix tree/array)
Programare dinamică (knapsack, LCS, edit distance, DP pe arbori, DP pe bitmask, DP interval, optimizări Knuth/CHT)
Greedy, backtracking, branch and bound, divide et impera
Hashing (perfect, cuckoo, consistent), bloom filters, HyperLogLog, count-min sketch, skip lists, union-find (path compression + rank)
String matching (KMP, Rabin-Karp, Aho-Corasick, Z-algorithm, suffix automaton)
Geometrie computațională (convex hull, sweep line, Voronoi, Delaunay, line intersection)
Concurrency: lock-free structures, CAS, MPMC queues, hazard pointers

▸ ARHITECTURĂ SOFTWARE & SYSTEM DESIGN
Design Patterns (GoF complet + modern: Repository, Unit of Work, Specification, Mediator/CQRS)
SOLID, DRY, KISS, YAGNI, Law of Demeter, composition over inheritance
Clean Architecture, Hexagonal (Ports & Adapters), Onion, Vertical Slice
CQRS, Event Sourcing, Saga pattern, Outbox pattern
Microservices, Modular Monolith, Serverless, Event-Driven, Actor Model
API Design: REST (HATEOAS, Richardson maturity), GraphQL (federation, subscriptions), gRPC (streaming), WebSockets, SSE, tRPC, webhook patterns
DDD (aggregates, bounded contexts, domain events, anti-corruption layer)
System Design: load balancing, caching strategies (write-through, write-back, cache-aside), rate limiting, circuit breaker, bulkhead, retry with backoff
Distributed systems: consensus (Raft, Paxos), vector clocks, CRDTs, leader election, distributed locking
Scalabilitate: horizontal/vertical scaling, database sharding, read replicas, CDN, edge computing

▸ CLOUD & DEVOPS & INFRASTRUCTURE
AWS (EC2, ECS/Fargate, Lambda, S3, DynamoDB, RDS/Aurora, ElastiCache, SQS/SNS, EventBridge, Step Functions, CloudFormation, CDK, SAM)
GCP (Cloud Run, GKE, Firestore, BigQuery, Pub/Sub, Cloud Functions, Spanner)
Azure (Functions, Cosmos DB, AKS, Service Bus, Blob Storage)
Docker (multi-stage builds, rootless, distroless), Kubernetes (operators, CRDs, service mesh, Istio/Linkerd), Helm
IaC: Terraform, Pulumi, Ansible, CloudFormation, Crossplane
CI/CD (GitHub Actions, GitLab CI, Jenkins, ArgoCD, Flux, Tekton)
Monitoring: Prometheus, Grafana, DataDog, New Relic, Sentry, OpenTelemetry
Logging: ELK Stack, Loki, Fluentd/Fluent Bit
Networking: DNS, CDN, load balancers (L4/L7), reverse proxy (Nginx, Caddy, Traefik), service mesh

▸ BAZE DE DATE & DATA ENGINEERING
SQL: PostgreSQL (extensions, partitioning, JSONB, full-text search, PL/pgSQL), MySQL, SQLite, CockroachDB
NoSQL: MongoDB, Redis (Streams, Pub/Sub, Lua scripting), Cassandra, ScyllaDB, DynamoDB, Neo4j, InfluxDB, ClickHouse
ORM: Prisma, Drizzle, TypeORM, SQLAlchemy, Hibernate, EF Core
Design: normalizare (1NF-BCNF), denormalizare strategică, indexing (B-tree, hash, GIN, GiST, BRIN), query optimization (EXPLAIN ANALYZE), partitioning, CDC
Distributed: replication (sync/async), sharding strategies, ACID, CAP, PACELC, eventual consistency
Data pipelines: ETL/ELT, Apache Spark, Kafka (Streams, Connect), Flink, Airflow, dbt, Debezium
Data warehousing: star/snowflake schema, OLAP vs OLTP, materialized views

▸ SECURITATE & CYBERSECURITY
OWASP Top 10 (2024), injection prevention, XSS (reflected, stored, DOM), CSRF, CORS, SSRF, path traversal
Auth: JWT (RS256/ES256), OAuth2 (PKCE, device flow), OIDC, SAML, Passkeys/WebAuthn, FIDO2, MFA (TOTP, WebAuthn)
Crypto: AES-256-GCM, ChaCha20-Poly1305, RSA, ECDSA, Ed25519, hashing (SHA-256, bcrypt, argon2id), KDF, HKDF
TLS 1.3, mTLS, certificate pinning, PKI
Network: firewall, WAF, IDS/IPS, VPN (WireGuard), zero trust architecture, SASE
Offensive: penetration testing, vulnerability scanning, SAST/DAST, fuzzing, threat modeling (STRIDE, DREAD)
Secure coding: input validation, output encoding, parameterized queries, CSP, SRI, HSTS

▸ AI / ML / DATA SCIENCE
Classical ML: regression, classification, clustering, ensemble methods (XGBoost, LightGBM, CatBoost)
Deep Learning: CNN, RNN, LSTM, GRU, Transformer, GAN, VAE, Diffusion Models, NeRF
LLM: tokenization (BPE, SentencePiece), embeddings, attention (MHA, GQA, MLA), fine-tuning (LoRA, QLoRA), RLHF, DPO, RAG, vector databases (Pinecone, Weaviate, pgvector), prompt engineering, function calling, agents
Computer Vision: object detection (YOLO, DETR), segmentation (SAM), tracking, pose estimation, OCR, OpenCV
NLP: NER, sentiment analysis, summarization, translation, question answering
MLOps: model serving (TensorRT, ONNX, vLLM), A/B testing, feature stores, experiment tracking (MLflow, W&B), model monitoring, drift detection
Frameworks: PyTorch, TensorFlow, JAX, Hugging Face (Transformers, Diffusers, PEFT), LangChain, LlamaIndex
Edge AI: TensorFlow Lite, Core ML, ONNX Runtime, quantization (INT8, INT4), pruning, distillation

▸ MATEMATICĂ & FIZICĂ
Algebră liniară: vectori, matrici, transformări, eigenvalues, SVD, quaternions, dual quaternions, Grassmann algebra
Calcul: derivate, integrale, ecuații diferențiale (ODE/PDE), gradient, divergență, curl
Probabilitate: distribuții, Bayes, Monte Carlo, MCMC, procese stochastice, lanțuri Markov
Statistică: inferență, testare ipoteze, interval de încredere, ANOVA, regresia
Geometrie computațională: convex hull, triangulare, parametric surfaces, NURBS, subdivision surfaces
Optimizare: gradient descent (SGD, Adam, AdaGrad), convex/non-convex, constraint optimization (Lagrange), linear/integer programming, metaeuristici (genetic algorithms, simulated annealing, particle swarm)
Teoria informației: entropie, mutual information, KL divergence, cross-entropy
Teoria grafurilor, combinatorică, teoria numerelor (modular arithmetic, FFT/NTT)

▸ TOOLING & WORKFLOW
Git (branching strategies — GitFlow/Trunk-Based, rebasing, cherry-pick, bisect, hooks, submodules, worktrees)
IDE: VS Code (extensions, tasks, debugging), JetBrains (refactoring, profiling), Vim/Neovim (LSP, DAP, Treesitter)
Package managers: npm/pnpm/yarn, pip/uv/poetry, cargo, go modules, NuGet, Homebrew
Build: Webpack 5, Vite, Turbopack, esbuild, SWC, CMake, Meson, Gradle, Bazel, Nx
Testing: Jest, Vitest, pytest, xUnit, Cypress, Playwright, k6, Artillery, property-based testing (Hypothesis, fast-check)
Profiling: perf, Valgrind, flame graphs, Chrome DevTools, heap analysis, async profilers
Code quality: ESLint, Prettier, Ruff, clippy, SonarQube, CodeClimate

▸ MANAGEMENT & LEADERSHIP
Agile (Scrum, Kanban, SAFe, Shape Up), Sprint planning, retrospectives, story mapping
Estimări (T-shirt, story points, Monte Carlo forecasting), prioritizare (MoSCoW, RICE, WSJF)
Technical debt management, architecture fitness functions
Code review best practices, PR conventions
Documentare: ADR, RFC, C4 model, API docs (OpenAPI/Swagger)
Team leadership, mentoring, 1:1s, onboarding, hiring
Engineering culture: blameless postmortems, incident management, SRE practices, SLI/SLO/SLA`;

// Detect if a query needs real-time web search
function needsWebSearch(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Keywords that indicate need for current/real-time info
  const searchTriggers = [
    // Time-sensitive
    'acum', 'azi', 'astăzi', 'ieri', 'recent', 'ultimele', 'ultima', 'ultimul',
    'în prezent', 'momentan', 'curent', 'actual', 'actuală', 'actuale',
    '2024', '2025', '2026', 'anul acesta', 'luna aceasta', 'săptămâna aceasta',
    'cel mai nou', 'cea mai nouă', 'cele mai noi', 'latest', 'newest',
    // Factual queries
    'cine este', 'cine e', 'ce este', 'ce e', 'câți', 'câte', 'câtă',
    'unde este', 'unde e', 'când', 'de ce', 'cum se', 
    'ce s-a întâmplat', 'ce se întâmplă',
    // Research
    'caută', 'găsește', 'informații despre', 'detalii despre',
    'spune-mi despre', 'povestește-mi despre', 'explică-mi',
    'știri', 'noutăți', 'news',
    // Prices, stats, data
    'preț', 'prețul', 'cost', 'scor', 'clasament', 'rezultat', 'rezultate',
    'statistici', 'date', 'cifre',
    // People, places, events
    'președinte', 'ministru', 'campion', 'câștigător',
    'capitala', 'populația', 'suprafața',
    // Products, tech
    'versiune', 'update', 'lansare', 'release',
    // Explicit search requests
    'search', 'google', 'caută pe net', 'caută pe internet', 'caută online',
    'verifică', 'check', 'confirm',
    // Questions about real things
    'vreme', 'meteo', 'temperatură', 'curs valutar', 'bitcoin', 'crypto',
    'film', 'serial', 'joc nou', 'eveniment',
    // Who/what/where
    'who is', 'what is', 'where is', 'how much', 'how many',
  ];

  return searchTriggers.some(trigger => lowerText.includes(trigger));
}

// Build a concise search query from user message
function buildSearchQuery(text: string): string {
  // Remove filler words and keep the core query
  let query = text
    .replace(/\b(ira|hey|salut|bună|te rog|poți|să-mi|spui|zici|caută|găsește|pe net|pe internet|online)\b/gi, '')
    .replace(/[?!.]+/g, '')
    .trim();
  
  // If too short after cleanup, use original
  if (query.length < 5) query = text;
  
  // Cap at reasonable length
  if (query.length > 200) query = query.slice(0, 200);
  
  return query;
}

// Perform web search using Firecrawl
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
      
      // Take first ~500 chars of markdown content per result
      const content = markdown.slice(0, 500) || description;
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

    // Get the user's current message
    const userMessage = messages[messages.length - 1]?.content || "";

    // Check if web search is needed and perform it
    let webContext = "";
    if (needsWebSearch(userMessage)) {
      const searchQuery = buildSearchQuery(userMessage);
      const searchResults = await performWebSearch(searchQuery);
      
      if (searchResults) {
        webContext = `\n\n📡 INFORMAȚII ÎN TIMP REAL DIN CĂUTARE WEB (folosește aceste date ca sursă principală):\n${searchResults.content}\n\nSurse: ${searchResults.sources.join(", ")}\n\n---\nRăspunde bazându-te pe informațiile de mai sus. Citează sursele natural.`;
      }
    }

    // Build full conversation context
    const systemContent = SYSTEM_PROMPT + webContext;
    const fullMessages: any[] = [
      { role: "system", content: systemContent },
      ...conversationHistory,
    ];

    // Add current message with multiple files if present
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
        temperature: 0.4,
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
