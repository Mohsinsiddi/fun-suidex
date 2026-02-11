// ============================================
// Sound Manager - Casino Spin Wheel Sounds (Web Audio API)
// ============================================
// Synthesizes realistic casino wheel sounds.
// Flapper tick that decelerates with the wheel pegs,
// a jackpot celebration on win, and a trombone "wah-wah" on loss.

class SoundManager {
  private static instance: SoundManager
  private ctx: AudioContext | null = null
  private initialized = false
  private _muted = false
  private _volume = 0.6
  private tickTimers: ReturnType<typeof setTimeout>[] = []
  private tickRunning = false

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
    return this._muted
  }

  setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol))
    if (typeof window !== 'undefined') {
      localStorage.setItem('suidex-sound-volume', String(this._volume))
    }
  }

  // ------------------------------------------------
  // TICK — realistic wheel flapper hitting pegs
  // ------------------------------------------------
  // Real wheel-of-fortune sound: a leather flapper snapping
  // against wooden/metal pegs. Two layered components:
  // 1) Sharp transient "snap" (filtered noise, very short)
  // 2) Resonant "thwack" body (tuned oscillator w/ fast decay)

  private singleTick(loud = 1) {
    const ctx = this.getCtx()
    if (!ctx || this._muted) return

    const now = ctx.currentTime
    const vol = this._volume * 0.45 * loud

    // --- Layer 1: The "snap" — sharp broadband transient ---
    const snapLen = Math.floor(ctx.sampleRate * 0.008) // 8ms
    const snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate)
    const snapData = snapBuf.getChannelData(0)
    for (let i = 0; i < snapLen; i++) {
      // Instant attack, exponential decay
      const env = Math.pow(1 - i / snapLen, 6)
      snapData[i] = (Math.random() * 2 - 1) * env
    }
    const snap = ctx.createBufferSource()
    snap.buffer = snapBuf

    // Highpass to make it "snappy" not "thuddy"
    const snapHP = ctx.createBiquadFilter()
    snapHP.type = 'highpass'
    snapHP.frequency.value = 2000

    // Resonant peak for the "click" character
    const snapBP = ctx.createBiquadFilter()
    snapBP.type = 'peaking'
    snapBP.frequency.value = 3500 + Math.random() * 500
    snapBP.Q.value = 5
    snapBP.gain.value = 12

    const snapGain = ctx.createGain()
    snapGain.gain.setValueAtTime(vol, now)
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015)

    snap.connect(snapHP)
    snapHP.connect(snapBP)
    snapBP.connect(snapGain)
    snapGain.connect(ctx.destination)
    snap.start(now)
    snap.stop(now + 0.02)

    // --- Layer 2: The "thwack" body — tuned resonance ---
    const bodyFreq = 800 + Math.random() * 200  // wooden peg resonance
    const body = ctx.createOscillator()
    body.type = 'triangle'
    body.frequency.setValueAtTime(bodyFreq, now)
    body.frequency.exponentialRampToValueAtTime(bodyFreq * 0.6, now + 0.025)

    const bodyGain = ctx.createGain()
    bodyGain.gain.setValueAtTime(vol * 0.5, now)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

    body.connect(bodyGain)
    bodyGain.connect(ctx.destination)
    body.start(now)
    body.stop(now + 0.04)

    // --- Layer 3: Sub hit for weight (low thud) ---
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(180, now)
    sub.frequency.exponentialRampToValueAtTime(80, now + 0.02)

    const subGain = ctx.createGain()
    subGain.gain.setValueAtTime(vol * 0.25, now)
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025)

    sub.connect(subGain)
    subGain.connect(ctx.destination)
    sub.start(now)
    sub.stop(now + 0.03)
  }

  // ------------------------------------------------
  // Cubic-bezier solver to match CSS transition timing
  // CSS: cubic-bezier(0.15, 0.60, 0.08, 1.0)
  // ------------------------------------------------

  /** Evaluate cubic bezier X(t) for given parametric t */
  private bezierX(t: number, x1: number, x2: number): number {
    const ct = 1 - t
    return 3 * ct * ct * t * x1 + 3 * ct * t * t * x2 + t * t * t
  }

  /** Evaluate cubic bezier Y(t) for given parametric t */
  private bezierY(t: number, y1: number, y2: number): number {
    const ct = 1 - t
    return 3 * ct * ct * t * y1 + 3 * ct * t * t * y2 + t * t * t
  }

  /** Derivative of X(t) for Newton's method */
  private bezierXDeriv(t: number, x1: number, x2: number): number {
    const ct = 1 - t
    return 3 * ct * ct * x1 + 6 * ct * t * (x2 - x1) + 3 * t * t * (1 - x2)
  }

  /** Given time fraction (0–1), solve for rotation fraction using CSS bezier */
  private solveBezier(timeFrac: number): number {
    const x1 = 0.15, y1 = 0.60, x2 = 0.08, y2 = 1.0

    // Newton's method: find parametric t where X(t) = timeFrac
    let t = timeFrac // initial guess
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
   * @param totalDegrees — total rotation in degrees for this spin
   * @param slotCount — number of slots on the wheel (default 16)
   */
  playTick(totalDegrees: number, slotCount: number = 16) {
    if (this._muted || !this.ctx) return
    this.stopTick()
    this.tickRunning = true

    const duration = 6000 // ms, matches CSS transition duration
    const degreesPerSlot = 360 / slotCount
    const totalSlotCrossings = Math.floor(totalDegrees / degreesPerSlot)

    // Pre-compute the exact time (ms) when each slot boundary is crossed
    // Slot boundary N is at angle = N * degreesPerSlot
    // rotationFraction = (N * degreesPerSlot) / totalDegrees
    // We need to find the time where solveBezier(time/duration) = rotationFraction
    // i.e., invert the bezier to get time from rotation fraction

    // Build a lookup table: rotation fraction → time fraction
    // Sample the bezier at fine resolution for fast inverse lookup
    const samples = 500
    const bezierTable: { timeFrac: number; rotFrac: number }[] = []
    for (let i = 0; i <= samples; i++) {
      const tf = i / samples
      bezierTable.push({ timeFrac: tf, rotFrac: this.solveBezier(tf) })
    }

    // For a given rotation fraction, find the time fraction via binary search
    const inverseBezier = (rotFrac: number): number => {
      if (rotFrac <= 0) return 0
      if (rotFrac >= 1) return 1
      let lo = 0, hi = samples
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (bezierTable[mid].rotFrac < rotFrac) lo = mid + 1
        else hi = mid
      }
      // Linear interpolation between samples for precision
      const a = bezierTable[Math.max(0, lo - 1)]
      const b = bezierTable[lo]
      if (b.rotFrac === a.rotFrac) return b.timeFrac
      const lerp = (rotFrac - a.rotFrac) / (b.rotFrac - a.rotFrac)
      return a.timeFrac + lerp * (b.timeFrac - a.timeFrac)
    }

    // Schedule each tick at its exact time
    for (let n = 1; n <= totalSlotCrossings; n++) {
      const rotFrac = (n * degreesPerSlot) / totalDegrees
      if (rotFrac > 1) break
      const timeFrac = inverseBezier(rotFrac)
      const timeMs = timeFrac * duration

      // Loudness: normal ticks are moderate, last ~6 ticks get louder (dramatic landing)
      const remaining = totalSlotCrossings - n
      const loudness = remaining <= 6
        ? 0.7 + 0.3 * ((6 - remaining) / 6) // crescendo: 0.7 → 1.0
        : 0.4 + 0.3 * (1 - rotFrac)          // slightly louder when fast

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
  // WIN — slot machine jackpot celebration
  // ------------------------------------------------
  // Layers: ascending fanfare, bright chord, bell chimes,
  // metallic coin cascade, and a sustained "glow" pad.

  playWin() {
    this.stopTick()
    const ctx = this.getCtx()
    if (!ctx || this._muted) return

    const now = ctx.currentTime
    const vol = this._volume * 0.35

    // --- Ascending fanfare: C5 → E5 → G5 → C6 ---
    const fanfare = [
      { freq: 523, delay: 0, dur: 0.18 },
      { freq: 659, delay: 0.13, dur: 0.18 },
      { freq: 784, delay: 0.26, dur: 0.22 },
      { freq: 1047, delay: 0.40, dur: 0.35 },
    ]
    fanfare.forEach(({ freq, delay, dur }) => {
      // Main tone
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now + delay)
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.015)
      gain.gain.setValueAtTime(vol * 0.9, now + delay + dur * 0.5)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + dur + 0.02)

      // Harmonic overtone for brightness
      const harm = ctx.createOscillator()
      harm.type = 'triangle'
      harm.frequency.value = freq * 2

      const harmGain = ctx.createGain()
      harmGain.gain.setValueAtTime(0, now + delay)
      harmGain.gain.linearRampToValueAtTime(vol * 0.15, now + delay + 0.015)
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur * 0.6)

      harm.connect(harmGain)
      harmGain.connect(ctx.destination)
      harm.start(now + delay)
      harm.stop(now + delay + dur + 0.02)
    })

    // --- Bright shimmer chord (C6+E6+G6) ---
    const shimmerStart = 0.55
    ;[1047, 1319, 1568].forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now + shimmerStart)
      gain.gain.linearRampToValueAtTime(vol * 0.4, now + shimmerStart + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + shimmerStart + 1.0)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + shimmerStart)
      osc.stop(now + shimmerStart + 1.05)
    })

    // --- Bell chimes (high register, spread out) ---
    const bells = [
      { freq: 2093, delay: 0.58, dur: 0.8 },   // C7
      { freq: 2637, delay: 0.72, dur: 0.6 },   // E7
      { freq: 3136, delay: 0.88, dur: 0.5 },   // G7
    ]
    bells.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(vol * 0.2, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + dur + 0.02)
    })

    // --- Coin shower — metallic cascade ---
    for (let i = 0; i < 12; i++) {
      const delay = 0.65 + i * 0.06 + Math.random() * 0.03
      const freq = 3500 + Math.random() * 5000

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + delay)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + delay + 0.05)

      const gain = ctx.createGain()
      const coinVol = vol * 0.12 * (0.4 + Math.random() * 0.6)
      gain.gain.setValueAtTime(coinVol, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04 + Math.random() * 0.04)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.1)
    }

    // --- Sustained warm "glow" pad underneath ---
    const pad = ctx.createOscillator()
    pad.type = 'sine'
    pad.frequency.value = 262 // C4

    const padGain = ctx.createGain()
    padGain.gain.setValueAtTime(0, now + 0.4)
    padGain.gain.linearRampToValueAtTime(vol * 0.15, now + 0.6)
    padGain.gain.setValueAtTime(vol * 0.15, now + 1.0)
    padGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8)

    pad.connect(padGain)
    padGain.connect(ctx.destination)
    pad.start(now + 0.4)
    pad.stop(now + 1.85)
  }

  // ------------------------------------------------
  // NO PRIZE — trombone "wah wah waaaah"
  // ------------------------------------------------
  // Classic game show loss sound. Three descending notes
  // with vibrato, trombone-like timbre (fundamental + odd harmonics).

  playNoPrize() {
    this.stopTick()
    const ctx = this.getCtx()
    if (!ctx || this._muted) return

    const now = ctx.currentTime
    const vol = this._volume * 0.25

    // Three descending notes: Bb3 → A3 → long Ab3
    const notes = [
      { freq: 233, start: 0, dur: 0.28, vol: 1.0 },
      { freq: 220, start: 0.30, dur: 0.28, vol: 0.9 },
      { freq: 208, start: 0.60, dur: 0.65, vol: 0.85 },
    ]

    notes.forEach(({ freq, start, dur, vol: noteVol }) => {
      // Fundamental
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now + start)
      // Slight downward bend on last note for extra sadness
      if (start > 0.5) {
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + start + dur)
      }

      // Lowpass to soften the sawtooth into trombone-like timbre
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = freq * 4
      lp.Q.value = 1

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * noteVol, now + start + 0.03)
      gain.gain.setValueAtTime(vol * noteVol * 0.85, now + start + dur * 0.6)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)

      osc.connect(lp)
      lp.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)

      // Vibrato LFO on last note
      if (start > 0.5) {
        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.value = 5.5 // vibrato rate

        const lfoGain = ctx.createGain()
        lfoGain.gain.value = freq * 0.015 // vibrato depth

        lfo.connect(lfoGain)
        lfoGain.connect(osc.frequency)
        lfo.start(now + start)
        lfo.stop(now + start + dur + 0.02)
      }
    })

    // Subtle reverb-ish tail (quiet low note)
    const tail = ctx.createOscillator()
    tail.type = 'sine'
    tail.frequency.value = 104 // Ab2

    const tailGain = ctx.createGain()
    tailGain.gain.setValueAtTime(vol * 0.2, now + 0.6)
    tailGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4)

    tail.connect(tailGain)
    tailGain.connect(ctx.destination)
    tail.start(now + 0.6)
    tail.stop(now + 1.45)
  }
}

export const soundManager = SoundManager.getInstance()
