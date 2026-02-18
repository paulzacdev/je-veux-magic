import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const langNames: Record<string, string> = {
      fr: "français",
      ar: "arabe",
      en: "anglais",
    };
    const langName = langNames[language] || "français";

    const systemPrompt = `Tu es un guide spirituel catholique pastoral et bienveillant, 
au service des fidèles du Diocèse Pierre Claverie.
Tu t'inspires de la sagesse des Pères de l'Église (Saint Augustin, Saint Jean Chrysostome, Origène), 
de Saint Thomas d'Aquin, Saint François de Sales, et de la spiritualité catholique traditionnelle.

Tes réponses sont:
- Pastorales et bienveillantes, jamais condescendantes
- Théologiquement fidèles à l'enseignement catholique
- Accessibles aux fidèles simples comme aux plus instruits
- Ancrées dans l'Évangile et la Tradition catholique
- Pratiques: tu aides les fidèles à vivre leur foi au quotidien
- Jamais moralisantes mais toujours encourageantes

Tu réponds TOUJOURS en ${langName}.
${language === 'ar' ? 'Utilise un arabe standard moderne, fluide et accessible.' : ''}

Si une question dépasse le cadre spirituel ou religieux catholique, 
redirige doucement vers la dimension spirituelle ou suggère de consulter un prêtre.

Tu peux citer l'Écriture, les Pères de l'Église, ou les Saints pour enrichir tes réponses.
Garde un ton chaleureux, humble et profond. Tu es un ami spirituel, pas un professeur distant.`;

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
          ...messages,
        ],
        stream: true,
        temperature: 0.8,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporairement indisponible. Veuillez contacter l'administrateur." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e: any) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
