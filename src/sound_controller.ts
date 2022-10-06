// TODO: calibrate these
const minEmaDifference = 10
const lowestIndex = 180
const highestIndex = 300
const maxVolume = 255
const maxSpikes = 20
const shortInfluence = 0.4
const longInfluence = 0.1
const frequenciesInfluence = 10

// EMA smoothing convenience utility
class EmaSmoother {
  private time: number

  constructor(time: number = 1) {
    this.time = time
  }

  smooth(initial, final, influencePerSecond): number {
    const influence = Math.min(1, influencePerSecond * this.time)

    return initial + (final - initial) * influence
  }

  smoothArray(initial, final, influencePerSecond): void {
    for (let index = 0; index < initial.length; index++) {
      initial[index] = this.smooth(initial[index], final[index], influencePerSecond)
    }
  }
}

class SpikeDetector {
  static consumeArray(array: Array<number>): Array<number> {
    const detector = new this

    for (let index = 0; index < array.length; index++) {
      detector.consume(array[index], index)
    }

    return detector.spikes; //.reduce((acc, el) => array[el] > array[acc] ? el : acc, 0)
  }

  spikes: Array<number>

  private smoother: EmaSmoother
  private short: number = -1
  private long: number = -1
  private spiking: boolean = false
  private spikeHighest: number = 0
  private spikeHighestIndex: number = 0

  constructor() {
    this.smoother = new EmaSmoother
    this.spikes = []
  }

  consume(value: number, index: number): void {
    if (this.short < 0) this.short = value
    if (this.long < 0) this.long = value

    this.short = this.smoother.smooth(this.short, value, shortInfluence)
    this.long = this.smoother.smooth(this.long, value, longInfluence)

    this.checkTransitions()

    if (this.spiking) {
      if (value > this.spikeHighest) {
        this.spikeHighest = value
        this.spikeHighestIndex = index
      }
    }
  }

  private checkTransitions() {
    if (!this.spiking && this.short > this.long + minEmaDifference) {
      this.spiking = true
    }
    else if(this.spiking && this.short <= this.long) {
      this.spiking = false
      this.registerSpike()
      this.spikeHighest = 0
      this.spikeHighestIndex = -1
    }
  }

  private registerSpike() {
    if (this.spikes.length >= maxSpikes) return

    const index = this.spikeHighestIndex;
    if (index < lowestIndex || index > highestIndex) return



    const indexRatio = (index - lowestIndex) / highestIndex
    const magnitudeRatio = this.spikeHighest / maxVolume
    this.spikes.push(indexRatio)
    this.spikes.push(magnitudeRatio)
    console.log(magnitudeRatio)
  }
}

export class SoundController {
  static async requestPermissions(): Promise<SoundController> {
    return new Promise((resolve, reject) => {
      require('getusermedia')({audio: true}, function (err, stream) {
        if (err) {
          reject(err)
          return
        }

        resolve(new SoundController(stream));
      })
    })
  }

  frequencies: number[]
  spikes: Array<number> = []

  spikeRatio: number = 0.5
  currentMax: number = 0

  private rawFrequencies: Uint8Array
  private analyser: AnalyserNode

  constructor(stream: MediaStream) {
    const context = new AudioContext()
    this.analyser = context.createAnalyser()

    context.createMediaStreamSource(stream).connect(this.analyser)

    const fftSize = this.analyser.frequencyBinCount
    this.frequencies = new Array(fftSize).fill(0)
    this.rawFrequencies = new Uint8Array(fftSize)

    // const fftBuffer = regl.buffer({
    //   length: fftSize,
    //   type: 'uint8',
    //   usage: 'dynamic'
    // })
  }

  update(time: number): void {
    const smoother = new EmaSmoother(time)

    this.analyser.getByteFrequencyData(this.rawFrequencies)
    smoother.smoothArray(this.frequencies, this.rawFrequencies, frequenciesInfluence)

    this.spikes = SpikeDetector.consumeArray(this.frequencies)
    //console.log(spikeIndex)
    //if (spikeIndex > 45 && spikeIndex < 150) {
      //const tempMax = this.frequencies[spikeIndex]
      //this.currentMax = smoother.smooth(this.currentMax, tempMax, 2)
      //if (tempMax > this.currentMax * 0.8) {
        //this.spikeRatio = smoother.smooth(this.spikeRatio, spikeIndex / this.frequencies.length, 2)
      //}
    //}
  }
}
