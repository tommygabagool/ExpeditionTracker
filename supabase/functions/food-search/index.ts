// USDA FoodData Central search proxy. Keeps the (free) FDC_API_KEY out of the
// app bundle and returns foods normalized to the app's FoodHit shape. The app
// caches results for a week — this function should see very little traffic.
//
// Write-through: each returned food is upserted into public.foods (source
// 'usda', keyed on fdcId), building the permanent per-food cache the rest of
// the app reads from.
//
// Secrets: supabase secrets set FDC_API_KEY=... (get one at fdc.nal.usda.gov)

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface FdcNutrient {
  nutrientId: number;
  value: number;
}

interface FdcFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients: FdcNutrient[];
}

// FDC nutrient ids: 1008 kcal, 1003 protein, 1005 carbs, 1004 fat.
const nutrient = (f: FdcFood, id: number): number | null =>
  f.foodNutrients.find((n) => n.nutrientId === id)?.value ?? null;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const key = Deno.env.get('FDC_API_KEY');
  if (!key) {
    return Response.json({ error: 'FDC_API_KEY not configured' }, { status: 500 });
  }
  const { q } = await req.json().catch(() => ({}));
  if (!q || typeof q !== 'string') {
    return Response.json({ error: 'body must be { q: string }' }, { status: 400 });
  }

  const url =
    'https://api.nal.usda.gov/fdc/v1/foods/search' +
    `?api_key=${key}&query=${encodeURIComponent(q)}` +
    '&dataType=Foundation,SR%20Legacy,Branded&pageSize=12';
  const res = await fetch(url);
  if (!res.ok) {
    return Response.json({ error: `FDC ${res.status}` }, { status: 502 });
  }
  const json = (await res.json()) as { foods?: FdcFood[] };

  const hits = (json.foods ?? [])
    .map((f) => {
      const kcal = nutrient(f, 1008);
      if (kcal === null) return null;
      // Search-endpoint nutrients are per 100 g; scale to the labeled serving
      // for branded foods so one tap logs one real-world serving.
      const scale = f.servingSize && f.servingSizeUnit?.toLowerCase().startsWith('g')
        ? f.servingSize / 100
        : 1;
      const servingDesc =
        f.householdServingFullText ??
        (f.servingSize ? `${f.servingSize} ${f.servingSizeUnit ?? 'g'}` : '100 g');
      const scaled = (v: number | null) => (v === null ? null : Math.round(v * scale * 10) / 10);
      return {
        label: f.description,
        brand: f.brandOwner ?? f.brandName ?? null,
        servingDesc,
        kcal: Math.round(kcal * scale),
        proteinG: scaled(nutrient(f, 1003)),
        carbsG: scaled(nutrient(f, 1005)),
        fatG: scaled(nutrient(f, 1004)),
        source: 'usda',
        sourceId: String(f.fdcId),
        barcode: null,
      };
    })
    .filter((h) => h !== null);

  // Write-through: populate the permanent per-food cache. Best-effort — a cache
  // write must never fail the search response.
  if (hits.length > 0) {
    await supabase
      .from('foods')
      .upsert(
        hits.map((h) => ({ source: 'usda', source_id: h.sourceId, payload: h })),
        { onConflict: 'source,source_id' },
      )
      .then(undefined, () => {});
  }

  return Response.json({ hits });
});
