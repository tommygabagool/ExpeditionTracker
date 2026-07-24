// Open Food Facts barcode lookup (free, keyless). Proxied through an edge
// function so the app gets the same normalized FoodHit shape as food-search
// and lookups can be evolved server-side. OFF data is crowd-sourced — the app
// presents the values as editable before logging.
//
// Read-through cache: a barcode's normalized hit is stored permanently in
// public.foods (source 'off'), so each unique product hits OFF once ever
// across the whole userbase.

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface OffProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | undefined>;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const { code } = await req.json().catch(() => ({}));
  if (!code || !/^\d{6,14}$/.test(String(code))) {
    return Response.json({ error: 'body must be { code: "<digits>" }' }, { status: 400 });
  }

  // Permanent cache hit → serve without touching Open Food Facts.
  const { data: cached } = await supabase
    .from('foods')
    .select('payload')
    .eq('source', 'off')
    .eq('source_id', String(code))
    .maybeSingle();
  if (cached) {
    return Response.json({ hit: cached.payload });
  }

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json` +
      '?fields=product_name,brands,serving_size,nutriments',
    { headers: { 'User-Agent': 'Switchback - personal training app' } },
  );
  if (res.status === 404) {
    return Response.json({ hit: null });
  }
  if (!res.ok) {
    return Response.json({ error: `OFF ${res.status}` }, { status: 502 });
  }
  const json = (await res.json()) as { status: number; product?: OffProduct };
  const p = json.product;
  if (!json.status || !p?.nutriments) {
    return Response.json({ hit: null });
  }

  const n = p.nutriments;
  // Prefer per-serving values; fall back to per-100g.
  const perServing = n['energy-kcal_serving'] != null;
  const pick = (base: string): number | null => {
    const v = perServing ? n[`${base}_serving`] : n[`${base}_100g`];
    return v != null ? Math.round(v * 10) / 10 : null;
  };
  const kcal = perServing ? n['energy-kcal_serving'] : n['energy-kcal_100g'];
  if (kcal == null) {
    return Response.json({ hit: null });
  }

  const hit = {
    label: p.product_name || `Barcode ${code}`,
    brand: p.brands ?? null,
    servingDesc: perServing ? (p.serving_size ?? '1 serving') : '100 g',
    kcal: Math.round(kcal),
    proteinG: pick('proteins'),
    carbsG: pick('carbohydrates'),
    fatG: pick('fat'),
    source: 'off',
    sourceId: String(code),
    barcode: String(code),
  };

  // Populate the permanent cache so this product never hits OFF again.
  await supabase.from('foods').upsert({ source: 'off', source_id: String(code), payload: hit });

  return Response.json({ hit });
});
