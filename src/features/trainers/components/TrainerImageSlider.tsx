import { Image as CachedImage } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTrainerImages } from '../hooks/useTrainerImages';

const HOLD_DURATION = 2800;
const FADE_DURATION = 700;

interface SlideProps {
  uri: string;
  index: number;
  active: SharedValue<number>;
}

function Slide({ uri, index, active }: SlideProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(active.value === index ? 1 : 0, { duration: FADE_DURATION }),
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <CachedImage
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        // Anchor the visible area at the top of the source photo. Trainer
        // portraits put the head at the top of the frame; without this,
        // contentFit="cover" centre-crops and clips the head off the card.
        contentPosition="top"
        cachePolicy="memory-disk"
      />
    </Animated.View>
  );
}

// `uris` is stable for a given mount — the parent keys this on the joined list
// so it remounts when the gallery resolves, keeping the per-slide hook count
// consistent across renders.
function Slideshow({ uris }: { uris: string[] }) {
  const active = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (uris.length < 2) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % uris.length);
    }, HOLD_DURATION);
    return () => clearInterval(id);
  }, [uris.length]);

  useEffect(() => {
    active.value = activeIndex;
  }, [activeIndex, active]);

  return (
    <>
      {uris.map((uri, index) => (
        <Slide key={`${index}-${uri}`} uri={uri} index={index} active={active} />
      ))}
    </>
  );
}

interface TrainerImageSliderProps {
  trainerId: string;
  /** Shown while the gallery loads or when the trainer has no gallery images. */
  fallbackImage: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Crossfading slideshow of a trainer's gallery images. Auto-advances through
 * every uploaded image and loops; falls back to a single image when the gallery
 * is empty or still loading.
 */
export function TrainerImageSlider({ trainerId, fallbackImage, style }: TrainerImageSliderProps) {
  const { data: images } = useTrainerImages(trainerId);
  const uris = images?.length ? images.map((image) => image.imageUrl) : [fallbackImage];

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Slideshow key={uris.join('|')} uris={uris} />
    </Animated.View>
  );
}
