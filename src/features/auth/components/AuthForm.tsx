import { Ionicons } from '@expo/vector-icons';
import appleAuthLib from '@invertase/react-native-apple-authentication';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Href, router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/shared/api/types';
import { SocialButton, toast, Typography } from '@/shared/components';
import { fonts, palette, useTheme } from '@/shared/theme';

import { useAppleAuth } from '../hooks/useAppleAuth';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

const MESSAGES = {
  noIdToken: "We couldn't get a sign-in token from Google. Please try again.",
  playServicesMissing: 'Google Play Services is unavailable on this device.',
  googleGeneric: "Google sign-in didn't work. Please try again.",
  noAppleToken: "We couldn't get a sign-in token from Apple. Please try again.",
  appleGeneric: "Apple sign-in didn't work. Please try again.",
  apiUnauthorized: "We couldn't verify your Google account. Please try again.",
  apiUnavailable: 'Sign-in is temporarily unavailable. Please try again in a few minutes.',
  apiServerError: "Something went wrong on our end. We're on it — please try again shortly.",
  apiGeneric: "We couldn't sign you in. Please try again.",
};

function friendlyApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return MESSAGES.apiUnauthorized;
    if (error.status === 503) return MESSAGES.apiUnavailable;
    if (error.status >= 500) return MESSAGES.apiServerError;
  }
  return MESSAGES.apiGeneric;
}

const GOOGLE_ICON = require('../../../../assets/images/google.png');
const TERMS_ROUTE = '/terms-of-service' as Href;
const PRIVACY_ROUTE = '/privacy-policy' as Href;

type AuthFormVariant = 'signup' | 'signin';

interface AuthFormProps {
  variant: AuthFormVariant;
  /**
   * When true, render text against a dark/photo backdrop — overrides the
   * theme's `textSecondary` with a high-contrast off-white so the "already
   * have an account" prompt stays readable on the auth-bg image.
   */
  onDark?: boolean;
}

export function AuthForm({ variant, onDark }: AuthFormProps) {
  const { spacing, colors } = useTheme();
  const secondaryColor = onDark ? 'rgba(255,255,255,0.78)' : colors.textSecondary;
  const linkColor = onDark ? '#FFFFFF' : palette.highlightBlue['5'];
  const googleAuth = useGoogleAuth();
  const appleAuth = useAppleAuth();
  const [isGoogleFlowPending, setIsGoogleFlowPending] = useState(false);
  const [isAppleFlowPending, setIsAppleFlowPending] = useState(false);

  const verb = variant === 'signup' ? 'Sign Up' : 'Sign In';
  const footerText = variant === 'signup' ? 'Already have an account? ' : "Don't have an account? ";
  const footerLinkLabel = variant === 'signup' ? 'Log in' : 'Sign up';
  const footerHref = variant === 'signup' ? '/(auth)/login' : '/(auth)/register';

  const handleGoogle = async () => {
    if (isGoogleFlowPending || googleAuth.isPending) return;

    setIsGoogleFlowPending(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => undefined);
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return;
      const idToken = response.data.idToken;
      if (!idToken) {
        toast.error(MESSAGES.noIdToken);
        return;
      }
      googleAuth.mutate(idToken, {
        onError: (error) => {
          toast.error(friendlyApiMessage(error));
        },
      });
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        if (error.code === statusCodes.IN_PROGRESS) {
          toast.info('Google sign-in is already open. Please finish or try again.');
          return;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          toast.error(MESSAGES.playServicesMissing);
          return;
        }
      }
      toast.error(MESSAGES.googleGeneric);
    } finally {
      setIsGoogleFlowPending(false);
    }
  };

  const handleApple = async () => {
    if (isAppleFlowPending || appleAuth.isPending) return;

    setIsAppleFlowPending(true);
    try {
      const credential = await appleAuthLib.performRequest({
        requestedOperation: appleAuthLib.Operation.LOGIN,
        // FULL_NAME must be requested before EMAIL for consistent results.
        requestedScopes: [appleAuthLib.Scope.FULL_NAME, appleAuthLib.Scope.EMAIL],
      });

      const identityToken = credential.identityToken;
      if (!identityToken) {
        toast.error(MESSAGES.noAppleToken);
        return;
      }

      // Apple only returns the name on the first authorization; forward it when
      // present so the backend can persist it.
      const fullName =
        [credential.fullName?.givenName, credential.fullName?.familyName]
          .filter(Boolean)
          .join(' ')
          .trim() || null;

      appleAuth.mutate(
        { identityToken, fullName },
        {
          onError: (error) => {
            toast.error(friendlyApiMessage(error));
          },
        },
      );
    } catch (error) {
      // User dismissed the native sheet — not an error worth surfacing.
      if ((error as { code?: string }).code === appleAuthLib.Error.CANCELED) {
        return;
      }
      toast.error(MESSAGES.appleGeneric);
    } finally {
      setIsAppleFlowPending(false);
    }
  };

  return (
    <View style={[styles.container, { gap: spacing.md }]}>
      <SocialButton
        icon={<Image source={GOOGLE_ICON} style={styles.icon} resizeMode="contain" />}
        label={`${verb} with Google`}
        onPress={handleGoogle}
        disabled={googleAuth.isPending || isGoogleFlowPending}
      />

      {Platform.OS === 'ios' && appleAuthLib.isSupported ? (
        <SocialButton
          icon={<Ionicons name="logo-apple" size={20} color="#FFFFFF" />}
          label={`${verb} with Apple`}
          onPress={handleApple}
          disabled={appleAuth.isPending || isAppleFlowPending}
        />
      ) : null}

      <View style={[styles.footer, { marginTop: spacing.md }]}>
        <Typography style={[styles.footerText, { color: secondaryColor }]}>{footerText}</Typography>
        <Pressable onPress={() => router.replace(footerHref)}>
          <Typography style={[styles.link, { color: linkColor }]}>{footerLinkLabel}</Typography>
        </Pressable>
      </View>
    </View>
  );
}

export function AuthLegalNotice({ variant, onDark }: AuthFormProps) {
  const { colors } = useTheme();
  const verb = variant === 'signup' ? 'Sign Up' : 'Sign In';
  const bodyColor = onDark ? 'rgba(255,255,255,0.72)' : colors.textSecondary;
  const linkColor = onDark ? '#FFFFFF' : palette.highlightBlue['5'];

  return (
    <Typography style={[styles.legalText, { color: bodyColor }]}>
      By clicking &quot;{verb}&quot;, I have read and agree with the{' '}
      <Typography
        style={[styles.legalLink, { color: linkColor }]}
        onPress={() => router.push(TERMS_ROUTE)}
      >
        Terms of Service
      </Typography>{' '}
      and{' '}
      <Typography
        style={[styles.legalLink, { color: linkColor }]}
        onPress={() => router.push(PRIVACY_ROUTE)}
      >
        Privacy Policy
      </Typography>
    </Typography>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  icon: { width: 20, height: 20 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  link: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: palette.highlightBlue['5'],
  },
  legalText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  legalLink: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    lineHeight: 20,
    color: palette.highlightBlue['5'],
  },
});
