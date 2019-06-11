/*function renderParams(c, layers, stickerId, stretch) {
  var paramsRaw = []
  var color1 = '#462B11'
  var color2 = '#F9DDC4'
  var color3 = '#3B3128'
  var color4 = '#DC1478'
  var isWoman = 0

  var width = 640.6
  var height = 841.9

  for(var i in layers) {
    var layerId = layers[i]
    if (layerId === 0) {
      isWoman = 1
    }
    if (layerId) {
      paramsRaw.push(layerId)
    }
    if (Colors.eyes[layerId]) {
      color1 = '#'+Colors.eyes[layerId]
    }
    if (Colors.skin[layerId]) {
      color2 = '#'+Colors.skin[layerId]
    }
    if (Colors.hair[layerId]) {
      color3 = '#'+Colors.hair[layerId]
    }
    if (Colors.accessories[layerId]) {
      color4 = '#'+Colors.accessories[layerId]
    }
  }
  var params = []
  for(var i in paramsRaw) {
    params.push(parseInt(paramsRaw[i]))
  }
  var out = ''

  if (stickerId) {
    var layersCut = {}
    if (Stickers[stickerId]) {
      for(var i in Stickers[stickerId].sections) {
        var cutRows = Config[Stickers[stickerId].sections[i]]
        if (!cutRows) {
          continue
        }
        for(var k in cutRows) {
          layersCut[parseInt(cutRows[k])] = true
        }
      }
    }
  }

  if (stretch) {
    stretch = stretch.split(':')
    for(var i in stretch) {
      stretch[i] = parseFloat(stretch[i])
    }
  }

  for(k in c) {
    var layerName = c[k][0]+''
    var layerBody = c[k][1]
    var layerTag = c[k][2]

    if (!layerName) {
      continue
    }

    if (layerName == 'head' || layerName == 'tail') {
      out += layerBody
      continue;
    }

    var isSticker = false
    var layerMatch = layerName.match(/^(s?)([wm]?)([0-9]+)$/)
    if (!layerMatch) {
      continue
    }
    var layerId = parseInt(layerMatch[3])
    var layerSex = layerMatch[2]
    if (!isWoman && layerSex == 'w') {
      continue;
    }
    if (isWoman && layerSex == 'm') {
      continue;
    }
    if (layerMatch[1]) {
      isSticker = true
    }
    if (isSticker) {
      if (stickerId != layerId || !stickerId) {
        continue
      }
    } else if (!layerId || params.indexOf(layerId) == -1) {
      continue
    } else if (stickerId && layersCut[layerId]) {
      continue
    }

    var transform = ''
    if (stretch) {
      switch(layerTag) {
        case 'head':
          transform = 'scale(1.000000 '+(stretch[0])+') translate(0 '+(height*0.61 * (1 - stretch[0]))+')'
          break;
        case 'hair':
          transform = 'translate(0 '+(height*0.61 * (1 - stretch[0]))+')'
          break;
        case 'eyebrows':
          transform = 'translate(0 '+(height*0.55 * (1 - stretch[0]))+')'
          break;
        case 'eyes':
          transform = 'translate(0 '+(height*0.37 * (1 - stretch[0]))+')'
          break;
        case 'nose':
          transform = 'translate(0 '+(height*0.25 * (1 - stretch[0]))+')'
          break;
        case 'mouth':
          transform = 'translate(0 '+(height*0.10 * (1 - stretch[0]))+')'
          break;
        case 'ears':
          transform = 'translate(0 '+(height*0.50 * (1 - stretch[0]))+')'
          break;
      }

    }
    if (transform) {
      layerBody = layerBody.replace('<g id=\"'+layerName+'\">', '<g id=\"'+layerName+'\" transform=\"'+transform+'\">')
    }
    out += layerBody
  }

  out = out.replace(/#462B11/g, color1).replace(/#F9DDC4/g, color2).replace(/#3B3128/g, color3).replace(/#DC1478/g, color4)

  return out
}*/
