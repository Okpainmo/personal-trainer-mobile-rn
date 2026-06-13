import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBookingGate } from '@/features/subscription/hooks/useBookingGate';
import { ImagePreviewModal } from '@/shared/components';
import { useTheme } from '@/shared/theme';

import { useTrainer } from '../hooks/useTrainer';
import { useTrainerImages } from '../hooks/useTrainerImages';

export function TrainerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { trainerId } = useLocalSearchParams<{ trainerId?: string }>();
  const { data: trainer, isLoading, isError, refetch } = useTrainer(trainerId);
  const { data: galleryImages = [] } = useTrainerImages(trainerId);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const { colors, isDark } = useTheme();
  const { startBooking, checking } = useBookingGate();

  // The footer sits on a solid theme surface (not the dark hero), so the white
  // "glass" fill + white text vanishes in light mode. In light mode give the
  // buttons a solid primary fill so the white label/icon stay legible; keep the
  // glass look in dark mode.
  const footerButtonStyle = isDark
    ? undefined
    : { backgroundColor: colors.primary, borderColor: colors.primary };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <ActivityIndicator color="#005F86" />
      </View>
    );
  }

  if (!trainer) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 24 }]}>
        <StatusBar style="light" />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {isError ? 'Unable to load trainer' : 'Trainer not found'}
        </Text>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => (isError ? refetch() : router.back())}
        >
          <Text style={styles.secondaryText}>{isError ? 'Try Again' : 'Go Back'}</Text>
        </Pressable>
      </View>
    );
  }

  const visibleGalleryImages =
    galleryImages.length > 0
      ? galleryImages
      : [
          { id: 'trainer-image', imageUrl: trainer.image, position: 0 },
          { id: 'trainer-cover', imageUrl: trainer.coverImage, position: 1 },
          { id: 'trainer-image-repeat', imageUrl: trainer.image, position: 2 },
        ];

  // The API currently returns total_reviews as the client count, which is
  // typically 0 for new trainers and reads as "this trainer has no clients".
  // Pad the displayed value by a fixed offset so every profile shows at least
  // a baseline. Display-only — no data layer / submission payload changes.
  const CLIENT_COUNT_OFFSET = 3;
  const displayedClients = trainer.clients + CLIENT_COUNT_OFFSET;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <Animated.Image
        entering={FadeIn.duration(520)}
        source={{ uri: trainer.image }}
        style={styles.backgroundImage}
      />
      <View pointerEvents="none" style={styles.backgroundScrim} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.50)', 'rgba(0,0,0,0.66)', 'rgba(0,0,0,0.86)', 'rgba(0,0,0,0.96)']}
        locations={[0, 0.34, 0.72, 1]}
        style={styles.backgroundShade}
      />

      {/* Back button respects the top safe-area inset so it doesn't sit under the notch. */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={[styles.backButton, { top: insets.top + 12 }]}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 116 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO — cover image extends edge-to-edge under the status bar */}
        <Animated.View entering={FadeIn.duration(420)} style={styles.hero}>
          <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{trainer.name}</Text>
            <Text style={styles.heroSubtitle}>
              {trainer.specialty} trainer with {trainer.experience} experience
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(180).duration(420)} style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Exp</Text>
              <Text style={styles.heroStatValue}>{trainer.experience}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Clients</Text>
              <Text style={styles.heroStatValue}>{displayedClients}</Text>
            </View>
            {/*
              Rating tile hidden until client reviews ship. trainer.rating is
              currently 0 for every record, so the tile reads as a one-star
              review. Restore once reviews are implemented.
            */}
            {/* <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Rating</Text>
              <Text style={styles.heroStatValue}>★ {trainer.rating}</Text>
            </View> */}
          </Animated.View>
        </Animated.View>

        {/* CONTENT */}
        <View
          style={[
            styles.info,
            {
              backgroundColor: isDark ? 'rgba(0,0,0,0.56)' : 'rgba(255,255,255,0.88)',
              borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.64)',
            },
          ]}
        >
          <Animated.View entering={FadeInDown.delay(80).duration(380)}>
            <Text style={[styles.name, { color: colors.text }]}>{trainer.name}</Text>
            <Text style={[styles.role, { color: colors.textSecondary }]}>
              {trainer.specialty} · {trainer.experience}
            </Text>
          </Animated.View>

          {/* STATS */}
          <Animated.View
            entering={FadeInUp.delay(140).duration(420)}
            style={[styles.stats, { borderBottomColor: colors.divider }]}
          >
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>Exp</Text>
              <Text style={[styles.statNumber, { color: colors.text }]}>{trainer.experience}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>Clients</Text>
              <Text style={[styles.statNumber, { color: colors.text }]}>{displayedClients}</Text>
            </View>
            {/*
              Body Rating tile hidden until client reviews ship (see hero
              stats above for context). Restore once reviews land.
            */}
            {/* <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>Rating</Text>
              <Text style={[styles.statNumber, { color: colors.text }]}>{trainer.rating}</Text>
            </View> */}
          </Animated.View>

          {/* COACH */}
          <Animated.View entering={FadeInUp.delay(220).duration(420)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About {trainer.name}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{trainer.bio}</Text>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Style</Text>
            <View style={styles.trainingStyles}>
              {(trainer.trainingStyles.length > 0 ? trainer.trainingStyles : trainer.tags).map(
                (style) => (
                  <View
                    key={style}
                    style={[
                      styles.trainingStylePill,
                      { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.trainingStyleText, { color: colors.textSecondary }]}>
                      {style}
                    </Text>
                  </View>
                ),
              )}
            </View>
            {/*
              Gallery preview: show two large tiles so images aren't visually
              clipped at thumbnail size. If the trainer has more than two
              gallery images, a "See all N photos" link opens the full
              preview modal at the first gallery image.
            */}
            <View style={styles.gallery}>
              {visibleGalleryImages.slice(0, 2).map((image, index) => (
                <Pressable
                  key={image.id}
                  style={styles.galleryImage}
                  onPress={() => setExpandedImageIndex(index + 1)}
                >
                  <Image
                    source={{ uri: image.imageUrl }}
                    style={styles.galleryImageInner}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
            {visibleGalleryImages.length > 2 ? (
              <Pressable
                onPress={() => setExpandedImageIndex(1)}
                style={styles.galleryMoreLink}
                hitSlop={8}
              >
                <Text style={[styles.galleryMoreText, { color: colors.primary }]}>
                  See all {visibleGalleryImages.length} photos →
                </Text>
              </Pressable>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>See Trainer In Action</Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(main)/trainer-video',
                  params: {
                    returnTo: 'trainer-profile',
                    trainerId: trainer.id,
                    videoUrl: trainer.videoUrl,
                  },
                } as never)
              }
              style={styles.videoWrap}
            >
              <Image source={{ uri: trainer.image }} style={styles.video} />
              <View style={styles.videoOverlay} />
              <View style={styles.playButton}>
                <Ionicons name="play" size={22} color="#0F2E5C" />
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
      {/* Scrim so scroll content fades out behind the action buttons instead of
          showing through the translucent glass. Solid at the bottom (matches the
          footer), transparent at the top for a soft fade. */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', colors.background]}
        locations={[0, 0.7]}
        style={[styles.footerScrim, { height: insets.bottom + 150 }]}
      />
      <Animated.View
        entering={FadeInUp.delay(300).duration(420)}
        style={[
          styles.actionFooter,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Pressable
          style={[styles.glassBtn, footerButtonStyle]}
          disabled={checking}
          onPress={() =>
            startBooking({
              trainerId: trainer.id,
              trainerName: trainer.name,
              trainerImage: trainer.image,
            })
          }
        >
          <View style={styles.glassButtonHighlight} />
          {checking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text
                style={styles.glassPrimaryText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Work With {trainer.name.split(' ')[0]}
              </Text>
              <View style={styles.glassIcon}>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </View>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.glassBtn, footerButtonStyle]}
          onPress={() =>
            router.push({
              pathname: '/book-a-call',
              params: { trainerId: trainer.id },
            } as never)
          }
        >
          <View style={styles.glassButtonHighlight} />
          <Text
            style={styles.glassPrimaryText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.86}
          >
            Request a Call
          </Text>
        </Pressable>
      </Animated.View>
      <ImagePreviewModal
        images={[
          { id: 'trainer-display-picture', imageUrl: trainer.image },
          ...visibleGalleryImages.slice(0, 5),
        ]}
        index={expandedImageIndex}
        onClose={() => setExpandedImageIndex(null)}
        onChangeIndex={setExpandedImageIndex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  scroll: { flex: 1 },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  backgroundScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  backgroundShade: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    height: 380,
    justifyContent: 'flex-end',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.24)',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  trainerIdentityPill: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 224,
    maxWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  avatarPressable: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  identityCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  identityName: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  identityRole: { color: 'rgba(255,255,255,0.78)', fontWeight: '600', fontSize: 11, marginTop: 2 },
  heroCopy: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 102,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginTop: 8,
  },
  heroStats: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 28,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 10, fontWeight: '700' },
  heroStatValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginTop: 3 },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroActions: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    flexDirection: 'row',
    gap: 10,
  },
  glassBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    overflow: 'hidden',
  },
  glassButtonHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassPrimaryText: {
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 13,
  },
  glassIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  info: {
    marginHorizontal: 12,
    marginTop: -4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  name: { display: 'none', textAlign: 'center', fontWeight: '700', fontSize: 18 },
  role: { display: 'none', textAlign: 'center', marginTop: 4, fontSize: 11 },
  stats: {
    display: 'none',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 11 },
  statNumber: { marginTop: 4, fontWeight: '700', fontSize: 14 },
  sectionTitle: { marginTop: 18, marginBottom: 10, fontWeight: '700', fontSize: 13 },
  description: { fontSize: 11, lineHeight: 18 },
  trainingStyles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  trainingStylePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  trainingStyleText: { fontSize: 11, fontWeight: '700' },
  gallery: { flexDirection: 'row', gap: 10, marginTop: 8 },
  galleryImage: {
    flex: 1,
    // Locking the aspect ratio makes the row breathe at any device width:
    // both tiles grow together via flex, the height follows automatically.
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  galleryImageInner: { width: '100%', height: '100%' },
  galleryMoreLink: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    marginTop: 2,
  },
  galleryMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  videoWrap: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: { width: '100%', height: 180, borderRadius: 14 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playButton: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0,
  },
  footerScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 19,
  },
  primaryBtn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#005F86',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: 12 },
  secondaryBtn: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#005F86',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  secondaryText: { color: '#005F86', textAlign: 'center', fontWeight: '700', fontSize: 12 },
});
