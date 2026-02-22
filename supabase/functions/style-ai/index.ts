import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, profile, closetItems, weather, stylePhotos } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "daily-outfit") {
      systemPrompt = `You are StyleVault, an elite personal stylist AI. You create outfits from the user's actual closet items based on weather, their style preferences, occupation, and age. Be specific, fashion-forward, and practical. Return a JSON object with: { "outfit": [{ "item": "item name from closet", "category": "category", "styling_tip": "brief tip" }], "style_note": "overall outfit commentary", "weather_tip": "weather-specific advice" }`;
      userPrompt = `Profile: ${JSON.stringify(profile)}\nWeather: ${JSON.stringify(weather)}\nCloset items: ${JSON.stringify(closetItems)}\n\nCreate today's outfit recommendation.`;
    } else if (type === "shopping") {
      systemPrompt = `You are StyleVault, a personal shopping assistant. Analyze the user's closet, style, budget, and lifestyle to recommend specific items they should buy. Focus on filling gaps, upgrading basics, and matching their aesthetic. Return JSON: { "recommendations": [{ "name": "item name", "brand": "brand", "price": number, "reason": "why they need this", "match_score": number (0-100), "tags": ["tag1", "tag2"] }] }`;
      userPrompt = `Profile: ${JSON.stringify(profile)}\nCurrent closet: ${JSON.stringify(closetItems)}\n\nRecommend 6 items to buy.`;
    } else if (type === "analyze-photo") {
      systemPrompt = `You are StyleVault, a fashion analysis AI. Analyze the outfit in the uploaded photo and extract: colors, style category, formality level, season suitability, and key pieces. Return JSON: { "colors": ["color1"], "style": "style category", "formality": "casual/smart-casual/business/formal", "season": "season", "pieces": ["piece1"], "notes": "brief style analysis" }`;
      userPrompt = `Analyze this outfit photo and extract style data.`;
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (type === "analyze-photo" && stylePhotos?.[0]) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: stylePhotos[0] } },
        ],
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("style-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
