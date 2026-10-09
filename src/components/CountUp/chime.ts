/**
 * 「当当」提示音 —— 用 Web Audio 现场合成两声钟响，不引入任何音频资源或第三方库。
 *
 * 浏览器自动播放策略要求先有用户交互（游戏结束、点击「查看得分」这类场景天然满足），
 * 因此这里只做「尽力而为」的合成：环境不支持、被策略拦截或合成失败时静默跳过，
 * 视觉效果（数字弹跳 + 光环 + 徽标）仍然完整。
 */

/** 复用同一个 AudioContext，避免每次庆祝都新建上下文 */
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const scope = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
    if (!Ctor) return null;
    if (!audioContext) {
        try {
            audioContext = new Ctor();
        } catch {
            return null;
        }
    }
    return audioContext;
};

/** 单声钟响：三角波 + 快速衰减包络，听感接近木质「当」 */
const strike = (context: AudioContext, frequency: number, at: number, duration: number, volume: number): void => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, at);
    // 用 exponentialRamp 做出「敲下去立刻衰减」的钟声包络
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
};

/** 播放「当当」：两声下行钟响（988Hz → 740Hz） */
export const playCountUpChime = (): void => {
    const context = getAudioContext();
    if (!context) return;

    try {
        if (context.state === 'suspended') {
            void context.resume();
        }
        const now = context.currentTime + 0.01;
        strike(context, 988, now, 0.45, 0.16);
        strike(context, 740, now + 0.16, 0.6, 0.14);
    } catch {
        // 提示音只是锦上添花，任何异常都不应影响计数动画
    }
};
