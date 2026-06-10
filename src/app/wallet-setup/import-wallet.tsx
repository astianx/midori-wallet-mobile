import { SeedPhrase } from '@/components/SeedPhrase';
import { validateMnemonic } from 'bip39';
import * as Clipboard from 'expo-clipboard';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { ChevronLeft, Download, FileText, ScanText } from 'lucide-react-native';
import React, { useState } from 'react';
import { colors } from '@/constants/colors';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { ONBOARDING_COPY } from '../../../../shared/wallet/product-copy';

type SecretPhraseWordCount = 12 | 24;

const SUPPORTED_WORD_COUNTS: SecretPhraseWordCount[] = [12, 24];

function createEmptyWords(count: SecretPhraseWordCount) {
  return Array(count).fill('');
}

function normalizePhraseWords(words: string[]) {
  return words.map(word => word.trim().toLowerCase()).filter(Boolean);
}

export default function ImportWalletScreen() {
  const router = useDebouncedNavigation();
  const insets = useSafeAreaInsets();
  const [wordCount, setWordCount] = useState<SecretPhraseWordCount>(12);
  const [secretWords, setSecretWords] = useState<string[]>(() => createEmptyWords(12));

  const handleWordCountChange = (nextWordCount: SecretPhraseWordCount) => {
    setWordCount(nextWordCount);
    setSecretWords(currentWords => {
      const nextWords = createEmptyWords(nextWordCount);
      currentWords.slice(0, nextWordCount).forEach((word, index) => {
        nextWords[index] = word;
      });
      return nextWords;
    });
  };

  const handleWordChange = (index: number, text: string) => {
    const newWords = [...secretWords];
    newWords[index] = text.trim().toLowerCase();
    setSecretWords(newWords);
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();

      if (!clipboardContent.trim()) {
        toast.error('Empty Clipboard! No text found in clipboard');
        return;
      }

      const words = normalizePhraseWords(clipboardContent.trim().split(/\s+/));

      if (!SUPPORTED_WORD_COUNTS.includes(words.length as SecretPhraseWordCount)) {
        toast.error(
          `Invalid phrase. Found ${words.length} words; Midori Wallet supports 12 or 24 words.`
        );
        return;
      }

      const nextWordCount = words.length as SecretPhraseWordCount;
      const newWords = createEmptyWords(nextWordCount);
      words.forEach((word, index) => {
        if (index < nextWordCount) {
          newWords[index] = word.toLowerCase().trim();
        }
      });
      setWordCount(nextWordCount);
      setSecretWords(newWords);

      toast.success(`${nextWordCount} words have been pasted from clipboard`);
    } catch (error) {
      console.error('Paste error:', error);
      toast.error('Could not paste from clipboard');
    }
  };

  const handleScanText = () => {
    Alert.alert('Scan Text', 'Camera functionality would open here to scan QR code or text', [
      { text: 'OK' },
    ]);
  };

  const isFormValid = () => {
    return secretWords.length === wordCount && secretWords.every(word => word.trim().length > 0);
  };

  const validateSeedPhrase = (phrase: string): boolean => {
    const words = phrase
      .trim()
      .split(' ')
      .filter(word => word.length > 0);

    if (!SUPPORTED_WORD_COUNTS.includes(words.length as SecretPhraseWordCount)) {
      return false;
    }

    return validateMnemonic(words.join(' '));
  };

  const handleImportWallet = () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete', `Please fill in all ${wordCount} words of your secret phrase`, [
        { text: 'OK' },
      ]);
      return;
    }

    // Join the words into a seed phrase
    const seedPhrase = secretWords.join(' ');

    // Validate the seed phrase
    if (!validateSeedPhrase(seedPhrase)) {
      Alert.alert(
        'Invalid Seed Phrase',
        'Please check your seed phrase. Make sure all words are spelled correctly and contain only lowercase letters.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to name wallet screen with the seed phrase
    router.push({
      pathname: './import-name-wallet',
      params: { seedPhrase: encodeURIComponent(seedPhrase) },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{ONBOARDING_COPY.importWallet}</Text>
          <Text style={styles.subtitle}>{ONBOARDING_COPY.sharedRestoreDescription}</Text>

          <View style={styles.wordCountSelector}>
            {SUPPORTED_WORD_COUNTS.map(count => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.wordCountButton,
                  wordCount === count && styles.wordCountButtonActive,
                ]}
                onPress={() => handleWordCountChange(count)}
              >
                <Text
                  style={[
                    styles.wordCountText,
                    wordCount === count && styles.wordCountTextActive,
                  ]}
                >
                  {count} words
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <SeedPhrase words={secretWords} editable={true} onWordChange={handleWordChange} />

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePaste}>
              <FileText size={20} color={colors.primary} />
              <Text style={styles.actionButtonText}>Paste</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleScanText}>
              <ScanText size={20} color={colors.primary} />
              <Text style={styles.actionButtonText}>Scan Text</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.importButton, !isFormValid() && styles.importButtonDisabled]}
          onPress={handleImportWallet}
        >
          <Download size={20} color={isFormValid() ? colors.black : colors.textTertiary} />
          <Text
            style={[styles.importButtonText, !isFormValid() && styles.importButtonTextDisabled]}
          >
            {ONBOARDING_COPY.importWallet}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: colors.primary,
    fontSize: 16,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  wordCountSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  wordCountButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingVertical: 10,
  },
  wordCountButtonActive: {
    backgroundColor: colors.primary,
  },
  wordCountText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  wordCountTextActive: {
    color: colors.black,
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tintedBackground,
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  importButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  importButtonDisabled: {
    backgroundColor: colors.card,
  },
  importButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
  },
  importButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
