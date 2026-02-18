import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getLiturgicalYear(weekStart: string): 'A' | 'B' | 'C' {
  const year = new Date(weekStart).getFullYear();
  const rem = year % 3;
  if (rem === 1) return 'A';
  if (rem === 2) return 'B';
  return 'C';
}

function getWeekInfo(weekStart: string): { sundayDate: string; liturgicalYear: string } {
  const friday = new Date(weekStart);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  const sundayDate = sunday.toISOString().split('T')[0];
  const year = getLiturgicalYear(weekStart);
  return { sundayDate, liturgicalYear: year };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { language, weekStart } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { sundayDate, liturgicalYear } = getWeekInfo(weekStart);

    const langNames: Record<string, string> = {
      fr: "français",
      ar: "arabe",
      en: "anglais",
    };
    const langName = langNames[language] || "français";

    const systemPrompt = `Tu es un théologien catholique érudit, pasteur et pédagogue, 
inspiré par les Pères de l'Église (Origène, Saint Augustin, Saint Jean Chrysostome), 
Saint Thomas d'Aquin, et la tradition spirituelle catholique.
Tu rédiges des contenus spirituels catholiques pour l'application "Évangile Vécu" du Diocèse Pierre Claverie.
Tes réponses sont toujours théologiquement fiables, pastorales, accessibles aux fidèles, et profondément enracinées dans la Tradition catholique.
Tu réponds UNIQUEMENT en ${langName}.`;

    const userPrompt = `Génère le contenu spirituel complet pour la semaine liturgique commençant le vendredi ${weekStart}.
Le dimanche de cette semaine est le ${sundayDate} (Année liturgique ${liturgicalYear}).

Identifie précisément l'Évangile du dimanche ${sundayDate} selon le lectionnaire catholique romain officiel (année ${liturgicalYear}).

Utilise l'outil generate_spiritual_content pour fournir toutes les informations.`;

    // Use tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
                  gospel_reference: {
                    type: "string",
                    description: "Référence de l'Évangile ex: Matthieu 5, 1-12"
                  },
                  gospel_text: {
                    type: "string",
                    description: "Texte complet de l'Évangile (15-40 versets)"
                  },
                  commentary: {
                    type: "string",
                    description: "Commentaire théologique de 400-600 mots inspiré des Pères de l'Église (Saint Augustin, Saint Thomas d'Aquin). Inclus des citations patristiques."
                  },
                  meditation: {
                    type: "string",
                    description: "Méditation spirituelle de 300-400 mots pour accompagner le fidèle toute la semaine"
                  },
                  virtues: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 vertus chrétiennes à pratiquer cette semaine, chacune avec nom et explication concrète (50-70 mots)"
                  },
                  christian_advice: {
                    type: "array",
                    items: { type: "string" },
                    description: "5 conseils pratiques et concrets pour vivre l'Évangile cette semaine"
                  }
                },
                required: ["gospel_reference", "gospel_text", "commentary", "meditation", "virtues", "christian_advice"],
                additionalProperties: false
              }
            }
          }
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
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

    // Save to database
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

    // Generate daily prayers (7 days: Friday to Thursday)
    const dayNames: Record<string, string[]> = {
      fr: ['Vendredi', 'Samedi', 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
      en: ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      ar: ['الجمعة', 'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    };

    const prayerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Pour l'Évangile du dimanche "${parsed.gospel_reference}", génère 7 prières quotidiennes (une par jour, du vendredi au jeudi) inspirées de cet Évangile. Chaque prière doit être différente, belle, poétique, profonde (100-150 mots), ancrée dans la Tradition catholique. Les jours sont: ${(dayNames[language] || dayNames.fr).join(', ')}.`
          }
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
                        text: { type: "string" }
                      },
                      required: ["day", "title", "text"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["prayers"],
                additionalProperties: false
              }
            }
          }
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
