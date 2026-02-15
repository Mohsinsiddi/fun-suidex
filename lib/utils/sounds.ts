// ============================================
// Sound Manager - Casino Wheel Sounds (Web Audio API)
// ============================================
// Clean synthesized sounds — no sawtooth/square (those sound buzzy).
// All tones use sine/triangle for pleasant, polished audio.
// - Crisp peg tick click
// - Rising tension BG during spin
// - Bright celebratory chime cascade on win
// - Clean descending "womp womp" on lose

class SoundManager {
  private static instance: SoundManager
  private ctx: AudioContext | null = null
  private initialized = false
  private _muted = false
  private _volume = 0.6
  private tickTimers: ReturnType<typeof setTimeout>[] = []
  private tickRunning = false
  private bgNodes: { stop: () => void }[] = []
  private bgRunning = false

  private constructor() {
    if (typeof window !== 'undefined') {
      this._muted = localStorage.getItem('suidex-sound-muted') === 'true'
      const savedVol = localStorage.getItem('suidex-sound-volume')
      if (savedVol) this._volume = parseFloat(savedVol)
    }
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }

  /** Must call on user gesture to unlock AudioContext */
  init() {
    if (this.initialized || typeof window === 'undefined') return
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.initialized = true
    } catch {
      // Web Audio not supported
    }
  }

  private getCtx(): AudioContext | null {
    if (!this.ctx) return null
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  get muted() { return this._muted }
  get volume() { return this._volume }

  toggleMute() {
    this._muted = !this._muted
    if (typeof window !== 'undefined') {
      localStorage.setItem('suidex-sound-muted', String(this._muted))
    }
    if (this._muted) {
      this.stopTick()
      this.stopBg()
    }
    return this._muted
  }

  setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol))
    if (typeof window !== 'undefined') {
      localStorage.setItem('suidex-sound-volume', String(this._volume))
    }
  }

  // ------------------------------------------------
  // Helper: Create noise buffer for transients
  // ------------------------------------------------
  private createNoiseBuffer(duration: number): AudioBuffer {
    const ctx = this.ctx!
    const sampleRate = ctx.sampleRate
    const length = Math.floor(sampleRate * duration)
    const buffer = ctx.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    return buffer
  }

  // ------------------------------------------------
  // TICK — Soft bell "ding" per peg
  // ------------------------------------------------
  // Pleasant chime-like tick. Two sine layers:
  // 1) Mid-range bell tone with quick decay — the "ding"
  // 2) Gentle high harmonic for sparkle
  // Sounds like a music box / xylophone tap.

  private singleTick(loud = 1) {
    const ctx = this.getCtx()
    if (!ctx || this._muted) return

    const now = ctx.currentTime
    const vol = this._volume * 0.35 * loud

    // Random pitch variation ±8% — gives musical character
    const p = 0.92 + Math.random() * 0.16

    // Layer 1: Bell "ding" — sine at ~2600Hz with natural decay
    const bell = ctx.createOscillator()
    bell.type = 'sine'
    bell.frequency.value = 2600 * p

    const bellGain = ctx.createGain()
    bellGain.gain.setValueAtTime(vol, now)
    bellGain.gain.exponentialRampToValueAtTime(vol * 0.3, now + 0.015)
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

    bell.connect(bellGain)
    bellGain.connect(ctx.destination)
    bell.start(now)
    bell.stop(now + 0.07)

    // Layer 2: Sparkle harmonic (×2.76 for bell-like inharmonic)
    const sparkle = ctx.createOscillator()
    sparkle.type = 'sine'
    sparkle.frequency.value = 2600 * p * 2.76

    const sparkleGain = ctx.createGain()
    sparkleGain.gain.setValueAtTime(vol * 0.12, now)
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

    sparkle.connect(sparkleGain)
    sparkleGain.connect(ctx.destination)
    sparkle.start(now)
    sparkle.stop(now + 0.04)
  }

  // ------------------------------------------------
  // Cubic-bezier solver to match CSS transition timing
  // CSS: cubic-bezier(0.15, 0.60, 0.08, 1.0)
  // ------------------------------------------------

  private bezierX(t: number, x1: number, x2: number): number {
    const ct = 1 - t
    return 3 * ct * ct * t * x1 + 3 * ct * t * t * x2 + t * t * t
  }

  private bezierY(t: number, y1: number, y2: number): number {
    const ct = 1 - t
    return 3 * ct * ct * t * y1 + 3 * ct * t * t * y2 + t * t * t
  }

  private bezierXDeriv(t: number, x1: number, x2: number): number {
    const ct = 1 - t
    return 3 * ct * ct * x1 + 6 * ct * t * (x2 - x1) + 3 * t * t * (1 - x2)
  }

  private solveBezier(timeFrac: number): number {
    const x1 = 0.15, y1 = 0.60, x2 = 0.08, y2 = 1.0
    let t = timeFrac
    for (let i = 0; i < 8; i++) {
      const x = this.bezierX(t, x1, x2) - timeFrac
      const dx = this.bezierXDeriv(t, x1, x2)
      if (Math.abs(dx) < 1e-6) break
      t = Math.max(0, Math.min(1, t - x / dx))
    }
    return this.bezierY(t, y1, y2)
  }

  /**
   * Play one tick per slot boundary crossing, perfectly synced with the wheel.
   * Also starts the background tension sound.
   */
  playTick(totalDegrees: number, slotCount: number = 16) {
    if (this._muted || !this.ctx) return
    this.stopTick()
    this.tickRunning = true

    // Start BG tension sound
    this.playSpinBg()

    const duration = 6000 // ms, matches CSS transition duration
    const degreesPerSlot = 360 / slotCount
    const totalSlotCrossings = Math.floor(totalDegrees / degreesPerSlot)

    const samples = 500
    const bezierTable: { timeFrac: number; rotFrac: number }[] = []
    for (let i = 0; i <= samples; i++) {
      const tf = i / samples
      bezierTable.push({ timeFrac: tf, rotFrac: this.solveBezier(tf) })
    }

    const inverseBezier = (rotFrac: number): number => {
      if (rotFrac <= 0) return 0
      if (rotFrac >= 1) return 1
      let lo = 0, hi = samples
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (bezierTable[mid].rotFrac < rotFrac) lo = mid + 1
        else hi = mid
      }
      const a = bezierTable[Math.max(0, lo - 1)]
      const b = bezierTable[lo]
      if (b.rotFrac === a.rotFrac) return b.timeFrac
      const lerp = (rotFrac - a.rotFrac) / (b.rotFrac - a.rotFrac)
      return a.timeFrac + lerp * (b.timeFrac - a.timeFrac)
    }

    for (let n = 1; n <= totalSlotCrossings; n++) {
      const rotFrac = (n * degreesPerSlot) / totalDegrees
      if (rotFrac > 1) break
      const timeFrac = inverseBezier(rotFrac)
      const timeMs = timeFrac * duration

      const remaining = totalSlotCrossings - n
      const loudness = remaining <= 8
        ? 0.6 + 0.4 * ((8 - remaining) / 8)
        : 0.35 + 0.35 * (1 - rotFrac)

      const timer = setTimeout(() => {
        if (!this.tickRunning) return
        this.singleTick(loudness)
      }, timeMs)

      this.tickTimers.push(timer)
    }
  }

  stopTick() {
    this.tickRunning = false
    for (const t of this.tickTimers) clearTimeout(t)
    this.tickTimers = []
  }

  // ------------------------------------------------
  // SPIN BG — Cycling bell arpeggios + faint hum
  // ------------------------------------------------
  // Win-sound-like bell arpeggios at low volume,
  // building speed and intensity over the spin.
  // Hum pad at near-zero volume underneath.

  private playSpinBg() {
    const ctx = this.getCtx()
    if (!ctx || this._muted) return
    this.stopBg()
    this.bgRunning = true

    const now = ctx.currentTime
    const dur = 6.2
    const allNodes: OscillatorNode[] = []

    // === Layer 1: Cycling bell arpeggios (win-sound style) ===
    // C major arpeggio: C6, E6, G6, C7
    const bellNotes = [1047, 1319, 1568, 2093]
    const totalBells = 20
    for (let i = 0; i < totalBells; i++) {
      const progress = i / totalBells
      // Spacing: ~350ms gaps shrinking to ~200ms
      const delay = i * (0.35 - progress * 0.15)
      if (delay > dur - 0.3) break

      const freq = bellNotes[i % bellNotes.length]
      const bellVol = this._volume * (0.04 + progress * 0.08)

      const bell = ctx.createOscillator()
      bell.type = 'sine'
      bell.frequency.value = freq * (0.98 + Math.random() * 0.04)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now + delay)
      gain.gain.linearRampToValueAtTime(bellVol, now + delay + 0.006)
      gain.gain.exponentialRampToValueAtTime(bellVol * 0.2, now + delay + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25)

      bell.connect(gain)
      gain.connect(ctx.destination)
      bell.start(now + delay)
      bell.stop(now + delay + 0.3)
      allNodes.push(bell)

      // Inharmonic partial for bell shimmer
      const partial = ctx.createOscillator()
      partial.type = 'sine'
      partial.frequency.value = freq * 2.76

      const pGain = ctx.createGain()
      pGain.gain.setValueAtTime(bellVol * 0.15, now + delay)
      pGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08)

      partial.connect(pGain)
      pGain.connect(ctx.destination)
      partial.start(now + delay)
      partial.stop(now + delay + 0.1)
      allNodes.push(partial)
    }

    // === Layer 2: Hum — near silent ===
    const humVol = this._volume * 0.01
    const hum = ctx.createOscillator()
    hum.type = 'sine'
    hum.frequency.value = 262 // C4

    const humGain = ctx.createGain()
    humGain.gain.setValueAtTime(0, now)
    humGain.gain.linearRampToValueAtTime(humVol, now + 0.5)
    humGain.gain.setValueAtTime(humVol, now + 4.5)
    humGain.gain.linearRampToValueAtTime(0.001, now + dur)

    hum.connect(humGain)
    humGain.connect(ctx.destination)
    hum.start(now)
    hum.stop(now + dur + 0.1)
    allNodes.push(hum)

    // Track all nodes for cleanup
    this.bgNodes = allNodes.map(node => ({
      stop: () => { try { node.stop() } catch {} }
    }))
  }

  private stopBg() {
    this.bgRunning = false
    for (const n of this.bgNodes) n.stop()
    this.bgNodes = []
  }

  // ------------------------------------------------
  // WIN — Bright Celebratory Chime Cascade
  // ------------------------------------------------
  // No brass, no farts. Just clean, bright, happy sounds:
  // 1) Ascending bell chimes (C6→E6→G6→C7) — bright major arpeggio
  // 2) Sparkle shower — rapid high sine pings
  // 3) Warm major chord pad (C4+E4+G4) — sustain glow
  // 4) Triumphant "ding ding ding" bell hits
  // ~1.5s total

  playWin() {
    this.stopTick()
    this.stopBg()
    const ctx = this.getCtx()
    if (!ctx || this._muted) return

    const now = ctx.currentTime
    const vol = this._volume * 0.35

    // === LAYER 1: Ascending Major Bell Chimes ===
    // Clean sine bells: C6 → E6 → G6 → C7
    const chimes = [
      { freq: 1047, delay: 0.00, dur: 0.50 },  // C6
      { freq: 1319, delay: 0.10, dur: 0.45 },  // E6
      { freq: 1568, delay: 0.20, dur: 0.40 },  // G6
      { freq: 2093, delay: 0.32, dur: 0.60 },  // C7 (held longer)
    ]

    chimes.forEach(({ freq, delay, dur }) => {
      // Pure bell tone
      const bell = ctx.createOscillator()
      bell.type = 'sine'
      bell.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now + delay)
      gain.gain.linearRampToValueAtTime(vol * 0.5, now + delay + 0.008)
      gain.gain.exponentialRampToValueAtTime(vol * 0.3, now + delay + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur)

      bell.connect(gain)
      gain.connect(ctx.destination)
      bell.start(now + delay)
      bell.stop(now + delay + dur + 0.02)

      // Inharmonic partial for bell shimmer (freq × 2.76)
      const partial = ctx.createOscillator()
      partial.type = 'sine'
      partial.frequency.value = freq * 2.76

      const pGain = ctx.createGain()
      pGain.gain.setValueAtTime(vol * 0.08, now + delay)
      pGain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur * 0.3)

      partial.connect(pGain)
      pGain.connect(ctx.destination)
      partial.start(now + delay)
      partial.stop(now + delay + dur + 0.02)
    })

    // === LAYER 2: Sparkle Shower ===
    // Rapid descending high-frequency sine pings
    for (let i = 0; i < 16; i++) {
      const delay = 0.35 + i * 0.04 + Math.random() * 0.025
      const freq = 3000 + Math.random() * 5000

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + delay)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + delay + 0.05)

      const gain = ctx.createGain()
      const sparkleVol = vol * 0.12 * (0.5 + Math.random() * 0.5)
      gain.gain.setValueAtTime(sparkleVol, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.03 + Math.random() * 0.04)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.1)
    }

    // === LAYER 3: Warm Major Chord Pad ===
    // C major: C4 + E4 + G4 — sine with gentle chorus
    const chordStart = 0.15
    const chordFreqs = [262, 330, 392] // C4, E4, G4
    chordFreqs.forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      // Gentle chorus detune
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 2.5 + Math.random() * 1.5

      const lfoDepth = ctx.createGain()
      lfoDepth.gain.value = freq * 0.004

      lfo.connect(lfoDepth)
      lfoDepth.connect(osc.frequency)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now + chordStart)
      gain.gain.linearRampToValueAtTime(vol * 0.18, now + chordStart + 0.08)
      gain.gain.setValueAtTime(vol * 0.15, now + chordStart + 0.5)
      gain.gain.exponentialRampToValueAtTime(0.001, now + chordStart + 1.3)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + chordStart)
      osc.stop(now + chordStart + 1.35)
      lfo.start(now + chordStart)
      lfo.stop(now + chordStart + 1.35)
    })

    // === LAYER 4: Triumphant Bell Hits ===
    // Three strong "ding!" hits for emphasis
    const dings = [
      { freq: 2093, delay: 0.45, dur: 0.5 },  // C7
      { freq: 2637, delay: 0.60, dur: 0.45 }, // E7
      { freq: 3136, delay: 0.75, dur: 0.4 },  // G7
    ]
    dings.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now + delay)
      gain.gain.linearRampToValueAtTime(vol * 0.25, now + delay + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + dur + 0.02)
    })

    // === LAYER 5: Sub bass thump for impact ===
    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(80, now)
    thump.frequency.exponentialRampToValueAtTime(50, now + 0.08)

    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(vol * 0.5, now)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    thump.connect(thumpGain)
    thumpGain.connect(ctx.destination)
    thump.start(now)
    thump.stop(now + 0.2)
  }

  // ------------------------------------------------
  // NO PRIZE — Clean Descending "Womp Womp"
  // ------------------------------------------------
  // No sawtooth farts. Clean sine/triangle only:
  // 1) Three descending sine tones (Eb4 → D4 → Db4↓)
  //    with gentle vibrato on the last one
  // 2) Low sine thump for gravitas
  // 3) Soft high shimmer decay for finality
  // ~1.2s total

  playNoPrize() {
    this.stopTick()
    this.stopBg()
    const ctx = this.getCtx()
    if (!ctx || this._muted) return

    const now = ctx.currentTime
    const vol = this._volume * 0.30

    // === LAYER 1: Three Descending Tones ===
    // Clean triangle wave — sounds mellow, not buzzy
    const notes = [
      { freq: 311, start: 0, dur: 0.28, nVol: 1.0, bend: false },     // Eb4
      { freq: 294, start: 0.30, dur: 0.28, nVol: 0.90, bend: false },  // D4
      { freq: 277, start: 0.60, dur: 0.55, nVol: 0.85, bend: true },   // Db4 → bends down
    ]

    notes.forEach(({ freq, start, dur, nVol, bend }) => {
      // Main tone — triangle for warmth without buzz
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + start)

      if (bend) {
        osc.frequency.setValueAtTime(freq, now + start + 0.15)
        osc.frequency.exponentialRampToValueAtTime(freq * 0.80, now + start + dur)
      }

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * nVol, now + start + 0.03)
      gain.gain.setValueAtTime(vol * nVol * 0.8, now + start + dur * 0.5)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)

      // Octave below for weight — also triangle
      const sub = ctx.createOscillator()
      sub.type = 'sine'
      sub.frequency.setValueAtTime(freq / 2, now + start)
      if (bend) {
        sub.frequency.setValueAtTime(freq / 2, now + start + 0.15)
        sub.frequency.exponentialRampToValueAtTime(freq * 0.40, now + start + dur)
      }

      const subGain = ctx.createGain()
      subGain.gain.setValueAtTime(0, now + start)
      subGain.gain.linearRampToValueAtTime(vol * nVol * 0.3, now + start + 0.03)
      subGain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)

      sub.connect(subGain)
      subGain.connect(ctx.destination)
      sub.start(now + start)
      sub.stop(now + start + dur + 0.02)

      // Vibrato on the last note — slow wobble for "sadness"
      if (bend) {
        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.value = 5

        const lfoGain = ctx.createGain()
        lfoGain.gain.value = freq * 0.012

        lfo.connect(lfoGain)
        lfoGain.connect(osc.frequency)
        lfo.start(now + start + 0.1)
        lfo.stop(now + start + dur + 0.02)
      }
    })

    // === LAYER 2: Low Thump ===
    // Single sine thump on beat 1 for weight
    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(70, now)
    thump.frequency.exponentialRampToValueAtTime(40, now + 0.12)

    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(vol * 0.6, now)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    thump.connect(thumpGain)
    thumpGain.connect(ctx.destination)
    thump.start(now)
    thump.stop(now + 0.35)

    // === LAYER 3: Soft Shimmer Decay ===
    // High sine that fades — finality feeling
    const shimmer = ctx.createOscillator()
    shimmer.type = 'sine'
    shimmer.frequency.setValueAtTime(1200, now + 0.6)
    shimmer.frequency.exponentialRampToValueAtTime(600, now + 1.2)

    const shimGain = ctx.createGain()
    shimGain.gain.setValueAtTime(0, now + 0.6)
    shimGain.gain.linearRampToValueAtTime(vol * 0.08, now + 0.65)
    shimGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

    shimmer.connect(shimGain)
    shimGain.connect(ctx.destination)
    shimmer.start(now + 0.6)
    shimmer.stop(now + 1.25)
  }
}

export const soundManager = SoundManager.getInstance()
