import { AudioSource } from '../contexts/streamManager'

export type StreamOptions = {
  threshold: number
  gain: number
}
export class PeerStream {
  public id: string
  public stream?: MediaStream
  protected audioCtx: AudioContext
  protected gainNode: GainNode
  /** post gain changes but pre-muteNode, this is what is visualized */
  protected analyser: BaseAnalyser
  protected muteNode: GainNode
  protected maxGain = 10

  constructor(id: string) {
    this.id = id
    this.audioCtx = new AudioContext()
    this.gainNode = new GainNode(this.audioCtx, {
      gain: 0
    })
    this.analyser = new BaseAnalyser(this.audioCtx)
    this.muteNode = new GainNode(this.audioCtx, {
      gain: 1,
    })
  }

  initMediaStream = (stream: MediaStream, options: StreamOptions) => {
    this.stream = stream
    this.gainNode.gain.value = options.gain * this.maxGain
  }

  isEnabled = () => this.stream?.getAudioTracks()[0].enabled
  mute = () => { if (this.stream) this.stream.getAudioTracks()[0].enabled = false }
  unmute = () => { if (this.stream) this.stream.getAudioTracks()[0].enabled = true }
  connect = (audio?: React.RefObject<HTMLAudioElement>) => {
    if (this.stream)
    this.audioCtx
      .createMediaStreamSource(this.stream)
      .connect(this.gainNode) // first take gain changes from user
      .connect(this.analyser.node) // to show user the decibel level
      .connect(this.muteNode) // mutes output based on if it makes it through threshold
      .connect(this.audioCtx.destination)
  }
  setGain = (percent: number) => {
    if (this.gainNode) {
      this.gainNode.gain.value = percent * this.maxGain
      console.log(`gain = ${this.gainNode.gain.value}`)
    }
  }
  setThreshold = (percent: number) => {}
  stop = () => {
    this.stream?.getAudioTracks()[0].stop()
    this.gainNode?.disconnect()
    this.analyser?.unsubscribe(this.id)
    this.analyser?.node.disconnect()
    this.muteNode?.disconnect()
    this.audioCtx?.close()
  }

  subscribeToAnalyser = (format: AnalyserFormat, callback: (p: number) => void) => this.analyser?.subscribe(this.id, format, callback)
}

export class PeerControlStream extends PeerStream {
  /** used to cut out low decibels, this is what is  */
  private thresholdAnalyser: ThresholdAnalyser
  private lastPassthrough = new Date().getTime()
  private applyDynamicThreshold = () => {
    const check = (p: number) => {
      // sum > 0 if analyser detects anything above minDecibels
      // if we detect a high enough decibel level to allow passthrough, then we should
      // allow mic to passthrough until level drops (and stays) below threshold for a
      // brief amount of time
      let letPass = p > 0
      if (letPass) {
        // allow above threshold through at any time
        this.lastPassthrough = new Date().getTime()
      } else if (this.lastPassthrough && new Date().getTime() - this.lastPassthrough > 500) {
        letPass = false
      } else letPass = true

      this.muteNode!.gain.value = letPass ? 1 : 0
    }
    this.thresholdAnalyser?.subscribe('dynamicThreshold', AnalyserFormat.Percent, check)
  }
  private stopDynamicThreshold = () => {
    this.thresholdAnalyser?.unsubscribe('dynamicThreshold')
  }

  constructor(id: string) {
    super(id)
    this.thresholdAnalyser = new ThresholdAnalyser(this.audioCtx, 0.25)
  }

  connect = (audio?: React.RefObject<HTMLAudioElement>) => {
    if (audio?.current && this.stream) {
      const source = this.audioCtx.createMediaStreamSource(this.stream)
      const destination = this.audioCtx.createMediaStreamDestination()
      source
        .connect(this.gainNode) // first take gain changes from user
        .connect(this.analyser.node) // to show user the decibel level
        .connect(this.thresholdAnalyser!.node) // user variable minDecibels
        .connect(this.muteNode) // mutes output based on if it makes it through threshold
        .connect(destination)

      this.applyDynamicThreshold()

      audio.current.srcObject = destination.stream
    }
  }
  stop = () => {
    this.stream?.getAudioTracks()[0].stop()
    this.unsubscribeFromAnalyser()
    this.unsubscribeFromThresholdAnalyser()
    this.stopDynamicThreshold()
    this.gainNode?.disconnect()
    this.analyser?.unsubscribe(this.id)
    this.analyser?.node.disconnect()
    this.thresholdAnalyser?.unsubscribe(this.id)
    this.thresholdAnalyser?.node.disconnect()
    this.muteNode?.disconnect()
    // this.audioCtx.close()
    // this.source?.disconnect()
    // this.audio!.current!.srcObject = null
  }

  setThreshold = (percent: number) => this.thresholdAnalyser?.setThreshold(percent)
  unsubscribeFromAnalyser = () => this.analyser?.unsubscribe(this.id)
  subscribeToThresholdAnalyser = (format: AnalyserFormat, callback: (p: number) => void) =>
    this.thresholdAnalyser?.subscribe(this.id, format, callback)
  unsubscribeFromThresholdAnalyser = () => this.thresholdAnalyser?.unsubscribe(this.id)
}

export enum AnalyserFormat {
  Decibels,
  Percent,
}

class BaseAnalyser {
  public node: AnalyserNode
  protected absoluteMin = -90
  protected absoluteMax = -25
  private dataArray
  private interval?: NodeJS.Timeout
  /** subscriptions to the change in decibels */
  private callbacks: { name: string; format: AnalyserFormat; func: (db: number) => void }[]

  constructor(audioCtx: AudioContext) {
    this.node = new AnalyserNode(audioCtx, {
      fftSize: 64, //2048,
      minDecibels: this.absoluteMin,
      maxDecibels: this.absoluteMax,
      smoothingTimeConstant: 0.5,
    })
    this.dataArray = new Uint8Array(this.node.frequencyBinCount)
    this.callbacks = []
  }

  // uses range of this analysers min/max
  // percent is a fraction
  protected percentToDecibels = (percent: number) => {
    const totalRange = Math.abs(this.node.minDecibels - this.node.maxDecibels)
    const normalized = this.node.minDecibels + percent * totalRange
    console.log(`${normalized} db`)
    return normalized
  }

  update = () => {
    // get an array of frequency band values from 0 to 255
    // 0 = minDecibels and 255 = maxDecibels
    this.node.getByteFrequencyData(this.dataArray)

    // first get average of all frequencies
    // let sum = 0
    // for (var i = 0; i < this.node.frequencyBinCount; i++)
    //   sum += this.dataArray[i]
    // const average = sum / this.dataArray.length

    let max = 0
    for (var i = 0; i < this.node.frequencyBinCount; i++) max = this.dataArray[i] > max ? this.dataArray[i] : max

    // get percent (0-255 scale) and convert to decibels
    const percent = max / 255
    this.callbacks.forEach((c) => {
      let val = 0
      switch (c.format) {
        case AnalyserFormat.Decibels:
          val = this.percentToDecibels(max / 255)
          break
        case AnalyserFormat.Percent:
          val = percent
          break
      }
      c.func(val)
    })
  }

  subscribe = (name: string, format: AnalyserFormat, callback: (db: number) => void) => {
    if (!this.callbacks.some((c) => c.name === name)) {
      this.callbacks.push({
        name,
        format,
        func: callback,
      })
    }

    if (!this.interval) {
      this.interval = setInterval(() => this.update(), 30)
    }
  }

  unsubscribe = (name: string) => {
    this.callbacks = this.callbacks.filter((c) => c.name !== name)
    if (this.callbacks.length === 0 && this.interval !== undefined) {
      clearInterval(this.interval)
      this.interval = undefined
    }
  }
}

export class ThresholdAnalyser extends BaseAnalyser {
  constructor(audioCtx: AudioContext, thresholdPercent: number) {
    super(audioCtx)
    this.setThreshold(thresholdPercent)
  }

  /** uses absolute ranges, percent is a fraction */
  protected percentToThreshold = (percent: number) => {
    const totalRange = Math.abs(this.absoluteMin - this.absoluteMax)
    const normalized = this.absoluteMin + percent * totalRange
    return normalized
  }

  setThreshold = (percent: number) => {
    this.node.minDecibels = this.percentToThreshold(percent)
  }
}
