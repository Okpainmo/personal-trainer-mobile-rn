import React, { useState } from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';

import { Typography } from '@/shared/components';
import { fonts, useTheme } from '@/shared/theme';

import { CLIENT_AVATAR_FALLBACK } from '../api/trainers.api';

interface Props {
  // Each item is either a remote URI string or a local-bundle asset id from
  // require(). Image's source prop handles both shapes.
  avatars: (string | number)[];
  totalClients: number;
  size?: number;
  maxVisible?: number;
  textColor?: string;
  borderColor?: string;
}

function toSource(item: string | number): ImageSourcePropType {
  return typeof item === 'string' ? { uri: item } : item;
}

interface AvatarSlotProps {
  item: string | number;
  style: StyleProp<ImageStyle>;
}

// Per-slot Image that swaps to the local fallback if the remote URL fails
// to load. Tracking the failure inside a small subcomponent gives us
// independent onError state per avatar without the parent re-rendering
// the whole stack.
function AvatarSlot({ item, style }: AvatarSlotProps) {
  const [failed, setFailed] = useState(false);
  const source = failed ? CLIENT_AVATAR_FALLBACK : toSource(item);
  return <Image source={source} style={style} onError={() => setFailed(true)} />;
}

export function ClientAvatarStack({
  avatars,
  totalClients,
  size = 22,
  maxVisible = 4,
  textColor,
  borderColor,
}: Props) {
  const visible = avatars.slice(0, maxVisible);
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.stack}>
        {visible.map((item, i) => (
          <AvatarSlot
            key={`${String(item)}-${i}`}
            item={item}
            style={[
              styles.avatar,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: i === 0 ? 0 : -size / 2.4,
                zIndex: visible.length - i,
                borderColor: borderColor ?? colors.background,
                backgroundColor: colors.surfaceMuted,
              },
            ]}
          />
        ))}
      </View>
      <Typography style={[styles.count, { color: textColor ?? colors.textSecondary }]}>
        {totalClients}+ Clients
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stack: {
    flexDirection: 'row',
  },
  avatar: {
    borderWidth: 1.5,
  },
  count: {
    fontSize: 10,
    fontFamily: fonts.regular,
  },
});
