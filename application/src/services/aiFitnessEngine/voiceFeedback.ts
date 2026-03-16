/**
 * AI Fitness Engine - Voice Feedback Service
 *
 * Goals:
 * - No overlap between utterances
 * - Rep counts interrupt immediately and are always spoken in English
 * - Critical alerts can interrupt
 * - Normal coaching stays calm and queued
 * - Smart throttling to avoid repetitive / annoying feedback
 *
 * Improvements in this version:
 * - Safe queue cancellation (no hanging promises)
 * - Stale queued messages are dropped automatically
 * - Better duplicate prevention (current + queued)
 * - Better voice selection by language + gender
 * - More resilient speech lifecycle handling
 * - Public configuration helpers for language / defaults
 */

import * as Speech from 'expo-speech';
import { getFeedbackForCode } from './feedbackMapping';

export type VoiceGender = 'male' | 'female';

export interface VoiceFeedbackOptions {
  gender?: VoiceGender;
  rate?: number;
  pitch?: number;
  language?: string; // e.g. 'en-US'
  force?: boolean;   // bypass throttling
  maxAgeMs?: number; // drop queued message if it becomes stale
}

type QueueItem = {
  id: number;
  message: string;
  normalizedMessage: string;
  category: FeedbackCategory;
  options: VoiceFeedbackOptions;
  enqueuedAt: number;
  maxAgeMs: number;
  resolve: () => void;
  reject: (e: unknown) => void;
};

type ActiveSpeech = {
  id: number;
  normalizedMessage: string;
  resolve: () => void;
  reject: (e: unknown) => void;
  didStart: boolean;
};

type FeedbackCategory =
  | 'count'
  | 'critical'
  | 'setup'
  | 'success'
  | 'correction';

class VoiceFeedbackService {
  private availableVoices: Speech.Voice[] = [];
  private voiceCache = new Map<string, string | undefined>();

  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  // Calm defaults
  private defaultGender: VoiceGender = 'female';
  private defaultRate = 0.92;
  private defaultPitch = 1.0;
  private defaultLanguage = 'en-US';

  // Queue / pacing
  private queue: QueueItem[] = [];
  private isSpeaking = false;
  private isProcessingQueue = false;
  private lastUtteranceEndMs = 0;

  // Active speech lifecycle
  private nextQueueItemId = 1;
  private nextSpeechId = 1;
  private activeSpeech: ActiveSpeech | null = null;
  private currentSpeakingMessageNormalized = '';

  // Small gap between normal utterances
  private readonly GAP_BETWEEN_UTTERANCES_MS = 650;

  // Duplicate + category throttling
  private lastMessageNormalized = '';
  private lastMessageTime = 0;

  private readonly MIN_DELAY_BETWEEN_SAME_MSG = 2500;

  private lastCategoryTime: Record<FeedbackCategory, number> = {
    count: 0,
    critical: 0,
    setup: 0,
    success: 0,
    correction: 0,
  };

  private readonly CATEGORY_COOLDOWN_MS: Record<FeedbackCategory, number> = {
    count: 0,
    critical: 0,
    setup: 1200,
    success: 900,
    correction: 1500,
  };

  /**
   * Default max age for queued messages.
   * If a queued message gets too old, it is skipped because
   * real-time coaching should not speak outdated prompts.
   */
  private readonly CATEGORY_MAX_AGE_MS: Record<FeedbackCategory, number> = {
    count: 0,         // counts never queue anyway
    critical: 0,      // critical interrupts immediately
    setup: 2000,
    success: 1400,
    correction: 1200,
  };

  // Numbers in ENGLISH only
  private readonly numberWordsEn: string[] = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
    'twenty',
  ];

  // Codes that should interrupt current speech immediately
  private readonly criticalCodes = new Set<string>([
    'SYSTEM_READY_GO',
    'ERR_BODY_NOT_VISIBLE',
    'ERR_CAMERA_VIEW',
    'SETUP_FULL_BODY_VISIBLE',
  ]);

  // -------------------------------------------------
  // Initialization
  // -------------------------------------------------
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        this.availableVoices = await Speech.getAvailableVoicesAsync();
        this.voiceCache.clear();
      } catch (error) {
        console.error('[VoiceFeedback] Initialization failed:', error);
        this.availableVoices = [];
      } finally {
        this.isInitialized = true;
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  async refreshVoices(): Promise<void> {
    this.isInitialized = false;
    this.initializationPromise = null;
    await this.initialize();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // -------------------------------------------------
  // Public configuration
  // -------------------------------------------------
  setDefaultLanguage(language: string): void {
    const normalized = this.normalizeLanguage(language);
    if (normalized) {
      this.defaultLanguage = normalized;
    }
  }

  setDefaultGender(gender: VoiceGender): void {
    this.defaultGender = gender;
  }

  setSpeechDefaults(options: Pick<VoiceFeedbackOptions, 'gender' | 'rate' | 'pitch' | 'language'>): void {
    if (options.gender) this.defaultGender = options.gender;
    if (typeof options.rate === 'number') this.defaultRate = options.rate;
    if (typeof options.pitch === 'number') this.defaultPitch = options.pitch;

    const normalizedLanguage = this.normalizeLanguage(options.language);
    if (normalizedLanguage) {
      this.defaultLanguage = normalizedLanguage;
    }
  }

  getDefaults(): Required<Pick<VoiceFeedbackOptions, 'gender' | 'rate' | 'pitch' | 'language'>> {
    return {
      gender: this.defaultGender,
      rate: this.defaultRate,
      pitch: this.defaultPitch,
      language: this.defaultLanguage,
    };
  }

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  private normalizeMessage(message: string): string {
    return message.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizeLanguage(language?: string): string | undefined {
    const value = (language || '').trim();
    return value || undefined;
  }

  private getLanguagePrefix(language?: string): string {
    return (language || '').toLowerCase().split('-')[0];
  }

  private numberToWords(n: number): string {
    if (n <= 20) return this.numberWordsEn[n] || String(n);

    if (n < 100) {
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      const tensWords = [
        '',
        '',
        'twenty',
        'thirty',
        'forty',
        'fifty',
        'sixty',
        'seventy',
        'eighty',
        'ninety',
      ];
      return tensWords[tens] + (ones ? ` ${this.numberWordsEn[ones]}` : '');
    }

    return String(n);
  }

  /**
   * Choose the best voice for a given language + gender.
   * Strategy:
   * 1) exact language match
   * 2) same language prefix (e.g. "en")
   * 3) preferred gender hints in voice name
   * 4) prefer local / installed voices when metadata exists
   */
  private getBestVoiceId(language: string, gender: VoiceGender): string | undefined {
    const normalizedLanguage = this.normalizeLanguage(language) || this.defaultLanguage;
    const cacheKey = `${normalizedLanguage}__${gender}`;

    if (this.voiceCache.has(cacheKey)) {
      return this.voiceCache.get(cacheKey);
    }

    const voices = this.availableVoices;
    if (!voices.length) {
      this.voiceCache.set(cacheKey, undefined);
      return undefined;
    }

    const languageLower = normalizedLanguage.toLowerCase();
    const languagePrefix = this.getLanguagePrefix(normalizedLanguage);

    const genderHints =
      gender === 'male'
        ? ['male', 'daniel', 'alex', 'thomas', 'fred', 'jorge']
        : ['female', 'samantha', 'victoria', 'karen', 'susan', 'anna'];

    let bestVoice: Speech.Voice | undefined;
    let bestScore = -Infinity;

    for (const voice of voices) {
      const voiceLanguage = (voice.language || '').toLowerCase();
      const voiceName = (voice.name || '').toLowerCase();

      let score = 0;

      // Exact locale match gets the highest weight
      if (voiceLanguage === languageLower) {
        score += 100;
      } else if (voiceLanguage.startsWith(languagePrefix)) {
        score += 60;
      }

      // Name-based gender hint
      if (genderHints.some((hint) => voiceName.includes(hint))) {
        score += 20;
      }

      // Prefer installed / local voices when metadata exists
      const networkConnectionRequired = Boolean((voice as any).networkConnectionRequired);
      const notInstalled = Boolean((voice as any).notInstalled);

      if (!networkConnectionRequired) score += 5;
      if (!notInstalled) score += 5;

      // Slight preference for voices that at least have an identifier
      if (voice.identifier) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestVoice = voice;
      }
    }

    // Fallback: if nothing matched the requested locale, try English for counts/general fallback.
    if (!bestVoice && languagePrefix !== 'en') {
      const englishVoice = voices.find((v) =>
        (v.language || '').toLowerCase().startsWith('en')
      );
      bestVoice = englishVoice;
    }

    const voiceId = bestVoice?.identifier || undefined;
    this.voiceCache.set(cacheKey, voiceId);
    return voiceId;
  }

  private getCategory(feedbackCode: string): FeedbackCategory {
    if (
      feedbackCode.startsWith('COUNT_') ||
      feedbackCode.startsWith('REP_NUMBER_')
    ) {
      return 'count';
    }

    if (this.criticalCodes.has(feedbackCode)) {
      return 'critical';
    }

    if (
      feedbackCode.startsWith('SETUP_') ||
      feedbackCode === 'START_POSITION' ||
      feedbackCode === 'START_MOVING' ||
      feedbackCode === 'STEP_BACK' ||
      feedbackCode === 'STAND_TALL'
    ) {
      return 'setup';
    }

    if (
      feedbackCode === 'REP_SUCCESS' ||
      feedbackCode === 'GOOD_REP' ||
      feedbackCode === 'PERFECT' ||
      feedbackCode === 'PERFECT_LEVEL' ||
      feedbackCode === 'PERFECT_LOCKOUT'
    ) {
      return 'success';
    }

    return 'correction';
  }

  private hasSameMessageQueued(normalizedMessage: string): boolean {
    return this.queue.some((item) => item.normalizedMessage === normalizedMessage);
  }

  private shouldThrottle(
    message: string,
    category: FeedbackCategory,
    force: boolean
  ): boolean {
    if (force) return false;

    const now = Date.now();
    const normalized = this.normalizeMessage(message);

    if (!normalized) return true;

    // Prevent duplicate if currently speaking the same message
    if (normalized === this.currentSpeakingMessageNormalized) {
      return true;
    }

    // Prevent duplicate if already queued
    if (this.hasSameMessageQueued(normalized)) {
      return true;
    }

    // Avoid repeating the exact same spoken message too quickly
    if (
      normalized === this.lastMessageNormalized &&
      now - this.lastMessageTime < this.MIN_DELAY_BETWEEN_SAME_MSG
    ) {
      return true;
    }

    // Category-based cooldown
    const categoryCooldown = this.CATEGORY_COOLDOWN_MS[category];
    if (now - this.lastCategoryTime[category] < categoryCooldown) {
      return true;
    }

    return false;
  }

  /**
   * Mark as spoken when the utterance actually starts.
   * This avoids "false throttling" for queued items that get cancelled
   * before they are spoken.
   */
  private markSpoken(message: string, category: FeedbackCategory): void {
    const now = Date.now();
    this.lastMessageNormalized = this.normalizeMessage(message);
    this.lastMessageTime = now;
    this.lastCategoryTime[category] = now;
  }

  private finalizeActiveSpeech(
    speechId: number,
    outcome: 'done' | 'stopped' | 'error',
    error?: unknown
  ): void {
    if (!this.activeSpeech || this.activeSpeech.id !== speechId) {
      return;
    }

    const current = this.activeSpeech;
    this.activeSpeech = null;
    this.isSpeaking = false;
    this.lastUtteranceEndMs = Date.now();
    this.currentSpeakingMessageNormalized = '';

    if (outcome === 'error') {
      current.reject(error);
    } else {
      current.resolve();
    }
  }

  private async safeStopSpeech(): Promise<void> {
    const activeId = this.activeSpeech?.id;

    try {
      await Speech.stop();
    } catch {
      // Ignore stop errors to keep the engine resilient
    } finally {
      // Some platforms may not reliably fire onStopped after stop(),
      // so we finalize manually if something was active.
      if (typeof activeId === 'number') {
        this.finalizeActiveSpeech(activeId, 'stopped');
      } else {
        this.isSpeaking = false;
        this.lastUtteranceEndMs = Date.now();
        this.currentSpeakingMessageNormalized = '';
      }
    }
  }

  private getMaxAgeMs(
    category: FeedbackCategory,
    options: VoiceFeedbackOptions
  ): number {
    if (typeof options.maxAgeMs === 'number' && options.maxAgeMs >= 0) {
      return options.maxAgeMs;
    }

    return this.CATEGORY_MAX_AGE_MS[category];
  }

  private isQueueItemExpired(item: QueueItem, now = Date.now()): boolean {
    if (item.maxAgeMs <= 0) return false;
    return now - item.enqueuedAt > item.maxAgeMs;
  }

  // -------------------------------------------------
  // Queue Engine (No Overlap)
  // -------------------------------------------------
  private async speakNow(
    message: string,
    category: FeedbackCategory,
    options: VoiceFeedbackOptions,
    skipGap = false
  ): Promise<void> {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    await this.ensureInitialized();

    const {
      gender = this.defaultGender,
      rate = this.defaultRate,
      pitch = this.defaultPitch,
      language = this.defaultLanguage,
    } = options;

    const normalizedLanguage = this.normalizeLanguage(language) || this.defaultLanguage;
    const voice = this.getBestVoiceId(normalizedLanguage, gender);
    const normalizedMessage = this.normalizeMessage(trimmedMessage);

    // Small gap only for normal queued speech
    if (!skipGap) {
      const now = Date.now();
      const waitMs = Math.max(
        0,
        this.GAP_BETWEEN_UTTERANCES_MS - (now - this.lastUtteranceEndMs)
      );

      if (waitMs > 0) {
        await new Promise((res) => setTimeout(res, waitMs));
      }
    }

    return new Promise<void>((resolve, reject) => {
      const speechId = this.nextSpeechId++;

      try {
        this.isSpeaking = true;
        this.currentSpeakingMessageNormalized = normalizedMessage;
        this.activeSpeech = {
          id: speechId,
          normalizedMessage,
          resolve,
          reject,
          didStart: false,
        };

        Speech.speak(trimmedMessage, {
          voice,
          rate,
          pitch,
          language: normalizedLanguage,
          onStart: () => {
            if (!this.activeSpeech || this.activeSpeech.id !== speechId) {
              return;
            }

            if (!this.activeSpeech.didStart) {
              this.activeSpeech.didStart = true;
              this.markSpoken(trimmedMessage, category);
            }
          },
          onDone: () => {
            this.finalizeActiveSpeech(speechId, 'done');
          },
          onStopped: () => {
            this.finalizeActiveSpeech(speechId, 'stopped');
          },
          onError: (e) => {
            this.finalizeActiveSpeech(speechId, 'error', e);
          },
        });
      } catch (e) {
        this.isSpeaking = false;
        this.lastUtteranceEndMs = Date.now();
        this.currentSpeakingMessageNormalized = '';
        this.activeSpeech = null;
        reject(e);
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    try {
      while (!this.isSpeaking && this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) break;

        // Drop stale queued messages silently
        if (this.isQueueItemExpired(item)) {
          item.resolve();
          continue;
        }

        try {
          await this.speakNow(item.message, item.category, item.options, false);
          item.resolve();
        } catch (e) {
          item.reject(e);
        }
      }
    } finally {
      this.isProcessingQueue = false;

      // If new items were pushed while finishing, restart processing
      if (!this.isSpeaking && this.queue.length > 0) {
        void this.processQueue();
      }
    }
  }

  private enqueue(
    message: string,
    category: FeedbackCategory,
    options: VoiceFeedbackOptions
  ): Promise<void> {
    const normalizedMessage = this.normalizeMessage(message);
    const maxAgeMs = this.getMaxAgeMs(category, options);

    return new Promise((resolve, reject) => {
      this.queue.push({
        id: this.nextQueueItemId++,
        message,
        normalizedMessage,
        category,
        options,
        enqueuedAt: Date.now(),
        maxAgeMs,
        resolve,
        reject,
      });

      void this.processQueue();
    });
  }

  /**
   * Clears the queue safely and resolves pending promises
   * so nothing is left hanging.
   */
  private clearQueue(): void {
    const pending = this.queue.splice(0, this.queue.length);
    pending.forEach((item) => item.resolve());
  }

  private async interruptAndSpeakNow(
    message: string,
    category: FeedbackCategory,
    options: VoiceFeedbackOptions,
    forcedLanguage?: string
  ): Promise<void> {
    this.clearQueue();
    await this.safeStopSpeech();

    await this.speakNow(
      message,
      category,
      {
        ...options,
        force: true,
        language: forcedLanguage || options.language || this.defaultLanguage,
      },
      true // skip gap for immediate feedback
    );
  }

  private async speakManaged(
    message: string,
    category: FeedbackCategory,
    options: VoiceFeedbackOptions = {},
    interrupt = false
  ): Promise<void> {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    await this.ensureInitialized();

    const force = !!options.force;
    if (this.shouldThrottle(trimmedMessage, category, force)) {
      return;
    }

    if (interrupt) {
      await this.interruptAndSpeakNow(trimmedMessage, category, options);
      return;
    }

    return this.enqueue(trimmedMessage, category, {
      ...options,
      language: options.language || this.defaultLanguage,
    });
  }

  // -------------------------------------------------
  // Public API
  // -------------------------------------------------
  async stop(): Promise<void> {
    this.clearQueue();
    await this.safeStopSpeech();
  }

  /**
   * Generic speak:
   * - queued
   * - throttled
   * - treated as a normal correction/info prompt
   */
  async speak(
    message: string,
    options: VoiceFeedbackOptions = {}
  ): Promise<void> {
    return this.speakManaged(message, 'correction', options, false);
  }

  /**
   * Speak using feedback code + exercise mapping.
   *
   * Priority:
   * 1) Counts -> immediate interrupt, English only
   * 2) Critical alerts -> immediate interrupt
   * 3) Setup / success / corrections -> queued with smart throttling
   */
  async speakFeedback(
    feedbackCode: string,
    exerciseName?: string,
    options: VoiceFeedbackOptions = {}
  ): Promise<void> {
    if (!feedbackCode) return;
    await this.ensureInitialized();

    // -------------------------------------------------
    // 1) REP COUNTS -> highest priority, always interrupt, always English
    // -------------------------------------------------
    const isCount =
      feedbackCode.startsWith('COUNT_') ||
      feedbackCode.startsWith('REP_NUMBER_');

    if (isCount) {
      const countNumber = parseInt(feedbackCode.split('_').pop() || '0', 10);
      const spokenCount = this.numberToWords(isNaN(countNumber) ? 0 : countNumber);

      // Clear duplicate memory for count immediacy
      this.lastMessageNormalized = '';
      this.lastMessageTime = 0;

      await this.interruptAndSpeakNow(
        spokenCount,
        'count',
        {
          ...options,
          force: true,
          language: 'en-US',
          maxAgeMs: 0,
        },
        'en-US'
      );

      return;
    }

    // -------------------------------------------------
    // 2) Resolve message from mapping
    // -------------------------------------------------
    const feedback = getFeedbackForCode(feedbackCode, exerciseName);

    // Prefer short voice prompt; if absent, stay silent rather than
    // reading long UI text.
    const message = (feedback.voice || '').trim();
    if (!message) return;

    const category = this.getCategory(feedbackCode);
    const shouldInterrupt = category === 'critical';

    await this.speakManaged(message, category, options, shouldInterrupt);
  }
}

export const voiceFeedback = new VoiceFeedbackService();