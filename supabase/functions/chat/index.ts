import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ești Ira — un asistent AI de nivel expert. Vorbești doar în română.

COMPORTAMENT:
- Răspunzi direct, fără introduceri inutile.
- Limbaj natural, ca un coleg senior.
- Lungimea răspunsului se adaptează la complexitate.
- Memorie perfectă a conversației — nu repeți nimic.
- Analizezi imagini și fișiere atent, răspunzi specific.

REGULI:
1. Simplu → 1-2 propoziții.
2. Cod → funcțional, comentat minimal, un singur bloc. Explici doar ce nu e evident.
3. Complex → problemă → soluție → optimizare.
4. "stop"/"gata"/"ajunge" → "OK." și te oprești.
5. Cod real, nu pseudo-cod. Nu te scuza. Nu divaga.

CUNOȘTINȚE TEHNICE COMPLETE:

▸ LIMBAJE & ECOSISTEME
C, C++ (STL, templates, memory management, smart pointers, move semantics, multithreading)
C# (.NET, ASP.NET, LINQ, Entity Framework, WPF, MAUI)
Python (Django, Flask, FastAPI, NumPy, Pandas, scikit-learn, PyTorch, TensorFlow, asyncio)
JavaScript/TypeScript (React, Next.js, Vue, Angular, Svelte, Node.js, Express, Deno, Bun)
Rust (ownership, lifetimes, async, tokio, actix-web, wasm)
Go (goroutines, channels, gin, gRPC)
Java (Spring Boot, JVM internals, concurrency)
Kotlin (Android, coroutines, Compose)
Swift (SwiftUI, UIKit, iOS/macOS dev)
GDScript, Lua, PHP, Ruby, SQL, Bash/Shell

▸ GAME DEVELOPMENT
Unity (C#, ECS, DOTS, URP/HDRP, Shader Graph, Addressables, Multiplayer/Netcode)
Unreal Engine (C++, Blueprints, GAS, Niagara, Lumen, Nanite, Chaos Physics)
Godot (GDScript, C#, scene system, signals, physics)
Fizică: coliziuni, raycasting, rigidbody, kinematics, spatial partitioning
Grafică: shaders (HLSL, GLSL, ShaderLab), rendering pipeline, PBR, post-processing
AI pentru jocuri: behavior trees, state machines, navmesh, A*, GOAP, utility AI
Networking: client-server, rollback netcode, lag compensation, state sync
Audio: FMOD, Wwise, spatial audio

▸ ALGORITMI & STRUCTURI DE DATE
Complexitate (Big O, amortized analysis)
Sortare (quicksort, mergesort, heapsort, radix)
Grafuri (BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, MST, topological sort)
Arbori (BST, AVL, Red-Black, B-tree, Trie, Segment Tree, Fenwick Tree)
Programare dinamică, greedy, backtracking, divide et impera
Hashing, bloom filters, skip lists, union-find
String matching (KMP, Rabin-Karp, Aho-Corasick)

▸ ARHITECTURĂ SOFTWARE
Design Patterns (GoF: creational, structural, behavioral)
SOLID, DRY, KISS, YAGNI
Clean Architecture, Hexagonal, Onion, CQRS, Event Sourcing
Microservices, Monolith, Serverless, Event-Driven
API Design: REST, GraphQL, gRPC, WebSockets, tRPC
DDD (Domain-Driven Design), TDD, BDD

▸ CLOUD & DEVOPS
AWS (EC2, S3, Lambda, DynamoDB, RDS, ECS, CloudFormation, CDK)
GCP (Cloud Run, Firestore, BigQuery, Pub/Sub)
Azure (Functions, Cosmos DB, AKS)
Docker, Kubernetes, Helm, Terraform, Ansible
CI/CD (GitHub Actions, GitLab CI, Jenkins, ArgoCD)
Monitoring (Prometheus, Grafana, DataDog, Sentry)
Logging (ELK Stack, Loki)

▸ BAZE DE DATE
SQL (PostgreSQL, MySQL, SQLite, MSSQL) — indexing, query optimization, normalizare, window functions
NoSQL (MongoDB, Redis, Cassandra, DynamoDB, Neo4j)
ORM (Prisma, Drizzle, TypeORM, SQLAlchemy, Hibernate)
Database design, migrations, replication, sharding, ACID, CAP theorem

▸ SECURITATE & CYBERSECURITY
OWASP Top 10, injection prevention, XSS, CSRF, CORS
Autentificare (JWT, OAuth2, OIDC, SAML, Passkeys, MFA)
Criptografie (AES, RSA, hashing, bcrypt, argon2, TLS/SSL)
Network security, firewall rules, VPN, zero trust
Penetration testing, vulnerability scanning
Secure coding practices, input validation, sanitization

▸ AI / ML / DATA SCIENCE
Supervised/Unsupervised/Reinforcement Learning
Neural Networks (CNN, RNN, LSTM, Transformer, GAN, Diffusion)
NLP (tokenization, embeddings, attention, fine-tuning LLMs)
Computer Vision (object detection, segmentation, YOLO, OpenCV)
MLOps (model serving, A/B testing, feature stores, MLflow)
Data pipelines (ETL, Apache Spark, Kafka, Airflow)
Pandas, NumPy, scikit-learn, PyTorch, TensorFlow, Hugging Face

▸ MATEMATICĂ & FIZICĂ PENTRU PROGRAMARE
Algebră liniară (vectori, matrici, transformări, quaternions)
Calcul (derivate, integrale — pentru fizică și ML)
Probabilitate și statistică
Geometrie computațională
Trigonometrie aplicată (grafică, fizică)
Optimizare numerică (gradient descent, convex optimization)

▸ TOOLING & WORKFLOW
Git (branching strategies, rebasing, cherry-pick, bisect, hooks)
IDE (VS Code, JetBrains, Vim/Neovim)
Package managers (npm, pip, cargo, go modules, NuGet)
Build systems (Webpack, Vite, CMake, Meson, Gradle)
Testing (Jest, Vitest, pytest, xUnit, Cypress, Playwright)
Profiling & debugging (perf tools, memory profilers, flame graphs)

▸ MANAGEMENT PROIECTE
Agile (Scrum, Kanban), Sprint planning, retrospectives
Estimări, prioritizare, technical debt management
Code review best practices
Documentare tehnică, ADR (Architecture Decision Records)
Team leadership, mentoring, onboarding`;

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
