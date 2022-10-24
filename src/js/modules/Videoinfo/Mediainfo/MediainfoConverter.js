import { uniq, compact } from 'lodash-es'

export default class MediainfoConverter {
  convert(info) {
    const source = this.extractSource(info)
    const codec = this.extractCodec(info)
    const processing = this.extractProcessing(info, codec)
    const resolution = this.extractResolution(info) // '720p' | ['1', '2']
    const container = this.extractContainer(info, resolution)
    const subtitles = this.extractSubtitle(info) // ['Chinese Simplified']
    return {
      source,
      codec,
      processing,
      resolution,
      container,
      subtitles,
    }
  }

  extractSource(info) {
    const name = info['general']['complete name']
    return /bdrip|blu-?ray|bluray/i.test(name)
      ? 'Blu-ray'
      : /web/i.test(name)
      ? 'WEB'
      : /dvdrip|ifo|vob/i.test(name)
      ? 'DVD'
      : /hdtv/i.test(name)
      ? 'HDTV'
      : /tv/i.test(name)
      ? 'TV'
      : /vhs/i.test(name)
      ? 'VHS'
      : /hddvd/i.test(name)
      ? 'HD-DVD'
      : ''
  }

  extractContainer(info, resolution) {
    const format = info['general']['complete name']
    if (['PAL', 'NTSC'].includes(resolution)) {
      return 'VOB IFO'
    }
    return /mp4/i.test(format)
      ? '.mp4'
      : /ts/i.test(format)
      ? '.ts'
      : /mov/i.test(format)
      ? '.mov'
      : /mkv/i.test(format)
      ? '.mkv'
      : /vob/i.test(format)
      ? '.vob'
      : /mp3/i.test(format)
      ? '.mp3'
      : 'Other'
  }

  extractCodec(info) {
    // V_MPEGH/ISO/HEVC is H265 ?
    const completeName = info['general']['complete name']
    const video = info[][0]
    const format = video['format']
    const codecId = video['codec id']
    return format === 'AVC'
      ? encodingSettings
        ? 'x264'
        : 'H.264'
      : format.includes('HEVC')
      ? encodingSettings
        ? 'x265'
        : 'H.265'
      : format.includes('H265')
      ? 'H.265'
      : format === 'MPEG-4 Visual'
      ? codecId === 'XVID'
        ? 'XviD'
        : 'DivX'
      : /dvd5/i.test(completeName)
      ? 'DVD5'
      : /dvd9/i.test(completeName)
      ? 'DVD9'
      : format.includes('ProRes')
      ? 'ProRes'
      : format.includes('MPEG Video')
      ? 'MPEG-2'

      : 'Other'
  }

  extractProcessing(info, codec) {
    const completeName = info['general']['complete name']
    return /remux/i.test(completeName)
      ? 'Remux'
      : ['x264', 'x265'].includes(codec)
      ? 'Encode'
      : ['H.264', 'H.265'].includes(codec)
      ? 'Untouched'
      : ''
  }

  extractResolution(info) {
    const completeName = info['general']['complete name']
    const video = info['video'][0]
    const standard = video['standard']
    const scanType = video['scan type']

    let width = video['width']
    let height = video['height']
    width = width && width.match(/[0-9 ]+/)[0].replace(/ /g, '')
    height = height && height.match(/[0-9 ]+/)[0].replace(/ /g, '')

    // 1920x567 -> 1080p
    let resolution =
      /2160p/i.test(completeName) || width === '3840'
        ? '2160p'
        : /1080i/i.test(completeName) ||
          ((width === '1920' || (width < 1920 && height === '1080')) &&
            (scanType === 'Interlaced' || scanType === 'MBAFF'))
        ? '1080i'
        : /1080p/i.test(completeName) ||
          width === '1920' ||
          (width < 1920 && height === '1080')
        ? '1080p'
        : /720p/i.test(completeName) ||
          width === '1280' ||
          (width < 1280 && height === '720')
        ? '720p'
        : /576i/i.test(completeName) ||
        ((width === '720' || (width < 720 && height === '576')) &&
          (scanType === 'Interlaced' || scanType === 'MBAFF'))
        ? '576i'
        : width === '720'
        ? '576p'
        : /480i/i.test(completeName) ||
        ((width === '854' || (width < 854 && height === '480')) &&
          (scanType === 'Interlaced' || scanType === 'MBAFF'))
        ? '480i'
        : width === '854' || height === '480'
        ? '480p'
        : standard === 'PAL'
        ? 'PAL'
        : standard === 'NTSC'
        ? 'NTSC'
        : 'Other'

    if (resolution === 'Other' && width && height) {
      resolution = [width, height]
    }

    return resolution
  }

  extractSubtitle(info) {
    const texts = info['text']
    const subtitles = []
    for (const text of texts) {
      const language = text['language'] || text['title']
      if (!language) {
        continue
      }
      let extra = ''
      if (language === 'Chinese') {
        const title = compact([text['language'], text['title']]).join('\n')
        extra = title.match(/traditional|繁|cht/i)
          ? ' Traditional'
          : title.match(/simplified|简|chs/i)
          ? ' Simplified'
          : ' Simplified'
      }
      subtitles.push(`${language}${extra}`)
    }
    return uniq(subtitles)
  }
}
