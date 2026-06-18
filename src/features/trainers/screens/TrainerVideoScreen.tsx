import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/features/auth/store/auth.store';
import { env } from '@/shared/constants/env';

const VIDEO_SOURCE = 'https://videos.pexels.com/video-files/5528012/5528012-hd_1080_1920_25fps.mp4';

export function TrainerVideoScreen() {
  const insets = useSafeAreaInsets();
  const { returnTo, trainerId, videoUrl } = useLocalSearchParams<{
    returnTo?: string;
    trainerId?: string;
    videoUrl?: string;
  }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const source = buildVideoSource(videoUrl ?? VIDEO_SOURCE, accessToken);
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.play();
  });

  const handleBack = () => {
    if (returnTo === 'trainer-profile') {
      router.dismissTo({
        pathname: '/(main)/trainer-profile',
        params: trainerId ? { trainerId } : undefined,
      } as never);
      return;
    }

    router.dismissTo('/(main)/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Back button positioned relative to the device's top inset so it never collides
          with the notch / Dynamic Island / Android status bar. */}
      <Pressable
        style={[styles.backButton, { top: insets.top + 12, left: insets.left + 16 }]}
        onPress={handleBack}
        hitSlop={12}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>

      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
        allowsPictureInPicture
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    // Fill the entire portrait screen so the player takes the full
    // available space on arrival, without the user having to tap the
    // expand control on the native chrome. contentFit="contain" on the
    // VideoView keeps the actual video frame letterboxed inside this
    // area instead of cropping.
    flex: 1,
    width: '100%',
  },
});

function buildVideoSource(uri: string, accessToken: string | null): VideoSource {
  if (!accessToken || !uri.startsWith(env.API_BASE_URL)) {
    return uri;
  }

  return {
    uri,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    contentType: 'progressive',
  };
}
