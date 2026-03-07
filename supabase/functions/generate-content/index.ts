import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_LANGUAGES = ['fr', 'ar', 'en', 'pt'];

// Primary: Lovable AI Gateway
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

// Fallback: OpenRouter (free models)
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

// Retry wrapper with exponential backoff for rate limits
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  const delays = [3000, 6000, 12000];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429 && attempt < maxRetries) {
      const delay = delays[attempt] || 12000;
      console.log(`Rate limited (429). Retry ${attempt + 1}/${maxRetries} after ${delay / 1000}s...`);
      await response.text();
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return response;
  }
  return await fetch(url, options);
}

// Call AI with automatic fallback to OpenRouter on 402/429
async function callAI(body: any, lovableKey: string, openrouterKey: string | undefined): Promise<any> {
  // Try Lovable AI Gateway first
  const primaryResponse = await fetchWithRetry(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: AI_MODEL, ...body }),
  });

  if (primaryResponse.ok) {
    return primaryResponse.json();
  }

  const status = primaryResponse.status;
  const errText = await primaryResponse.text();
  console.warn(`Lovable AI failed (${status}): ${errText.slice(0, 200)}`);

  // Fallback to OpenRouter on 402 (no credits) or 429 (rate limit)
  if ((status === 402 || status === 429) && openrouterKey) {
    console.log("Falling back to OpenRouter free model...");
    const fallbackResponse = await fetchWithRetry(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://evangile-vecu.lovable.app",
        "X-Title": "Evangile Vecu",
      },
      body: JSON.stringify({ model: OPENROUTER_MODEL, ...body }),
    });

    if (fallbackResponse.ok) {
      return fallbackResponse.json();
    }

    const fallbackErr = await fallbackResponse.text();
    console.error(`OpenRouter fallback also failed (${fallbackResponse.status}): ${fallbackErr.slice(0, 200)}`);
    throw new Error(`AI unavailable (primary: ${status}, fallback: ${fallbackResponse.status})`);
  }

  throw new Error(`AI gateway error: ${status}`);
}

// Fetch Gospel from AELF API
async function fetchGospelFromAELF(sundayDate: string): Promise<{ reference: string; text: string; celebration: string } | null> {
  try {
    const url = `https://api.aelf.org/v1/messes/${sundayDate}/afrique`;
    console.log(`Fetching AELF API: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`AELF API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    
    const celebration = data.informations?.jour_liturgique_nom || data.informations?.ligne1 || "";
    
    const messe = data.messes?.[0];
    if (!messe?.lectures) return null;
    
    const evangile = messe.lectures.find((l: any) => l.type === "evangile");
    if (!evangile) {
      console.error("No evangile found in AELF response");
      return null;
    }
    
    const reference = evangile.ref || "";
    const text = (evangile.contenu || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\u00a0/g, " ")
      .trim();
    
    console.log(`AELF Gospel found: ${reference} (${celebration})`);
    return { reference, text, celebration };
  } catch (e) {
    console.error("AELF fetch error:", e);
    return null;
  }
}

function getWeekInfo(weekStart: string): { sundayDate: string } {
  const friday = new Date(weekStart);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  const sundayDate = sunday.toISOString().split('T')[0];
  return { sundayDate };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth validation ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Input validation ---
    const { language, weekStart } = await req.json();

    if (!ALLOWED_LANGUAGES.includes(language)) {
      return new Response(JSON.stringify({ error: 'Invalid language' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return new Response(JSON.stringify({ error: 'Invalid weekStart format' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY && !OPENROUTER_API_KEY) throw new Error("No AI API key configured");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { sundayDate } = getWeekInfo(weekStart);
    
    // Fetch Gospel from AELF API
    const aelfGospel = await fetchGospelFromAELF(sundayDate);

    const langNames: Record<string, string> = {
      fr: "français",
      ar: "arabe",
      en: "anglais",
      pt: "portugais",
    };
    const langName = langNames[language] || "français";

    const langInstructions: Record<string, string> = {
      fr: "Tu rédiges TOUT en français.",
      en: "You MUST write ALL content entirely in English. Every field — gospel_text, commentary, meditation, virtues, christian_advice — MUST be in English. Do NOT leave any French text.",
      ar: "يجب أن تكتب كل المحتوى بالكامل باللغة العربية. كل حقل — gospel_text, commentary, meditation, virtues, christian_advice — يجب أن يكون باللغة العربية. لا تترك أي نص بالفرنسية.",
      pt: "Você DEVE escrever TODO o conteúdo inteiramente em português. Cada campo — gospel_text, commentary, meditation, virtues, christian_advice — DEVE estar em português. NÃO deixe nenhum texto em francês.",
    };

    const systemPrompt = `You are a scholarly Catholic theologian, pastor, and educator,
inspired by the Church Fathers (Origen, Saint Augustine, Saint John Chrysostom),
Saint Thomas Aquinas, and the Catholic spiritual tradition.
You create spiritual content for the app "Évangile Vécu" of the Diocese Pierre Claverie.
Your responses are always theologically sound, pastoral, accessible to the faithful, and deeply rooted in Catholic Tradition.

CRITICAL LANGUAGE RULE: ${langInstructions[language] || langInstructions.fr}
The output language is: ${langName.toUpperCase()}.
Every single field you return in the tool call MUST be written in ${langName}. No exceptions.`;

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    let userPrompt: string;
    if (aelfGospel) {
      userPrompt = `Generate the complete spiritual content for the liturgical week starting Friday ${weekStart}.
The Sunday of this week is ${sundayDate} — ${aelfGospel.celebration}.

The Gospel for this Sunday is: **${aelfGospel.reference}**.
This is official data from the AELF lectionary API. You MUST use EXACTLY this reference.

Here is the full Gospel text from the official lectionary:
---
${aelfGospel.text}
---

MANDATORY INSTRUCTIONS:
1. Use the tool "generate_spiritual_content" to return all fields.
2. OUTPUT LANGUAGE = ${langName.toUpperCase()}. ALL fields must be in ${langName}.
3. gospel_text: ${language === 'fr' ? 'Use the exact French text above without modification.' : `Translate the Gospel text above into ${langName}. The translation must be faithful, liturgical in tone, and complete.`}
4. gospel_reference: Keep the biblical reference in international format (e.g., "Mt 5, 1-12").
5. commentary: Write a rich theological commentary (400-600 words) in ${langName}, inspired by the Church Fathers.
6. meditation: Write a deep spiritual meditation (300-400 words) in ${langName}.
7. virtues: List 3 Christian virtues to practice this week, each as a short phrase in ${langName}.
8. christian_advice: List 5 practical tips for living the Gospel this week, each in ${langName}.

DO NOT leave any field in French if the target language is not French.`;
    } else {
      console.warn("AELF API failed, falling back to AI-generated reference");
      userPrompt = `Generate the complete spiritual content for the liturgical week starting Friday ${weekStart}.
The Sunday of this week is ${sundayDate}.

Identify the exact Gospel for Sunday ${sundayDate} according to the official Roman Catholic lectionary.

ALL content MUST be written in ${langName.toUpperCase()}.
Use the tool "generate_spiritual_content" to provide all fields.`;
    }

    const response = await fetchWithRetry(AI_GATEWAY_URL, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_spiritual_content",
              description: `Generate complete weekly spiritual content. ALL fields in ${langName}.`,
              parameters: {
                type: "object",
                properties: {
                  gospel_reference: { type: "string", description: "Biblical reference e.g. Jn 4, 5-42" },
                  gospel_text: { type: "string", description: `Full Gospel text in ${langName}` },
                  commentary: { type: "string", description: `Theological commentary 400-600 words in ${langName}` },
                  meditation: { type: "string", description: `Spiritual meditation 300-400 words in ${langName}` },
                  virtues: { type: "array", items: { type: "string" }, description: `3 Christian virtues in ${langName}` },
                  christian_advice: { type: "array", items: { type: "string" }, description: `5 practical tips in ${langName}` },
                },
                required: ["gospel_reference", "gospel_text", "commentary", "meditation", "virtues", "christian_advice"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_spiritual_content" } },
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Le service IA est temporairement surchargé. Veuillez réessayer dans quelques minutes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants. Veuillez réessayer plus tard." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("No tool call returned from AI");
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("JSON parse error:", e, "Args:", toolCall.function.arguments?.slice(0, 500));
      throw new Error("Failed to parse tool call arguments");
    }

    // Force the AELF reference and text if available
    if (aelfGospel) {
      parsed.gospel_reference = aelfGospel.reference;
      if (language === 'fr') {
        parsed.gospel_text = aelfGospel.text;
      }
    }

    const { data: savedContent, error: dbError } = await supabase
      .from("weekly_content")
      .upsert({
        week_start: weekStart,
        language,
        gospel_text: parsed.gospel_text,
        gospel_reference: parsed.gospel_reference,
        meditation: parsed.meditation,
        commentary: parsed.commentary,
        virtues: parsed.virtues,
        christian_advice: parsed.christian_advice,
      }, { onConflict: "week_start,language" })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save content: " + dbError.message);
    }

    // Generate daily prayers
    const dayNames: Record<string, string[]> = {
      fr: ['Vendredi', 'Samedi', 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
      en: ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      ar: ['الجمعة', 'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
      pt: ['Sexta-feira', 'Sábado', 'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira'],
    };

    const prayerLangInstruction: Record<string, string> = {
      fr: "Rédige toutes les prières en français.",
      en: "Write ALL prayers entirely in English. Every title and text must be in English.",
      ar: "اكتب جميع الصلوات بالكامل باللغة العربية. كل عنوان ونص يجب أن يكون بالعربية.",
      pt: "Escreva TODAS as orações inteiramente em português. Cada título e texto deve estar em português.",
    };

    const prayerResponse = await fetchWithRetry(AI_GATEWAY_URL, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `For the Sunday Gospel "${parsed.gospel_reference}", generate 7 daily prayers (one per day, from Friday to Thursday) inspired by this Gospel.

CRITICAL: ${prayerLangInstruction[language] || prayerLangInstruction.fr}
Output language: ${langName.toUpperCase()}.

Each prayer must be:
- Different from the others
- Beautiful, poetic, and profound (100-150 words)
- Rooted in Catholic Tradition
- Written ENTIRELY in ${langName}

The days are: ${(dayNames[language] || dayNames.fr).join(', ')}.

You MUST return exactly 7 prayers using the tool "generate_daily_prayers". Each prayer must have day (0=Friday through 6=Thursday), title, and text — ALL in ${langName}.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_daily_prayers",
              description: `Generate 7 daily prayers for the week, ALL in ${langName}`,
              parameters: {
                type: "object",
                properties: {
                  prayers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "number", description: "0=Friday, 1=Saturday, 2=Sunday, 3=Monday, 4=Tuesday, 5=Wednesday, 6=Thursday" },
                        title: { type: "string", description: `Prayer title in ${langName}` },
                        text: { type: "string", description: `Prayer text in ${langName}, 100-150 words` },
                      },
                      required: ["day", "title", "text"],
                      additionalProperties: false,
                    },
                    minItems: 7,
                    maxItems: 7,
                  },
                },
                required: ["prayers"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_daily_prayers" } },
        temperature: 0.7,
        max_tokens: 5000,
      }),
    });

    if (prayerResponse.ok && savedContent?.id) {
      const prayerAiData = await prayerResponse.json();
      const prayerToolCall = prayerAiData.choices?.[0]?.message?.tool_calls?.[0];
      if (prayerToolCall) {
        try {
          const prayerParsed = JSON.parse(prayerToolCall.function.arguments);
          if (prayerParsed.prayers) {
            const prayerInserts = prayerParsed.prayers.map((p: any) => ({
              weekly_content_id: savedContent.id,
              day_of_week: p.day,
              prayer_title: p.title,
              prayer_text: p.text,
            }));
            await supabase.from("daily_prayers").delete().eq("weekly_content_id", savedContent.id);
            await supabase.from("daily_prayers").insert(prayerInserts);
            console.log(`Inserted ${prayerInserts.length} prayers for ${language}`);
          }
        } catch (e) {
          console.error("Prayer parse error:", e);
        }
      } else {
        console.error("No prayer tool call in response");
      }
    }

    return new Response(JSON.stringify({ content: savedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-content error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
