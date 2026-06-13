import { Ionicons } from '@expo/vector-icons';
import { FlashList, type FlashListProps, type FlashListRef } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Animated, {
  type AnimatedProps,
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClientAvatarStack } from '@/features/trainers/components/ClientAvatarStack';
import { TrainerImageSlider } from '@/features/trainers/components/TrainerImageSlider';
import { useInfiniteTrainers } from '@/features/trainers/hooks/useInfiniteTrainers';
import type { Trainer } from '@/features/trainers/types/trainer.types';
import { Avatar, Typography } from '@/shared/components';
import { useStatusBarStyle } from '@/shared/hooks/useStatusBarStyle';
import { useTheme } from '@/shared/theme';

import { useHome } from '../hooks/useHome';
import { HERO_GRADIENT, useHomeStyles } from './HomeScreen.styles';

// Wrap FlashList with reanimated so `onScroll` can drive the shared value.
// The generic re-cast keeps `data` / `renderItem` typed against Trainer.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList,
) as unknown as React.ForwardRefExoticComponent<
  AnimatedProps<FlashListProps<Trainer>> & React.RefAttributes<FlashListRef<Trainer>>
>;

// Ordered by user priority for the home view: strength and cardio (the
// dominant goals for weight-training and weight-loss users) come first.
// Yoga is intentionally not surfaced here.
const CATEGORIES = [
  {
    label: 'Strength',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=300',
  },
  {
    label: 'Cardio',
    image: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?q=80&w=300',
  },
  {
    label: 'Endurance',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=300',
  },
  {
    label: 'Mobility',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=300',
  },
] as const;

const ENTRY_DURATION = 420;
// Cap entrance-animation delay so cards loaded on later pages don't fly in
// seconds late — the user perceives that as a slow/stuck scroll.
const MAX_ENTRY_INDEX = 5;

const HERO_IMAGE = require('../../../../assets/images/hero-trainers.png');
const LOGO = require('../../../../assets/images/logo.png');
const HOME_BACKGROUND_IMAGE = require('../../../../assets/images/auth-bg.jpg');

function getTimeOfDayGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good Morning';
  }

  if (hour < 17) {
    return 'Good Afternoon';
  }

  return 'Good Evening';
}

interface TrainerListItemProps {
  trainer: Trainer;
}

// Memoized so existing cards don't re-render when the parent's state changes
// (selected category, refetch flags, etc.). Combined with FlatList
// virtualization, only on-screen cards do any work per scroll frame.
const TrainerListItem = React.memo(function TrainerListItem({ trainer }: TrainerListItemProps) {
  const styles = useHomeStyles();
  const firstName = trainer.name.split(' ')[0] || 'Trainer';

  const handleBook = (event: GestureResponderEvent) => {
    event.stopPropagation();
    router.push({
      pathname: '/book-a-session',
      params: { trainerId: trainer.id },
    } as never);
  };

  return (
    <View style={styles.trainerCard}>
      <Pressable
        style={styles.trainerPressable}
        onPress={() =>
          router.push({
            pathname: '/(main)/trainer-profile',
            params: { trainerId: trainer.id },
          } as never)
        }
      >
        <TrainerImageSlider
          trainerId={trainer.id}
          fallbackImage={trainer.image}
          style={styles.trainerImage}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.14)', 'rgba(0,0,0,0.88)']}
          locations={[0, 0.58, 1]}
          style={styles.trainerImageOverlay}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.7 }}
          style={styles.trainerGlassSheen}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.70)']}
          locations={[0, 0.55, 1]}
          style={styles.trainerBottomGlass}
        />
        {/*
          Rating badge hidden until the client-reviews feature ships. The API
          currently returns 0 for every trainer (no review records yet), and a
          "★ 0" badge reads as a one-star review instead of "no reviews". Drop
          back in when reviews are implemented.
        */}
        {/* <View style={styles.trainerRatingBadge}>
          <Typography style={styles.trainerRating}>★ {trainer.rating}</Typography>
        </View> */}
        <View style={styles.trainerBody}>
          <View style={styles.trainerInfoColumn}>
            <Typography style={styles.trainerName} numberOfLines={1}>
              {trainer.name}
            </Typography>
            <ClientAvatarStack
              avatars={trainer.clientAvatars}
              totalClients={trainer.clients}
              textColor="rgba(255,255,255,0.72)"
              borderColor="rgba(255,255,255,0.68)"
            />
          </View>
          <Pressable style={styles.workWithButton} onPress={handleBook}>
            <LinearGradient
              colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.workWithGlass}
            />
            <Typography
              style={styles.workWithText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              Work With {firstName}
            </Typography>
            <View style={styles.workWithIcon}>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
});

export function HomeScreen() {
  const { spacing, colors } = useTheme();
  const styles = useHomeStyles();
  const statusBarStyle = useStatusBarStyle();
  const { user } = useHome();
  const displayName = user?.name ?? '';
  const greeting = getTimeOfDayGreeting();
  const trainerListRef = useRef<FlashListRef<Trainer>>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Always pass `null` so the query key is stable across category switches —
  // we fetch the trainer list once and filter on the client. Previously each
  // category produced its own react-query cache entry, which meant tapping a
  // chip triggered a fresh request + loading state every time.
  const {
    data: trainerPages,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteTrainers(null);
  const allTrainers = useMemo(
    () => trainerPages?.pages.flatMap((page) => page.trainers) ?? [],
    [trainerPages],
  );
  const trainers = useMemo(() => {
    if (!selectedCategory) return allTrainers;
    const needle = selectedCategory.toLowerCase();
    return allTrainers.filter((t) => {
      const specialty = t.specialty?.toLowerCase() ?? '';
      const tags = (t.tags ?? []).map((tag) => tag.toLowerCase());
      return specialty.includes(needle) || tags.includes(needle);
    });
  }, [allTrainers, selectedCategory]);
  const showTrainerLoading = isLoading && trainers.length === 0;
  const showLoadMore = isFetchingNextPage && trainers.length > 0;

  const scrollY = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const refreshLogoVisibility = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const selectCategory = useCallback(
    (category: string | null) => {
      trainerListRef.current?.scrollToOffset({ offset: 0, animated: false });
      scrollY.value = 0;
      setSelectedCategory((current) => (current === category ? null : category));
    },
    [scrollY],
  );

  useEffect(() => {
    logoRotation.value = withRepeat(
      withTiming(360, {
        duration: 1100,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [logoRotation]);

  useEffect(() => {
    refreshLogoVisibility.value = withTiming(isRefetching ? 1 : 0, { duration: 160 });
  }, [isRefetching, refreshLogoVisibility]);

  // Header fades + scales slightly as the user scrolls.
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [1, 0.65], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(scrollY.value, [0, 80], [1, 0.96], Extrapolation.CLAMP),
      },
    ],
  }));

  // Hero parallax + opacity ramp on scroll.
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(scrollY.value, [-100, 0, 220], [-30, 0, 60], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(scrollY.value, [0, 220], [1, 0.97], Extrapolation.CLAMP),
      },
    ],
    opacity: interpolate(scrollY.value, [0, 140, 240], [1, 0.85, 0.55], Extrapolation.CLAMP),
  }));

  const loaderLogoStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${logoRotation.value}deg` }],
  }));

  const refreshLogoStyle = useAnimatedStyle(() => {
    const pullVisibility = interpolate(scrollY.value, [-70, -24], [1, 0], Extrapolation.CLAMP);
    const visibility = Math.max(pullVisibility, refreshLogoVisibility.value);

    return {
      opacity: visibility,
      transform: [
        {
          translateY: interpolate(scrollY.value, [-110, 0], [74, 40], Extrapolation.CLAMP),
        },
        { scale: interpolate(visibility, [0, 1], [0.86, 1], Extrapolation.CLAMP) },
        { rotate: `${logoRotation.value}deg` },
      ],
    };
  });

  const refreshVeilStyle = useAnimatedStyle(() => {
    const pullVisibility = interpolate(scrollY.value, [-70, -24], [1, 0], Extrapolation.CLAMP);
    const visibility = Math.max(pullVisibility, refreshLogoVisibility.value);

    return {
      opacity: interpolate(visibility, [0, 1], [0, 0.62], Extrapolation.CLAMP),
    };
  });

  const renderItem = useCallback(
    ({ item, index }: { item: Trainer; index: number }) => (
      <Animated.View
        entering={FadeInUp.delay(Math.min(index, MAX_ENTRY_INDEX) * 70)
          .duration(420)
          .springify()
          .damping(18)
          .stiffness(160)}
        style={styles.trainerCell}
      >
        <TrainerListItem trainer={item} />
      </Animated.View>
    ),
    [styles.trainerCell],
  );

  const ListHeader = (
    <View style={styles.listHeaderInset}>
      {/* HEADER — outer wrapper owns the entry animation, inner owns the scroll-driven style */}
      <Animated.View
        entering={FadeInDown.duration(ENTRY_DURATION)}
        style={{ marginTop: spacing.sm }}
      >
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <Pressable
            style={styles.headerLeft}
            onPress={() => router.push('/(main)/(tabs)/profile' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            hitSlop={8}
          >
            <Avatar name={displayName} uri={user?.avatarUrl} size={40} />
            <View style={{ marginLeft: spacing.sm }}>
              <Typography style={styles.greeting}>Hi, {greeting}!</Typography>
              <Typography style={styles.userName}>{displayName}</Typography>
            </View>
          </Pressable>
          <Pressable
            hitSlop={8}
            style={styles.bellButton}
            onPress={() => router.push('/(main)/notifications' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* HERO — same split: outer = entering, inner = scroll-driven */}
      <Animated.View
        entering={FadeInUp.delay(100).duration(ENTRY_DURATION)}
        style={{ marginTop: spacing.lg }}
      >
        <Animated.View style={heroAnimatedStyle}>
          <LinearGradient
            colors={HERO_GRADIENT}
            locations={[0, 0.55, 1]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroLeft}>
              <Typography style={styles.heroTitle}>Your Fitness Journey Starts Here</Typography>
              <Typography style={styles.heroText}>
                Explore training programs built around your goals and routine.
              </Typography>
            </View>

            {/* Alpha-channel PNG — fuses with the gradient naturally, no overlay needed. */}
            <Image source={HERO_IMAGE} style={styles.heroImage} />
          </LinearGradient>
        </Animated.View>
      </Animated.View>

      {/* CATEGORIES */}
      <Animated.View entering={FadeIn.delay(200).duration(ENTRY_DURATION)}>
        <Typography style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Categories</Typography>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          <Pressable
            style={[styles.categoryItem, selectedCategory === null && styles.categoryItemSelected]}
            onPress={() => selectCategory(null)}
            accessibilityRole="button"
            accessibilityLabel="Show all trainers"
            accessibilityState={{ selected: selectedCategory === null }}
          >
            <View
              style={[
                styles.categoryIconBadge,
                selectedCategory === null && styles.categoryIconBadgeSelected,
              ]}
            >
              <Image source={HERO_IMAGE} style={styles.categoryBadgeImage} />
            </View>
            <Typography
              style={[
                styles.categoryText,
                selectedCategory === null && styles.categoryTextSelected,
              ]}
            >
              All
            </Typography>
          </Pressable>
          {CATEGORIES.map((category, index) => {
            const isSelected = selectedCategory === category.label;

            return (
              <Animated.View
                key={category.label}
                entering={FadeInUp.delay(220 + index * 40).duration(ENTRY_DURATION)}
              >
                <Pressable
                  style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                  onPress={() => selectCategory(category.label)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${category.label} trainers`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[
                      styles.categoryIconBadge,
                      isSelected && styles.categoryIconBadgeSelected,
                    ]}
                  >
                    <Image source={{ uri: category.image }} style={styles.categoryBadgeImage} />
                  </View>
                  <Typography
                    style={[styles.categoryText, isSelected && styles.categoryTextSelected]}
                  >
                    {category.label}
                  </Typography>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* TRAINERS TITLE */}
      <Animated.View entering={FadeIn.delay(400).duration(ENTRY_DURATION)}>
        <Typography style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          {selectedCategory ? `${selectedCategory} Trainers` : 'Trainers'}
        </Typography>
      </Animated.View>
    </View>
  );

  const ListEmpty = (
    <View style={styles.emptyTrainers}>
      {showTrainerLoading ? (
        <>
          <Animated.Image source={LOGO} style={[styles.inlineLoadingLogo, loaderLogoStyle]} />
          <Typography style={styles.emptyTrainersText}>Loading trainers...</Typography>
        </>
      ) : (
        <Typography style={styles.emptyTrainersText}>
          {selectedCategory ? 'No trainers found for this category.' : 'No trainers available yet.'}
        </Typography>
      )}
    </View>
  );

  const ListFooter = showLoadMore ? (
    <View style={styles.emptyTrainers}>
      <Animated.Image source={LOGO} style={[styles.inlineLoadingLogo, loaderLogoStyle]} />
      <Typography style={styles.emptyTrainersText}>Loading more trainers...</Typography>
    </View>
  ) : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={statusBarStyle} />
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <Image
          source={HOME_BACKGROUND_IMAGE}
          style={styles.backgroundTrainerImage}
          resizeMode="cover"
          blurRadius={1.4}
        />
        <View style={styles.backgroundWash} />
        <LinearGradient
          colors={[
            colors.background,
            'rgba(128,128,128,0.18)',
            colors.background,
            colors.background,
          ]}
          locations={[0, 0.42, 0.78, 1]}
          style={styles.backgroundGradient}
        />
      </View>
      <Animated.View pointerEvents="none" style={[styles.refreshVeil, refreshVeilStyle]} />
      <Animated.View pointerEvents="none" style={[styles.refreshLogoLayer, refreshLogoStyle]}>
        <Animated.Image source={LOGO} style={styles.refreshLogo} />
      </Animated.View>

      <AnimatedFlashList
        ref={trainerListRef}
        data={trainers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
            progressViewOffset={-1000}
          />
        }
      />
    </SafeAreaView>
  );
}
