import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_LANGUAGES = ['fr', 'ar', 'en', 'pt'];

// Retry wrapper with exponential backoff for rate limits
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  const delays = [5000, 10000, 15000];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429 && attempt < maxRetries) {
      const delay = delays[attempt] || 15000;
      console.log(`Rate limited (429). Retry ${attempt + 1}/${maxRetries} after ${delay / 1000}s...`);
      await response.text();
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return response;
  }
  return await fetch(url, options);
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
    
    // Find the Gospel reading in lectures
    const messe = data.messes?.[0];
    if (!messe?.lectures) return null;
    
    const evangile = messe.lectures.find((l: any) => l.type === "evangile");
    if (!evangile) {
      console.error("No evangile found in AELF response");
      return null;
    }
    
    const reference = evangile.ref || "";
    // Strip HTML tags from contenu to get plain text
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

    // --- Use service role client for DB writes (after auth is confirmed) ---
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

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

    const systemPrompt = `Tu es un théologien catholique érudit, pasteur et pédagogue, 
inspiré par les Pères de l'Église (Origène, Saint Augustin, Saint Jean Chrysostome), 
Saint Thomas d'Aquin, et la tradition spirituelle catholique.
Tu rédiges des contenus spirituels catholiques pour l'application "Évangile Vécu" du Diocèse Pierre Claverie.
Tes réponses sont toujours théologiquement fiables, pastorales, accessibles aux fidèles, et profondément enracinées dans la Tradition catholique.
Tu réponds UNIQUEMENT en ${langName}.`;

    let userPrompt: string;
    if (aelfGospel) {
      // We have the exact Gospel from AELF - use it directly
      userPrompt = `Génère le contenu spirituel complet pour la semaine liturgique commençant le vendredi ${weekStart}.
Le dimanche de cette semaine est le ${sundayDate} — ${aelfGospel.celebration}.

L'Évangile de ce dimanche est : **${aelfGospel.reference}**.
C'est une donnée officielle tirée directement de l'API du lectionnaire AELF. Tu dois utiliser EXACTEMENT cette référence.

Voici le texte intégral de l'Évangile tel que fourni par le lectionnaire officiel :
---
${aelfGospel.text}
---

Tu dois utiliser CE TEXTE EXACT comme base. Ne le modifie pas, ne le remplace pas.
Génère le contenu spirituel correspondant (commentaire, méditation, vertus, conseils).

${language !== 'fr' ? `IMPORTANT: Traduis le texte de l'Évangile et tout le contenu en ${langName}. La référence biblique reste en format international.` : ''}

Utilise l'outil generate_spiritual_content pour fournir toutes les informations.`;
    } else {
      // Fallback if AELF API fails
      console.warn("AELF API failed, falling back to AI-generated reference");
      userPrompt = `Génère le contenu spirituel complet pour la semaine liturgique commençant le vendredi ${weekStart}.
Le dimanche de cette semaine est le ${sundayDate}.

Identifie précisément l'Évangile du dimanche ${sundayDate} selon le lectionnaire catholique romain officiel.

Utilise l'outil generate_spiritual_content pour fournir toutes les informations.`;
    }

    const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
    const openRouterHeaders = {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    };

    const response = await fetchWithRetry(openRouterUrl, {
      method: "POST",
      headers: openRouterHeaders,
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_spiritual_content",
              description: "Génère le contenu spirituel complet de la semaine",
              parameters: {
                type: "object",
                properties: {
                  gospel_reference: { type: "string", description: "Référence de l'Évangile ex: Matthieu 5, 1-12" },
                  gospel_text: { type: "string", description: "Texte complet de l'Évangile" },
                  commentary: { type: "string", description: "Commentaire théologique de 400-600 mots inspiré des Pères de l'Église" },
                  meditation: { type: "string", description: "Méditation spirituelle de 300-400 mots" },
                  virtues: { type: "array", items: { type: "string" }, description: "3 vertus chrétiennes à pratiquer cette semaine" },
                  christian_advice: { type: "array", items: { type: "string" }, description: "5 conseils pratiques pour vivre l'Évangile" },
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
        return new Response(JSON.stringify({ error: "Le modèle est temporairement surchargé. Veuillez réessayer dans quelques minutes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      // For French, use the official AELF text directly
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
    };

    const prayerResponse = await fetchWithRetry(openRouterUrl, {
      method: "POST",
      headers: openRouterHeaders,
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Pour l'Évangile du dimanche "${parsed.gospel_reference}", génère 7 prières quotidiennes (une par jour, du vendredi au jeudi) inspirées de cet Évangile. Chaque prière doit être différente, belle, poétique, profonde (100-150 mots), ancrée dans la Tradition catholique. Les jours sont: ${(dayNames[language] || dayNames.fr).join(', ')}.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_daily_prayers",
              description: "Génère les prières quotidiennes de la semaine",
              parameters: {
                type: "object",
                properties: {
                  prayers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "number", description: "0=Vendredi, 1=Samedi, 2=Dimanche, 3=Lundi, 4=Mardi, 5=Mercredi, 6=Jeudi" },
                        title: { type: "string" },
                        text: { type: "string" },
                      },
                      required: ["day", "title", "text"],
                      additionalProperties: false,
                    },
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
        max_tokens: 4000,
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
          }
        } catch (e) {
          console.error("Prayer parse error:", e);
        }
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
