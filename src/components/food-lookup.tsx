import { useMemo, useRef, useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FontFamily, palette } from '@/constants/theme';
import { addDailyCalories, saveMyFoodUse, searchMyFoods, type MyFood } from '@/data/repos';
import { lookupBarcode, searchFoods, type FoodHit } from '@/lib/food-api';

type ScannerProps = { onScanned: (code: string) => void; onClose: () => void };

/** Lazy so a dev client without the expo-camera native module still runs —
 *  the module is only evaluated on the SCAN tap (see barcode-scanner.tsx). */
function loadScanner(): ComponentType<ScannerProps> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/components/barcode-scanner') as typeof import('@/components/barcode-scanner');
    return mod.BarcodeScanner;
  } catch {
    return null;
  }
}

// Food lookup for the Fuel tab. Library first: my_foods matches appear as you
// type (offline, instant); USDA search and barcode scan (Open Food Facts) are
// the only network paths and every pick lands back in the library, so remote
// calls get rarer over time. Picking a food shows an editable kcal before
// logging — OFF data is crowd-sourced, treat it as a draft, not a verdict.

type Pick = Omit<MyFood, 'id' | 'useCount'>;

const fromHit = (h: FoodHit): Pick => ({
  label: h.label,
  brand: h.brand,
  servingDesc: h.servingDesc,
  kcal: h.kcal,
  proteinG: h.proteinG,
  carbsG: h.carbsG,
  fatG: h.fatG,
  source: h.source,
  sourceId: h.sourceId,
  barcode: h.barcode,
});

const fromMyFood = (f: MyFood): Pick => ({
  label: f.label,
  brand: f.brand,
  servingDesc: f.servingDesc,
  kcal: f.kcal,
  proteinG: f.proteinG,
  carbsG: f.carbsG,
  fatG: f.fatG,
  source: f.source,
  sourceId: f.sourceId,
  barcode: f.barcode,
});

interface Props {
  todayKey: string;
}

export function FoodLookup({ todayKey }: Props) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<FoodHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [Scanner, setScanner] = useState<ComponentType<ScannerProps> | null>(null);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [picked, setPicked] = useState<Pick | null>(null);
  const [kcalEdit, setKcalEdit] = useState('');
  // Bumped on every search and on every keystroke so a slow/stale response
  // (query changed, or a second search fired, while the first was in flight)
  // can never overwrite results that no longer match what's on screen.
  const searchToken = useRef(0);

  // SQLite is synchronous and tiny here — recompute per keystroke.
  const mine = useMemo(() => searchMyFoods(query), [query]);

  const pick = (p: Pick) => {
    setPicked(p);
    setKcalEdit(String(p.kcal));
    setScanMsg(null);
  };

  const runSearch = async () => {
    if (query.trim().length < 2 || busy) return;
    setBusy(true);
    const token = ++searchToken.current;
    const hits = await searchFoods(query);
    if (searchToken.current === token) setRemote(hits);
    setBusy(false);
  };

  const onScanned = async (code: string) => {
    setScanner(null);
    setBusy(true);
    const hit = await lookupBarcode(code);
    setBusy(false);
    if (hit) {
      pick(fromHit(hit));
    } else {
      setScanMsg(`NO MATCH FOR ${code} — LOG IT MANUALLY ABOVE`);
    }
  };

  const openScanner = () => {
    setScanMsg(null);
    const component = loadScanner();
    if (component) {
      setScanner(() => component);
    } else {
      setScanMsg('BARCODE SCAN NEEDS THE NEW DEV BUILD — SEARCH BY NAME INSTEAD');
    }
  };

  const add = () => {
    if (!picked) return;
    const kcal = parseInt(kcalEdit, 10);
    if (!kcal || kcal < 1 || kcal > 5000) return;
    addDailyCalories(todayKey, kcal);
    saveMyFoodUse({ ...picked, kcal });
    setPicked(null);
    setQuery('');
    setRemote([]);
  };

  const rows: { key: string; tag: string; tagColor: string; p: Pick }[] = [
    ...mine.map((f) => ({ key: 'mine:' + f.id, tag: 'MINE', tagColor: palette.green, p: fromMyFood(f) })),
    ...remote
      .filter((h) => !mine.some((f) => f.sourceId === h.sourceId && f.source === h.source))
      .map((h) => ({ key: 'usda:' + h.sourceId, tag: 'USDA', tagColor: palette.blue, p: fromHit(h) })),
  ];

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>FOOD LOOKUP</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setRemote([]);
            searchToken.current++;
          }}
          onSubmitEditing={runSearch}
          placeholder="Search foods…"
          placeholderTextColor={palette.faint}
          returnKeyType="search"
          style={styles.input}
        />
        <Pressable onPress={runSearch} style={styles.actionBtn}>
          <Text style={styles.actionText}>{busy ? '…' : 'USDA'}</Text>
        </Pressable>
        <Pressable onPress={openScanner} style={styles.actionBtn}>
          <Text style={styles.actionText}>SCAN</Text>
        </Pressable>
      </View>

      {scanMsg && <Text style={styles.scanMsg}>{scanMsg}</Text>}

      {rows.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {rows.map((r) => (
            <Pressable key={r.key} onPress={() => pick(r.p)} style={styles.hitRow}>
              <Text style={[styles.hitTag, { color: r.tagColor, borderColor: r.tagColor }]}>{r.tag}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.hitLabel} numberOfLines={1}>
                  {r.p.label}
                </Text>
                <Text style={styles.hitSub} numberOfLines={1}>
                  {[r.p.brand, r.p.servingDesc].filter(Boolean).join(' · ') || '—'}
                </Text>
              </View>
              <Text style={styles.hitKcal}>{r.p.kcal}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {picked && (
        <View style={styles.addStrip}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.hitLabel} numberOfLines={1}>
              {picked.label}
            </Text>
            <Text style={styles.hitSub} numberOfLines={1}>
              {[picked.servingDesc, picked.source === 'off' ? 'CROWD-SOURCED — CHECK KCAL' : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <TextInput
            value={kcalEdit}
            onChangeText={setKcalEdit}
            keyboardType="number-pad"
            style={[styles.input, { flex: 0, width: 84, textAlign: 'center' }]}
          />
          <Pressable onPress={add} style={styles.addBtn}>
            <Text style={styles.actionText}>+ ADD</Text>
          </Pressable>
        </View>
      )}

      {Scanner && <Scanner onScanned={(code) => void onScanned(code)} onClose={() => setScanner(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
  },
  panelTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    letterSpacing: 2,
    color: palette.text,
  },
  input: {
    flex: 1,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.text,
    fontFamily: FontFamily.mono,
    fontSize: 15,
    paddingVertical: 11,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: 1.5,
    color: palette.textDim,
  },
  scanMsg: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: palette.orange,
    letterSpacing: 0.5,
    marginTop: 8,
  },
  hitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  hitTag: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    letterSpacing: 1,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  hitLabel: { fontFamily: FontFamily.body, fontSize: 15, color: palette.text },
  hitSub: { fontFamily: FontFamily.mono, fontSize: 11, color: palette.muted, marginTop: 1 },
  hitKcal: { fontFamily: FontFamily.monoBold, fontSize: 15, color: palette.gold },
  addStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  addBtn: {
    backgroundColor: palette.orange,
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
