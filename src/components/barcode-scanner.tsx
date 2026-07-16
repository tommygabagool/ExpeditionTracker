import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) {
      requestPerm();
    }
  }, [perm, requestPerm]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        {perm?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={(r) => onScanned(r.data)}
          />
        ) : (
          <Text style={styles.denied}>
            {perm && !perm.canAskAgain
              ? 'CAMERA ACCESS DENIED — ENABLE IT IN SETTINGS OR SEARCH BY NAME'
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
