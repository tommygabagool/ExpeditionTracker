import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, palette } from '@/constants/theme';

// Full-screen barcode scanner for the food log. This file owns the ONLY
// expo-camera import in the app, and food-lookup.tsx require()s it lazily on
// the SCAN tap — a static import would evaluate expo-camera's native module
// at startup and crash any dev client built before the module was added.

interface Props {
  onScanned: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScanned, onClose }: Props) {
  const [perm, requestPerm] = useCameraPermissions();
  // One auto-request per scanner open: without this, a single Android denial
  // (which commonly leaves canAskAgain true) re-triggers the effect on every
  // resolved request and the OS dialog reappears in a loop. The ref gates
  // re-entrancy synchronously inside the effect; the state (set once the
  // request settles, not synchronously in the effect body) is what render
  // below reads to tell "still asking" from "already asked, still denied".
  const askedRef = useRef(false);
  const [requested, setRequested] = useState(false);
  // CameraView keeps firing onBarcodeScanned for as long as a code is in
  // frame; without a lock, holding the phone steady fires duplicate lookups
  // (setScanner(null) in the parent is an async state update, not an
  // instant unmount).
  const lockedRef = useRef(false);

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain && !askedRef.current) {
      askedRef.current = true;
      void requestPerm().finally(() => setRequested(true));
    }
  }, [perm, requestPerm]);

  const handleScanned = (code: string) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    onScanned(code);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        {perm?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={(r) => handleScanned(r.data)}
          />
        ) : (
          <Text style={styles.denied}>
            {perm && !perm.canAskAgain
              ? 'CAMERA ACCESS DENIED — ENABLE IT IN SETTINGS OR SEARCH BY NAME'
              : requested
                ? 'CAMERA ACCESS DENIED — SEARCH BY NAME INSTEAD'
                : 'REQUESTING CAMERA ACCESS…'}
          </Text>
        )}
        <Pressable onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>CANCEL</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  denied: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: palette.panel,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  close: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeText: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: 1.5,
    color: palette.textDim,
  },
});
