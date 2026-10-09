import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CountUp } from './CountUp';
import type { CountUpEasing, CountUpEasingName, CountUpRenderState } from './CountUp';
import styles from './count-up.module.less';

/** Web Audio 探针：断言「当当」提示音是否真的合成出来 */
const audioProbe = {
    oscillators: [] as any[],
    frequencies: [] as number[],
    resumeCalls: 0,
};

class FakeAudioContext {
    state = 'suspended';
    currentTime = 0.5;
    destination = {};
    createOscillator() {
        const oscillator = {
            type: 'sine',
            frequency: { setValueAtTime: vi.fn((value: number) => audioProbe.frequencies.push(value)) },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
        };
        audioProbe.oscillators.push(oscillator);
        return oscillator;
    }
    createGain() {
        return {
            gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            connect: vi.fn(),
        };
    }
    resume() {
        audioProbe.resumeCalls += 1;
        return Promise.resolve();
    }
}

/** 构造一个可用的 AudioContext 替身，记录被合成的频率与 resume 次数 */
const createAudioStub = (state: 'running' | 'suspended' = 'suspended') => {
    const frequencies: number[] = [];
    const resume = vi.fn(() => Promise.resolve());
    class StubAudioContext {
        state = state;
        currentTime = 1;
        destination = {};
        createOscillator() {
            return {
                type: 'sine',
                frequency: { setValueAtTime: vi.fn((value: number) => frequencies.push(value)) },
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
            };
        }
        createGain() {
            return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
        }
        resume = resume;
    }
    return { StubAudioContext, frequencies, resume };
};

describe('CountUp', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        audioProbe.oscillators.length = 0;
        audioProbe.frequencies.length = 0;
        audioProbe.resumeCalls = 0;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    /** 推进假时钟（rAF 与 setTimeout 都受它驱动） */
    const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

    const numberText = (container: HTMLElement) => container.querySelector(`.${styles.number}`)?.textContent;
    const readableText = (container: HTMLElement) => container.querySelector(`.${styles.srOnly}`)?.textContent;

    it('未开始计数时展示起始值，并把它播报给读屏', () => {
        const { container } = render(<CountUp end={1320} start={100} />);
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(numberText(container)).toBe('100');
        expect(readableText(container)).toBe('100');
    });

    it('按 duration 从 start 计数到 end，计数中不打扰读屏', () => {
        const { container } = render(<CountUp isCounting end={1000} duration={1} />);
        expect(readableText(container)).toBe('');

        advance(500);
        const midway = Number(numberText(container));
        expect(midway).toBeGreaterThan(0);
        expect(midway).toBeLessThan(1000);

        advance(700);
        expect(numberText(container)).toBe('1000');
        expect(readableText(container)).toBe('1000');
    });

    it('结束时触发 onComplete 与 onUpdate', () => {
        const onComplete = vi.fn();
        const onUpdate = vi.fn();
        render(<CountUp isCounting end={100} duration={1} onComplete={onComplete} onUpdate={onUpdate} />);

        advance(1_200);
        expect(onComplete).toHaveBeenCalledTimes(1);
        // 回调参数是累计动画时长（秒）
        expect(onComplete.mock.calls[0][0]).toBeGreaterThanOrEqual(1);
        expect(onUpdate).toHaveBeenLastCalledWith(100);
    });

    it('duration=0 直接显示目标值', () => {
        const { container } = render(<CountUp isCounting end={86} duration={0} />);
        expect(numberText(container)).toBe('86');
        expect(readableText(container)).toBe('86');
    });

    it('支持千分位、小数位、小数点与前后缀', () => {
        const { container } = render(
            <CountUp
                isCounting
                end={1320.5}
                decimalPlaces={1}
                thousandsSeparator=","
                suffix="分"
                prefix="¥"
                duration={0}
            />
        );
        expect(numberText(container)).toBe('1,320.5');
        expect(readableText(container)).toBe('1,320.5');
        expect(screen.getByText('分')).toBeInTheDocument();
        expect(screen.getByText('¥')).toBeInTheDocument();
    });

    it('小数位默认取 start / end 中较大的小数位数', () => {
        const { container } = render(<CountUp isCounting start={0.5} end={2.25} duration={0} />);
        expect(numberText(container)).toBe('2.25');
    });

    it('支持自定义小数点符号', () => {
        const { container } = render(
            <CountUp isCounting end={1.5} decimalPlaces={1} decimalSeparator="," duration={0} />
        );
        expect(numberText(container)).toBe('1,5');
    });

    it('formatter 优先级高于内置格式化', () => {
        const { container } = render(
            <CountUp
                isCounting
                end={100}
                duration={0}
                thousandsSeparator=","
                formatter={(value) => `${Math.round(value)} 分`}
            />
        );
        expect(numberText(container)).toBe('100 分');
        // 读屏文本始终使用默认数字格式，保证可读性
        expect(readableText(container)).toBe('100');
    });

    it('children 渲染函数接管渲染，并可 reset 重播', () => {
        let state: CountUpRenderState | null = null;
        const { container } = render(
            <CountUp isCounting end={10} duration={1}>
                {({ value, reset }) => {
                    state = { value, reset };
                    return `v${Math.round(value)}`;
                }}
            </CountUp>
        );
        advance(1_200);
        expect(numberText(container)).toBe('v10');

        act(() => state?.reset());
        expect(numberText(container)).toBe('v0');
        advance(1_200);
        expect(numberText(container)).toBe('v10');
    });

    it('reset(newStartAt) 从指定值重播', () => {
        let state: CountUpRenderState | null = null;
        const { container } = render(
            <CountUp isCounting start={0} end={100} duration={1}>
                {({ value, reset }) => {
                    state = { value, reset };
                    return String(Math.round(value));
                }}
            </CountUp>
        );
        advance(1_200);
        expect(numberText(container)).toBe('100');

        act(() => state?.reset(50));
        expect(numberText(container)).toBe('50');
    });

    it('内置缓动曲线都能走到目标值，自定义与未知曲线也不会中断', () => {
        const easings: CountUpEasingName[] = ['linear', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeOutExpo'];
        const custom = vi.fn((progress: number) => progress * progress);
        const samples: CountUpEasing[] = [...easings, custom, 'not-a-curve' as CountUpEasing];

        const { container } = render(
            <div>
                {samples.map((easing, index) => (
                    <CountUp key={index} isCounting end={100} duration={1} easing={easing} />
                ))}
            </div>
        );

        advance(1_200);
        const numbers = Array.from(container.querySelectorAll(`.${styles.number}`)).map((node) => node.textContent);
        expect(numbers).toHaveLength(samples.length);
        expect(numbers.every((text) => text === '100')).toBe(true);
        expect(custom).toHaveBeenCalled();
    });

    it('updateInterval 控制刷新频率', () => {
        const { container } = render(<CountUp isCounting end={100} duration={1} updateInterval={1} easing="linear" />);
        advance(500);
        // 间隔 1 秒：前半段仍显示起点
        expect(numberText(container)).toBe('0');
        advance(700);
        expect(numberText(container)).toBe('100');
    });

    it('isCounting 置为 false 暂停，再置为 true 从暂停处继续', () => {
        const { container, rerender } = render(<CountUp isCounting end={1000} duration={2} />);
        advance(500);
        const paused = Number(numberText(container));
        expect(paused).toBeGreaterThan(0);

        rerender(<CountUp isCounting={false} end={1000} duration={2} />);
        advance(1_000);
        expect(Number(numberText(container))).toBe(paused);

        rerender(<CountUp isCounting end={1000} duration={2} />);
        advance(500);
        expect(Number(numberText(container))).toBeGreaterThan(paused);
    });

    it('end 变化时自动重播', () => {
        const { container, rerender } = render(<CountUp isCounting end={100} duration={1} />);
        advance(1_200);
        expect(numberText(container)).toBe('100');

        rerender(<CountUp isCounting end={500} duration={1} />);
        expect(numberText(container)).toBe('0');
        advance(1_200);
        expect(numberText(container)).toBe('500');
    });

    it('onComplete 返回 shouldRepeat 时延迟重播', () => {
        const onComplete = vi.fn().mockReturnValue({ shouldRepeat: true, delay: 0.5 });
        const { container } = render(<CountUp isCounting end={100} duration={1} onComplete={onComplete} />);

        advance(1_200);
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(numberText(container)).toBe('100');

        advance(600);
        expect(numberText(container)).toBe('0');

        advance(1_200);
        expect(onComplete).toHaveBeenCalledTimes(2);
        expect(numberText(container)).toBe('100');
    });

    it('环境不支持 requestAnimationFrame 时静态展示且不报错', () => {
        vi.stubGlobal('requestAnimationFrame', undefined);
        const { container } = render(<CountUp isCounting end={100} duration={1} />);
        advance(1_200);
        expect(numberText(container)).toBe('0');
    });

    it('默认不渲染庆祝效果', () => {
        render(<CountUp isCounting end={10} duration={1} />);
        advance(1_200);
        expect(screen.queryByText('当当！')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).not.toHaveClass(styles.celebrating);
    });

    it('celebrate 开启后在结束时弹出「当当！」并在动画结束后收起', () => {
        const { container } = render(<CountUp isCounting end={10} duration={1} celebrate />);
        advance(1_200);

        const root = screen.getByRole('status');
        expect(root).toHaveClass(styles.celebrating);
        expect(screen.getByText('当当！')).toBeInTheDocument();
        // 星芒与光环是纯装饰，对辅助技术隐藏
        expect(container.querySelector(`.${styles.effects}`)).toHaveAttribute('aria-hidden', 'true');

        advance(1_000);
        expect(screen.queryByText('当当！')).not.toBeInTheDocument();
        expect(root).not.toHaveClass(styles.celebrating);
    });

    it('支持自定义庆祝文案', () => {
        render(<CountUp isCounting end={10} duration={1} celebrate={{ text: '完美！' }} />);
        advance(1_200);
        expect(screen.getByText('完美！')).toBeInTheDocument();
        expect(screen.queryByText('当当！')).not.toBeInTheDocument();
    });

    it('celebrate={{ sound: true }} 时合成两声「当当」', () => {
        vi.stubGlobal('AudioContext', FakeAudioContext);
        render(<CountUp isCounting end={10} duration={1} celebrate={{ sound: true }} />);
        advance(1_200);

        expect(audioProbe.oscillators).toHaveLength(2);
        expect(audioProbe.frequencies).toEqual([988, 740]);
        // 上下文处于 suspended 时先恢复播放
        expect(audioProbe.resumeCalls).toBe(1);
        audioProbe.oscillators.forEach((oscillator) => {
            expect(oscillator.start).toHaveBeenCalled();
            expect(oscillator.stop).toHaveBeenCalled();
        });
    });

    it('未开启 sound 时不合成提示音', () => {
        vi.stubGlobal('AudioContext', FakeAudioContext);
        render(<CountUp isCounting end={10} duration={1} celebrate />);
        advance(1_200);
        expect(audioProbe.oscillators).toHaveLength(0);
    });

    it('没有 AudioContext 时提示音静默跳过', () => {
        vi.stubGlobal('AudioContext', undefined);
        render(<CountUp isCounting end={10} duration={1} celebrate={{ sound: true }} />);
        expect(() => advance(1_200)).not.toThrow();
        expect(audioProbe.oscillators).toHaveLength(0);
    });

    it('应用尺寸、风格、边框与自定义属性', () => {
        render(
            <CountUp
                end={10}
                size="large"
                variant="island"
                bordered
                className="custom"
                aria-label="本局得分"
                data-testid="score"
            />
        );
        const root = screen.getByRole('status');
        expect(root).toHaveClass(styles.large, styles.island, styles.bordered, 'custom');
        expect(root).toHaveAttribute('data-testid', 'score');
        expect(root).toHaveAccessibleName('本局得分');
    });
});

/**
 * chime.ts 是计数结束「当当」提示音的合成模块，持有模块级 AudioContext 缓存，
 * 所以每个用例都 resetModules + 动态 import，拿到干净的模块实例。
 */
describe('playCountUpChime', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    const loadChime = async () => (await import('./chime')).playCountUpChime;

    it('浏览器没有 AudioContext 时静默跳过', async () => {
        vi.stubGlobal('AudioContext', undefined);
        const playCountUpChime = await loadChime();
        expect(() => playCountUpChime()).not.toThrow();
    });

    it('合成两声「当当」，并在上下文挂起时先恢复播放', async () => {
        const { StubAudioContext, frequencies, resume } = createAudioStub('suspended');
        vi.stubGlobal('AudioContext', StubAudioContext);

        const playCountUpChime = await loadChime();
        playCountUpChime();
        expect(frequencies).toEqual([988, 740]);
        expect(resume).toHaveBeenCalledTimes(1);
    });

    it('上下文已在运行时不重复 resume', async () => {
        const { StubAudioContext, frequencies, resume } = createAudioStub('running');
        vi.stubGlobal('AudioContext', StubAudioContext);

        const playCountUpChime = await loadChime();
        playCountUpChime();
        expect(frequencies).toEqual([988, 740]);
        expect(resume).not.toHaveBeenCalled();
    });

    it('AudioContext 构造失败时静默跳过', async () => {
        class BlockedAudioContext {
            constructor() {
                throw new Error('blocked by autoplay policy');
            }
        }
        vi.stubGlobal('AudioContext', BlockedAudioContext);

        const playCountUpChime = await loadChime();
        expect(() => playCountUpChime()).not.toThrow();
    });

    it('音频节点创建失败时静默跳过', async () => {
        class BrokenAudioContext {
            state = 'running';
            currentTime = 0;
            destination = {};
            createOscillator() {
                throw new Error('no audio device');
            }
        }
        vi.stubGlobal('AudioContext', BrokenAudioContext);

        const playCountUpChime = await loadChime();
        expect(() => playCountUpChime()).not.toThrow();
    });

    it('兼容 webkit 前缀的 AudioContext', async () => {
        const { StubAudioContext, frequencies } = createAudioStub('running');
        vi.stubGlobal('AudioContext', undefined);
        vi.stubGlobal('webkitAudioContext', StubAudioContext);

        const playCountUpChime = await loadChime();
        playCountUpChime();
        expect(frequencies).toEqual([988, 740]);
    });
});
