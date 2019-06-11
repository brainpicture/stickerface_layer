var CurCat = 0;
var isWoman = 0;
var USER_ID, KEY;

var App = {
  parseParams: function() {
    var queryParams = parseUrlQuery();

    var color = queryParams.color || '1246f5';
    if (color && color.match(/^[a-z0-9]+$/)) {
      $('.circle-loader').css('stroke', color);
      $('.save_button').css('background-color', color);
    }

    $('#loader_wrap').css('opacity', 1);
  },
  init: function (init_str, layerType, langCode, v, opts) {
    // layerType 0 - def editor screen, 1 - stickers screen, 2 - sdk mode, save button
    if (!opts) {
      opts = {}
    }
    var hashData;
    this.layers = {}
    this.v = v
    this.dev = opts.dev
    this.layerType = layerType
    if (init_str) {
      hashData = init_str.split(':')
    } else {
      hashData = location.hash ? location.hash.substr(1).split(':') : false
    }

    if (!hashData) {
      hashData = '1:ios:0;33;69;83;137,41;6;32;40;39;76;25;87;17/'.split(':')
    }

    $('#step1').hide();
    $('#step2, #error_wrap, #animation_step').removeClass('shown');
    $('#stickers').html('');

    USER_ID = hashData[0]
    KEY = hashData[1]
    if (KEY == "admin" && !layerType) { //admin edit more
      this.layerType = 2;
      this.showPhotoPreview()
    }

    var layersRaw = (hashData[2] || '').split('/');

    this.layers = this.stringToLayers(layersRaw[0])

    this.stretch = layersRaw[1]

    isWoman = this.layers["0"] == true
    //fixing order
    // end fixing order

    $('.gender_button').toggleClass('male', !isWoman).show();

    this.setLang(langCode)

    if (layerType == 1) {
      App.renderStickers()
    } else {
      this.updatePreview()
      this.renderCategories()
      this.renderItems()
      $('#step1').show();
      App.bindEvents();
    }
    if (navigator.userAgent.match(/iPhone/)) {
      $('body').addClass('ios');
    }

    //$('#loader_wrap').remove();

    if (KEY === 'ios' || KEY === 'android') {
      $('.camera_button').show();
      webviewMessage('camera', 'stickerRenderCompleted');
    }
    var self = this
    $("#items").on("scroll", function() {
      self.scrolling = true
      clearTimeout(self.scrollintInt)
      self.scrollintInt = setTimeout(function() {
        self.scrolling = false
      }, 100)
    })
  },
  showPhotoPreview: function() {
      var photo = window.localStorage.getItem('photo'+USER_ID);
      if (!photo) {
        return
      }
      $('#step1').prepend('<img class="photo_preview" src="'+photo+'" onclick="$(this).toggleClass(\'fullscreen\')" onclick="$(this).toggleClass(\'fullscreen\')" />')
  },
  stringToLayers: function(str) {
    var out = {}
    var layers = str.split(/[;,]/g)
    var layerKeys = {}
    for (var i = 0; i < layers.length; i++) {
      layerKeys[String(layers[i])] = true
    }
    layerKeys["160"] = true // editor eyes hack
    layerKeys["159"] = true
    if (layerKeys["25"] && !layerKeys["0"]) {
      layerKeys["0"] = true
      console.log("no sex indifier bug autofix")
    }
    if (layerKeys["0"]) {
      isWoman = true
      out["0"] = true
    } else {
      isWoman = false
    }
    var conf = this.getLayersConf()

    for(var sect in conf) {
      layersHas = []
      for(var i in conf[sect]) {
        var layerRaw = conf[sect][i]
        var layerIds = layerRaw.split(',')
        var ok = true
        for(var n in layerIds) {
          if (layerIds[n] != "0" && !layerKeys[layerIds[n]]) {
            ok = false
          }
        }
        if (ok && layerRaw != "0") {
          out[layerRaw] = true
        }
      }
    }
    for(var col in Config.colors) {
      for(var i in Config.colors[col]) {
        var layerId = Config.colors[col][i]["id"]
        if (layerKeys[String(layerId)]) {
          out[String(layerId)] = true
        }
      }
    }
    return out
  },
  getLayers: function() {
    var res = []
    for (k in this.layers) {
      res.push(k)
    }
    return res
  },
  getLayersConf: function () {
    return Config.sections[isWoman ? 'woman' : 'man'];
  },
  changeGender: function () {
    isWoman = !isWoman
    $('.gender_button').toggleClass('male', !isWoman);

    var curLayers = Object.assign({}, this.layers)

    if (!window.prevLayers) {
      var saveColors = {}
      for (var colorType in Config.colors) {
        for (var k in Config.colors[colorType]) {
          var color = Config.colors[colorType][k]
          var colorId = String(color.id);
          if (this.layers[colorId]) {
            saveColors[colorId] = true
          }
        }
      }

      var layersConf = this.getLayersConf();
      this.layers = saveColors
      for (var i in layersConf) {
        if (i.substr(0,5) == "color") {
          continue
        }
        var toPush = false
        for(var k in layersConf[i]) {
          var l = layersConf[i][k]
          if (l > 0 && curLayers[l]) {
            toPush = l
            break
          }
        }
        var layer = layersConf[i][0];
        if (!toPush && parseInt(layer) > 0) {
           toPush = layer
        }
        if (toPush) {
          this.layers[String(toPush)] = true
        }
      }
    } else {
      this.layers = Object.assign({}, window.prevLayers);
    }
    if (isWoman) {
      this.layers[0] = true
    } else {
      delete(this.layers[0])
    }
    window.prevLayers = curLayers

    this.updatePreview()
    var self = this
    setTimeout(function() {
      $('#categories, #items').html('');
      self.renderCategories()
      self.renderItems()
    }, 50)
  },
  scrollIsLock: function () {
    return window.lockOnScroll > 0 && new Date().getTime() - window.lockOnScroll < 200;
  },
  itemsOnScroll: function () {
    var wrap = $('#items')
    var st = wrap[0].scrollTop

    if (App.scrollIsLock()) {
      return
    }

    var catEls = $('.cat_name')
    var selCat = catEls[0].id.replace('cat_', '')
    for (var i = catEls.length - 1; i > 0; i--) {
      if (catEls[i].offsetTop - 100 < st) {
        selCat = catEls[i].id.replace('cat_', '')
        break;
      }
    }

    if (selCat !== CurCat) {
      CurCat = selCat
      App.selectCategory(CurCat, 1)
    }
  },
  updatePreview: function () {
    var src = genSvgSrc(renderParamsCustom(this.layers, this.stretch))

    if (window.previewImageHelper) {
      delete window.previewImageHelper
    }
    window.previewImageHelper = new Image();
    window.previewImageHelper.onload = function () {
      $('#preview').css('background-image', 'url(' + src + ')')
    };
    window.previewImageHelper.src = src;
  },
  renderCategories: function () {
    var out = ''
    var layersConf = this.getLayersConf();
    var cats = Config.sections.order
    for (var i in cats) {
      var cat = cats[i];
      var item = layersConf[cat]
      if (cat.indexOf('Colors') !== -1 || item.length <= 1) {
        continue
      }

      out += '<div class="category" id="category_' + cat + '" onmousedown="App.selectCategory(\'' + cat + '\')" onclick="App.selectCategory(\'' + cat + '\')">\
         <div class="category_name">' + (lang[cat + 'Cat'] ? lang[cat + 'Cat'] : cat) + '</div>\
      </div>'
    }

    $('#categories').html(out)
    this.selectCategory(cats[0])
  },
  pushLayersCat: function(layersConf, items) {
    if (items.length) {
      var pushItem = (items[0] !== '0') ? items[0] : items[1]
        if (pushItem) {
          layersConf[pushItem] = true
      }
    }
    return layersConf
  },
  renderItems: function () {
    var layersConf = this.getLayersConf();
    var cats = Config.sections.order

    $('#items').html('');

    var out = ''
    for (var i in cats) {
      var cat = cats[i]
      var layers = layersConf[cat]
      if (cat.indexOf('Colors') !== -1 || layers.length <= 1) {
        continue
      }

      out += '<div class="cat_name" id="cat_' + cat + '">' + (lang[cat + 'Cat'] ? lang[cat + 'Cat'] : cat) + '</div>'

      var activeColor = false
      if (Config.colors[cat]) {
        out += '<div class="colors_wrap">';
        for (var k in Config.colors[cat]) {
          var color = Config.colors[cat][k]
          out += '<div class="color_wrap" onmousedown="App.selectColor(\'' + cat + '\', \'' + color.id + '\')" onclick="App.selectColor(\'' + cat + '\', \'' + color.id + '\')">' +
            '<div class="color _cat_color_' + cat + '" id="color_' + color.id + '">' +
            '<div class="color_cont" style="background-color: #' + color.hash +'"></div>' +
            '<div class="color_active_border" style="background-color: #' + color.hash +'"></div>' +
            '</div>' +
            '</div>'

          if (activeColor === false && this.layers[color.id]) {
            activeColor = color.id
          }
        }
        out += '</div>'
      }

      out += '<div class="items_cat">';
      var activeLayer = false
      for (var j = 0; j < layers.length; j++) {
        var layer = layers[j]
        let renderLayers = {}
        renderLayers[layer] = true
        if (cat !== 'head' && layer != '0') {
          renderLayers[5] = true
          renderLayers[2] = true
        }
        if (cat == 'eyes') {
          renderLayers = this.pushLayersCat(renderLayers, layersConf['eyeballs'])
          renderLayers = this.pushLayersCat(renderLayers, layersConf['pupils'])
        }
        let layerId = 'layer_'+layer.replace(/\,/g, '_')

        var noneCont = ''
        if (layer === 0 || layer === '0' || Config.empty_ids.indexOf(parseInt(layer)) !== -1) {
          noneCont = '<div class="item_none_str">' + lang.none + '</div>'
          if (activeLayer === false && layer !== '0') {
            activeLayer = layer
          }
        } else {
          setTimeout(function() {
            var svg = renderParamsCustom(renderLayers)
            $('#'+layerId+' .item_cont').css('background-image', 'url(' + genSvgSrc(svg) + ')')
          }, 0)
        }
        out += '<div class="item_layer _cat_item_' + cat + '" id="' + layerId + '" onmousedown="App.selectLayer(\'' + cat + '\', \'' + layer + '\')"  onclick="App.selectLayer(\'' + cat + '\', \'' + layer + '\')" >\
          <div class="item_cont">\
            '+noneCont+'\
          </div>\
        </div>'

        if (layer !== '0' && this.layers[layer]) {
          activeLayer = layer
        }
      }
      out += '</div>'

      $('#items').append(out)
      this.selectLayer(cat, activeLayer === false ? 0 : activeLayer)

      if (Config.colors[cat]) {
        this.selectColor(cat, activeColor === false ? 0 : activeColor, 1)
      }

      out = ''
    }
  },
  pushLayer: function(section, newLayer, isColor) {
    if (!section) {
      return
    }
    newLayer = String(newLayer)
    var conf = isColor ? Config.colors[section] : App.getLayersConf()[section]
    for(var k in conf) {
      var l = isColor ? conf[k].id : conf[k]
      if (this.layers[String(l)]) {
        delete this.layers[String(l)]
      }
    }
    if (newLayer) {
      this.layers[newLayer] = true
    }
  },

  selectColor: function (cat, color) {
    $('._cat_color_' + cat + '.active').removeClass('active');
    $('#color_' + color).addClass('active');
    this.pushLayer(cat, color, 1);
    this.updatePreview()
  },
  selectCategory: function (category, noScroll) {
    $('#category_' + this.activeCategory).removeClass('active')

    this.activeCategory = category

    var el = $('#category_' + category).addClass('active')
    $('#categories').stop().animate({scrollLeft: el[0].offsetLeft - $('#categories').width() / 2 + el[0].offsetWidth / 2}, 150);

    var catEl = $('#cat_' + category)
    if (!catEl.length || noScroll) {
      return
    }

    window.lockOnScroll = new Date().getTime()

    $('#items').stop().animate({
      scrollTop: catEl.offset().top - $('#items').offset().top + $('#items')[0].scrollTop
    }, 150)
  },
  selectLayer: function (cat, layer, skip_update) {
    if (this.scrolling) return;
    this.pushLayer(cat, layer)
    if (!skip_update) {
      this.updatePreview()
    }

    $('._cat_item_' + cat + '.active').removeClass('active')
    var el = $('#layer_' + String(layer).replace(/\,/g, '_')).addClass('active')
  },
  saveStickers: function (btn) {
    var l = this.getLayers().join(';')
    if (KEY === 'admin') {
      window.localStorage.setItem('save'+USER_ID, l);
      window.close()
      return
    } else if (KEY === 'ios' || KEY === 'android' || this.dev) {
      $.getJSON('https://stickerface.io/api/save?user_id='+USER_ID+'&platform='+KEY+'&layers='+l+'&jsoncallback=?', {
        format: "json"
      }).done((data) => {
        if (data.error) {
          App.showError(data.error)
        }
      })
      if (this.layerType == 2) {
        return webviewMessage('save', l);
      } else {
        return App.renderStickers()
      }
    }
    if ($(btn).hasClass('loading')) {
      return
    }

    $.get('/bot/save?user_id='+USER_ID+'&key='+KEY+'&layers='+this.getLayers().join(',')).done(function() {
      clearTimeout(window.animTimer)
      $('#step1, #animation_step').hide();
      $('#step2').addClass('shown');
    }).fail(function (xhr) {
      $(btn).removeClass('loading');
      App.showError(xhr.responseJSON.error)
    })

    $('#step1').hide();
    $('#animation_step').css('display', 'flex');
    this.renderAnimStickers();
    $(btn).addClass('loading');
  },
  showError: function(text) {
    clearTimeout(window.animTimer)
    $('#animation_step').css('display', 'none');
    $('#error_wrap').addClass('shown');
    $('#error_text').html(text);
  },
  shareSticker: function (sticker_id) {

    var sizeW = 389
    var sizeH = 512

    var canvas = document.createElement('canvas');
    canvas.width = sizeW
    canvas.height = sizeH

    var ctx = canvas.getContext('2d')

    var image = new Image();
    image.width = sizeW;
    image.height = sizeH;
    image.setAttribute('crossOrigin', 'anonymous');
    var ver = this.v
    image.onload = function () {
      ctx.drawImage(image, 0, 0, sizeW, sizeH);
      if (ver > 2) {
        var imageData = ctx.getImageData(0, 0, sizeW, sizeH);
        //webviewMessage('nativeShareSticker', "hello");//imageData.data);
        webviewMessage('nativeShareSticker', imageData.data);
      } else {
        var dataURL = canvas.toDataURL();
        dataURL = dataURL.replace('data:image/png;base64', '')
        webviewMessage('nativeShareSticker', dataURL);
      }
    };
    image.src = genSvgSrc(renderParamsCustom(this.layers, this.stretch, sticker_id));
  },
  sharePackTelegram: function() {
    if (this.telegramShared) {
      return true
    }
    this.telegramShared = true
    $.getJSON('https://stickerface.io/bot/share_telegram_bot?user_id='+USER_ID+'&platform=' + KEY + '&layers=' + this.getLayers().join(',')+'&jsoncallback=?', {
      format: "json"
    }).done((data) => {
      this.telegramShared = false
      if (data.error) {
        App.showError(data.error)
        return
      }

      var key = data.start//USER_ID
      var link = 'https://t.me/stickerfacebot?start='+key
      webviewMessage('telegramShare', key);
      App.alert(lang.tgPressStart)
      //$('#telegram_share').html(`<div class="link_caption">${lang.tgPressStart}</div>`)
    })
  },
  renderShareStickerpack: function() {
    if (!this.v || this.v < 1) {
      return ''
    }
    //var botStart = 'https://t.me/stickerfacebot?start='+USER_ID;
    return '<div class="stickers_caption">' + lang.stickersShareCaption + '</div>' +
    '<div class="stickers_title">'+lang.stickersSharePack+'</div>'+
    `
<div class="stickers_share_wrap"><div class="stickers_pack_share" id="telegram_share" onmousedown="App.sharePackTelegram()" onclick="App.sharePackTelegram()">
<div class="loading_wrap">loading</div>
<svg width="90" height="90" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 240 240">
<defs>
	<linearGradient id="b" x1="0.6667" y1="0.1667" x2="0.4167" y2="0.75">
		<stop stop-color="#37aee2" offset="0"/>
		<stop stop-color="#1e96c8" offset="1"/>
	</linearGradient>
	<linearGradient id="w" x1="0.6597" y1="0.4369" x2="0.8512" y2="0.8024">
		<stop stop-color="#eff7fc" offset="0"/>
		<stop stop-color="#fff" offset="1"/>
	</linearGradient>
</defs>
<circle cx="120" cy="120" r="120" fill="url(#b)"/>
<path fill="#c8daea" d="m98 175c-3.8876 0-3.227-1.4679-4.5678-5.1695L82 132.2059 170 80"/>
<path fill="#a9c9dd" d="m98 175c3 0 4.3255-1.372 6-3l16-15.558-19.958-12.035"/>
<path fill="url(#w)" d="m100.04 144.41 48.36 35.729c5.5185 3.0449 9.5014 1.4684 10.876-5.1235l19.685-92.763c2.0154-8.0802-3.0801-11.745-8.3594-9.3482l-115.59 44.571c-7.8901 3.1647-7.8441 7.5666-1.4382 9.528l29.663 9.2583 68.673-43.325c3.2419-1.9659 6.2173-0.90899 3.7752 1.2584"/>
</svg>
<div class="stickers_share_title">Telegram</div>
</div></div>`
  },
  renderStickers: function () {
    var cont = '<div class="stickers_back" onclick="App.openCamera()">' +
        '<div class="stickers_back_icon"></div>' +
        '<div class="stickers_back_str">' + lang.stickersBack + '</div>' +
      '</div>' +
      '<div class="stickers_caption">' + lang.stickersCaption + '</div>' +
      '<div class="stickers_title">' + lang.stickersTitle + '</div>' +
      '<div class="stickers_wrap">'
    for (var i in Config.stickers) {
      cont += '<div class="sticker" onclick="App.shareSticker(' + i + ')">' +
        '<div class="sticker_cont" style="background-image: url(' + genSvgSrc(renderParamsCustom(this.layers, this.stretch, i)) + ');"></div>' +
        '</div>'
    }
    cont += '</div>' + this.renderShareStickerpack()
    $('#step1').hide()
    $('#stickers').html(cont)

    webviewMessage('saveLayers', this.getLayers().join(';'));
  },
  renderAnimStickers: function () {
    var cont = ''
    var ii = -1
    for (var i in Config.stickers) {
      cont += '<div class="anim_sticker" style="background-image: url(' + genSvgSrc(renderParamsCustom(this.layers, this.stretch, i)) + ');"></div>'
    }
    $('.animation_previews').html(cont)
    window.animMax = Object.keys(Config.stickers).length - 1
    window.animPos = -1
    window.animRuntime = 0
    App.startAnimation()
  },
  startAnimation: function(fast) {
    window.animTimer = setTimeout(function () {
      $('.anim_sticker.active').removeClass('active')

      window.animPos++
      if (window.animPos >= window.animMax) {
        window.animPos = 0
      }

      $('.anim_sticker').eq(window.animPos).addClass('active')

      App.startAnimation()

      window.animRuntime += 200

      if (window.animRuntime >= 2000) {
        $('.animation_title').html('Uploading to Telegram..')
      }
    }, fast ? 0 : 250)
  },
  openCamera: function () {
    if (!webviewMessage('camera', 'show')) {
      $('#step1').show()
      $('#stickers').html('')
    }
  },
  bindEvents: function () {
    if (window.eventsBinded) {
      return
    }
    window.eventsBinded = true
    $('#items').bind('scroll', App.itemsOnScroll);
    $('#categories').bind('scroll', function () {
      webviewMessage('scrollIsLocked');
    });
  },
  alert: function(text) {
    var tt = $('#tooltip')
    tt.html('<div class="alert">'+text+'</div>')
    tt.hide();
    setTimeout(function() {
      tt.fadeIn(400)
      setTimeout(function() {
        App.tooltipHide()
      }, 10000)
    }, 0)
  },
  tooltipHide: function() {
    var tt = $('#tooltip')
    tt.fadeOut(400)
  },
  setLang: function (langCode) {
    const lang = langs[langCode] ? langs[langCode] : langs['en']
    window.lang = lang
    $('#step2_title').html(lang.tgSharedTitle);
    $('#step2_caption').html(lang.tgShareCaption);
    $('.step2_small_text').html(lang.tgShareCaption2);
    $('.animation_title').html(lang.processing);
    $('#error_title').html(lang.error);
  }
}


function renderParamsCustom(layers, stretch, stickerId) {
  var _layers = []
  for (var k in layers) {
    var layer_items = k.split(',');
    for (var j = 0; j < layer_items.length; j++) {
      var layer = parseInt(layer_items[j])
      if (layer > 0) {
        _layers.push(layer)
      }
    }
  }
  if (isWoman) {
    _layers.unshift(0)
  }
  if (stickerId) {
    _layers.unshift('s' + stickerId)
  }
  return renderParams(_layers.join(',') + '/' + stretch)
}


function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
}

function genSvgSrc(svg) {
  return 'data:image/svg+xml;base64,'+b64EncodeUnicode(svg)
}

var androidBridge = window.AndroidBridge;
var iosBridge = window.webkit && window.webkit.messageHandlers;
function webviewMessage(handler, data) {
  if (androidBridge && androidBridge[handler]) {
    androidBridge[handler](data);
    return true
  }
  if (iosBridge && iosBridge[handler]) {
    iosBridge[handler].postMessage(data);
    return true
  }
  return false
}

var langs = {
  en: {
    save: 'Save',
    createButton: 'Create Stickers',
    tgSharedTitle: 'Wow!',
    tgShareCaption: 'Your stickerpack is ready.',
    tgShareCaption2: 'Now you can go back to the chat.',
    processing: 'Processing..',
    error: 'Error!',
    stickersBack: 'new stickerpack',
    stickersCaption: 'tap on sticker',
    stickersTitle: 'My Stickers',
    none: 'NONE',
    stickersSharePack: 'Export all',
    stickersShareCaption: 'Full stickerpack',
    tgPressStart: 'Press START at dialog with bot',
  },
  ru: {
    save: 'Сохранить',
    createButton: 'Получить стикеры',
    tgSharedTitle: 'Wow!',
    tgShareCaption: 'Ваш стикерпак готов.',
    tgShareCaption2: 'Теперь вы можете вернуться в чат.',
    processing: 'Создание..',
    error: 'Ошибка!',
    stickersBack: 'новый стикерпак',
    stickersCaption: 'нажмите на стикер',
    stickersTitle: 'Мои стикеры',
    none: 'НЕТ',
    hairCat: 'волосы',
    eyesCat: 'глаза',
    beardCat: 'борода',
    headCat: 'голова',
    noseCat: 'нос',
    eyebrowsCat: 'брови',
    glassesCat: 'очки',
    stickersSharePack: 'Экспортировать все',
    stickersShareCaption: 'Стикерпак целиком',
    tgPressStart: 'Нажмите START в диалоге с ботом',
  }
};

function parseUrlQuery() {
  var search = location.search.substring(1);
  if (!search) {
    return {};
  }
  return JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
}
