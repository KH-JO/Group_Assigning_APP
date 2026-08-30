/**
 * 웹 오디오 API 기반 조편성 효과음 엔진
 * (외부 오디오 파일 없이 브라우저 내장 오디오 신디사이저로 100% 즉시 재생)
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * 셔플링 시 룰렛/슬롯 틱 사운드
   */
  playShuffleTick(pitchMultiplier = 1.0) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = 480 * pitchMultiplier;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * 폭죽 파티 팝 사운드 (노이즈 버스트 + 로우 팝)
   */
  playPopper() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(3, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
  }

  /**
   * 조편성 완료 축하 팡파레 (도-미-솔-도 밝은 브라스/종소리 화음)
   */
  playCelebrationFanfare() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // 파티 팝 동시 재생
    this.playPopper();

    const now = ctx.currentTime + 0.05;
    // 도4, 미4, 솔4, 도5, 미5, 솔5 화음 시퀀스
    const melody = [
      { freq: 523.25, time: 0.0, duration: 0.18 },   // C5
      { freq: 659.25, time: 0.14, duration: 0.18 },  // E5
      { freq: 783.99, time: 0.28, duration: 0.22 },  // G5
      { freq: 1046.50, time: 0.44, duration: 0.9 }   // C6 (롱 톤)
    ];

    melody.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0, now + note.time);
      gain.gain.linearRampToValueAtTime(0.35, now + note.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.duration + 0.05);

      // 풍성한 하모닉스를 위한 배음 추가
      const harm = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(note.freq * 2, now + note.time);
      harmGain.gain.setValueAtTime(0.12, now + note.time);
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

      harm.connect(harmGain);
      harmGain.connect(ctx.destination);
      harm.start(now + note.time);
      harm.stop(now + note.time + note.duration + 0.05);
    });

    // 최종 화음(C 메이저 코드) 잔향
    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach(freq => {
      const cOsc = ctx.createOscillator();
      const cGain = ctx.createGain();
      cOsc.type = 'sine';
      cOsc.frequency.setValueAtTime(freq, now + 0.44);

      cGain.gain.setValueAtTime(0.2, now + 0.44);
      cGain.gain.exponentialRampToValueAtTime(0.0005, now + 1.6);

      cOsc.connect(cGain);
      cGain.connect(ctx.destination);
      cOsc.start(now + 0.44);
      cOsc.stop(now + 1.7);
    });
  }
}

// Global instance
window.soundFX = new SoundEffects();
