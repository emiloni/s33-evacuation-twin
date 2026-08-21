/**
 * Real-world Fire Alarm & Emergency Evacuation Siren Audio Synthesizer (Web Audio API)
 */
class EmergencySirenSynthesizer {
  private audioCtx: AudioContext | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private hornOsc: OscillatorNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private hornPulseLfo: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private hornGain: GainNode | null = null;
  private isPlaying = false;

  public start() {
    if (this.isPlaying || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioCtx = new AudioCtx();

      // Master output volume gain
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.18, this.audioCtx.currentTime);

      // 1. REAL REALISTIC FIRE SIREN (Sweeping High-Low Wail 650Hz -> 1300Hz)
      this.sirenOsc = this.audioCtx.createOscillator();
      this.sirenOsc.type = "sawtooth";
      this.sirenOsc.frequency.setValueAtTime(950, this.audioCtx.currentTime);

      // Siren frequency modulation LFO (1.6 Hz sweeping wail)
      this.sirenLfo = this.audioCtx.createOscillator();
      this.sirenLfo.type = "triangle";
      this.sirenLfo.frequency.setValueAtTime(1.6, this.audioCtx.currentTime);

      const sirenLfoGain = this.audioCtx.createGain();
      sirenLfoGain.gain.setValueAtTime(320, this.audioCtx.currentTime);

      this.sirenLfo.connect(sirenLfoGain);
      sirenLfoGain.connect(this.sirenOsc.frequency);
      this.sirenOsc.connect(this.gainNode);

      // 2. HIGH-DECIBEL FIRE EVACUATION ALARM HORN (Pulsating 4Hz strobe horn)
      this.hornOsc = this.audioCtx.createOscillator();
      this.hornOsc.type = "square";
      this.hornOsc.frequency.setValueAtTime(820, this.audioCtx.currentTime);

      this.hornGain = this.audioCtx.createGain();
      this.hornGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

      // Horn pulse LFO (4 Hz square wave pulse for emergency strobe effect)
      this.hornPulseLfo = this.audioCtx.createOscillator();
      this.hornPulseLfo.type = "square";
      this.hornPulseLfo.frequency.setValueAtTime(4.0, this.audioCtx.currentTime);

      const hornPulseGain = this.audioCtx.createGain();
      hornPulseGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

      this.hornPulseLfo.connect(hornPulseGain);
      hornPulseGain.connect(this.hornGain.gain);

      this.hornOsc.connect(this.hornGain);
      this.hornGain.connect(this.gainNode);

      this.gainNode.connect(this.audioCtx.destination);

      // Start all sound generators
      this.sirenOsc.start();
      this.sirenLfo.start();
      this.hornOsc.start();
      this.hornPulseLfo.start();

      this.isPlaying = true;
    } catch (e) {
      console.warn("Real fire siren synthesis notice:", e);
    }
  }

  public stop() {
    if (!this.isPlaying) return;
    try {
      if (this.sirenOsc) {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
      }
      if (this.sirenLfo) {
        this.sirenLfo.stop();
        this.sirenLfo.disconnect();
      }
      if (this.hornOsc) {
        this.hornOsc.stop();
        this.hornOsc.disconnect();
      }
      if (this.hornPulseLfo) {
        this.hornPulseLfo.stop();
        this.hornPulseLfo.disconnect();
      }
      if (this.audioCtx) {
        this.audioCtx.close();
      }
    } catch (e) {
      console.warn("Fire siren stop notice:", e);
    } finally {
      this.sirenOsc = null;
      this.sirenLfo = null;
      this.hornOsc = null;
      this.hornPulseLfo = null;
      this.gainNode = null;
      this.hornGain = null;
      this.audioCtx = null;
      this.isPlaying = false;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const sirenManager = new EmergencySirenSynthesizer();
