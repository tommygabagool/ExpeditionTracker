import { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

import { palette } from '@/constants/theme';

const COLORS = [palette.gold, palette.orange, palette.green, palette.blue];
const COUNT = 26;

interface Particle {
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  fallTo: number;
  drift: number;
  spin: string;
  t: Animated.Value;
}

// Confetti flecks falling from the top edge — remount (via key) to replay.
// Gold/sunset/pine on cream; snow-white would vanish on this paper.
export function SnowBurst() {
  // Randomized once via the lazy useState initializer (runs on mount only), so
  // the flecks stay put across re-renders and the render body stays pure.
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: COUNT }, () => ({
      x: Math.random() * Dimensions.get('window').width,
      size: 5 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 250,
      duration: 1200 + Math.random() * 700,
      fallTo: 260 + Math.random() * 320,
      drift: (Math.random() - 0.5) * 90,
      spin: `${Math.round((Math.random() - 0.5) * 1440)}deg`,
      t: new Animated.Value(0),
    })),
  );

  useEffect(() => {
    Animated.stagger(
      8,
      particles.map((p) =>
        Animated.timing(p.t, {
          toValue: 1,
          duration: p.duration,
          delay: p.delay,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [particles]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: -12,
            left: p.x,
            width: p.size,
            height: p.size * 1.6,
            backgroundColor: p.color,
            opacity: p.t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.t.interpolate({ inputRange: [0, 1], outputRange: [0, p.fallTo] }) },
              { translateX: p.t.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', p.spin] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
