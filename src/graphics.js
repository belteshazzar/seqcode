/* (c) 2016 Daniel Walton (daniel@belteshazzar.com) (Unpublished)
 * All Rights Reserved.
 */

export const ALIGN_LEFT = "start";
export const ALIGN_CENTER = "middle";
export const ALIGN_RIGHT = "end";

export class Graphics {

  constructor(_config) {
    this.config = _config;
    this.svg = _config.svg;
    this.textAnchor = "start";
    this.dx = 0
    this.dy = 0
  }

  setTranslation(dx,dy) {
    this.dx = dx
    this.dy = dy
  }

  margin() {
    return this.config.margin;
  };

  rowSpacing() {
    return this.config.rowSpacing;
  };

  objectSpacing() {
    return this.config.objectSpacing;
  };

  arrowSize() {
    return this.config.arrowSize;
  };

  areaPadding() {
    return this.config.areaPadding;
  };

  setSize(w, h) {
    this.svg.size(w, h)
    this.svg.viewbox(0, 0, w, h)
    this.svg.rect(w, h)
      .fill(this.config.background)
      //.stroke({ color: this.config.foreground, width: 1 });

    const link = this.svg.link("https://seqcode.app")
      .target("_blank")
    const text = link.plain("seqcode ") // space for size hack with font size
      .attr('text-anchor', ALIGN_RIGHT)
      .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFamily })
      .fill({ color: this.config.linkIconColor })
      .amove(w-this.config.fontSize*0.3,h-this.config.fontSize*0.3-3)

    // const icon = link.path("M6 1h5v5L8.86 3.85 4.7 8 4 7.3l4.15-4.16zM2 3h2v1H2v6h6V8h1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1")
    //   .fill(this.config.linkIconColor)
    //   .size(this.config.fontSize,this.config.fontSize)
    //   .x(w-this.config.fontSize*1.2)
    //   .y(h-this.config.fontSize*1.2)


      //link.transform({translate: [w-linkBox.width-5, h-linkBox.height+5]})
  };

  widthOf(str) {
    const txt = this.svg.text(str).font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFamily });
    const w = txt.bbox().width
    txt.remove()
    return w
  };

  widthOfNote(str) {
    const txt = this.svg.text(str).font({ size: this.config.noteFontSize, weight: this.config.noteFontWeight, family: this.config.noteFontFamily });
    const w = txt.bbox().width
    txt.remove()
    return w
  };

  frameLabel(x, y, w, h, text) {
    let g = this.svg.group()
    g.transform({
      translateX: this.dx,
      translateY: this.dy
    })
    
    g.polygon([
      [x, y], // top left
      [x, y + h], // bottom left
      [x + w - 10, y + h], // bottom right
      [x + w, y + h - 10], // bottom right
      [x + w, y] // top right
    ])
      .fill(this.config.fill)
      .stroke({ color: this.config.foreground, width: 1 });

      if (text) {
        g.plain(text)
          .attr('x',x + w / 2)
          .attr('y',y + h / 2)
          .attr('dominant-baseline', 'middle')
          .attr('text-anchor', 'middle')
          .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFamily })
          .fill({ color: this.config.foreground })
      }
  }


  text(str, x, y, align) {
    if (align !== ALIGN_LEFT && align != ALIGN_CENTER && align != ALIGN_RIGHT) {
      throw new Error("Invalid alignment: " + align);
    }
    let g = this.svg.group()
    g.plain(str)
      .attr('text-anchor', align)
      .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFamily })
      .stroke({ color: this.config.background, width: 2 })
      .amove(this.dx + x, this.dy + y - (this.config.fontSize / 3))
    g.plain(str)
      .attr('text-anchor', align)
      .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFamily })
      .fill({ color: this.config.foreground })
      .amove(this.dx + x, this.dy + y - (this.config.fontSize / 3))
    return g;
    // const w = this.widthOf(str)
    // this.svg.line(x, y, x + w, y)
    //   .stroke({ color: 'red', width: 1 })
  };

  line(x1, y1, x2, y2) {
    this.svg.line(this.dx + x1, this.dy + y1, this.dx + x2, this.dy + y2).stroke({ color: this.config.foreground, width: 1 })
  };

  dashedLine(fromX, fromY, toX, toY) {
    this.svg.line(this.dx + fromX, this.dy + fromY, this.dx + toX, this.dy + toY)
      .attr('stroke-dasharray', this.config.dashStyle.join(' '))
      .stroke({ color: this.config.foreground, width: 1 })
  };

  // drawn on edge of svg, not translated
  drawDiagramFrame(f) {
    var left = 1;
    var top = 1;
    var width = this.widthOf(f.params)
    var bottom = this.rowSpacing();

    // this is the last thing drawn at the moment
    // but save and reset translation in case it causes a future bug
    const dx = this.dx
    const dy = this.dy
    this.dx = 0
    this.dy = 0
    this.strokeRect(left, top, this.svg.width() - left * 2, this.svg.height() - top * 2)
      .back();
    this.frameLabel(left, top, width + 15, bottom - top,f.params)
    this.dx = dx
    this.dy = dy
  }

  strokeRect(x, y, w, h, color) {
    return this.svg.rect(w, h)
      .move(this.dx + x, this.dy + y)
      .fill('transparent')
      .stroke({ color: color ? color : this.config.foreground, width: 1 });
  }

  fillRect(x, y, w, h, text, link) {
    let g;

    if (link) {
      g = this.svg.link(this.config.linkHandler.href(link))
        .target(this.config.linkHandler.target(link))
      g.attr('onclick', this.config.linkHandler.onclick(link))
    } else {
      g = this.svg.group()
    }

    g.transform({
      translateX: this.dx,
      translateY: this.dy
    })

    g.rect(w, h)
      .move(x,y)
      .fill(this.config.fill)
      .stroke({ color: this.config.foreground, width: 1 });

    if (text) {
      g.plain(text)
        .attr('x',x + w / 2)
        .attr('y',y + h / 2)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFamily })
        .fill({ color: this.config.foreground })
    }

    if (link) {
      g.path("M6 1h5v5L8.86 3.85 4.7 8 4 7.3l4.15-4.16zM2 3h2v1H2v6h6V8h1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1")
        .fill(this.config.linkIconColor)
        .x(x+w-this.config.fontSize-3)
        .y(y+h-this.config.fontSize-3)
        .size(this.config.fontSize,this.config.fontSize)
    }
  };

  roundRect(x, y, w, h, r, t) {
    let g = this.svg.group()
    g.transform({
      translateX: this.dx,
      translateY: this.dy
    })

    g.rect(w, h)
      .move(x, y)
      .radius(r)
      .fill(this.config.fill)
      .stroke({ color: this.config.foreground, width: 1 });

    if (t) {
      g.plain(t)
        .attr('x',x + w / 2)
        .attr('y',y + h / 2)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFamily })
        .fill({ color: this.config.foreground })
    }
  };

  transparentRect(x, y, w, h,t) {
    let g = this.svg.group()
    g.transform({
      translateX: this.dx,
      translateY: this.dy
    })

    g.rect(w, h)
      .move(x, y)
      // .radius(radius)
      .fill({ color: this.config.background, opacity: 0.8 })

    if (t) {
      g.plain(t)
        .attr('x',x + w / 2)
        .attr('y',y + h / 2)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFamily })
        .fill({ color: this.config.foreground })
    }

  };

  textLink(txt) {
    function splitPreservingEscapedPipes(input) {
      return input.split(/(?<!\\)\|/).map(part => part.replace(/\\\|/g, '|'));
    }

    if (txt == null) {
      return { text: "", link: null };
    }

    let parts = splitPreservingEscapedPipes(txt);

    if (parts.length == 2) {
      return {
        text: parts[0].trim(),
        link: parts[1].trim()
      }
    } else {
      return {
        text: txt.trim().replace(/\\\|/g, '|'),
        link: null
      }
    }
  }

  layoutNote(x, y, w, content) {
    var pad = 5;
    var lineSpacing = 1.7;
    let {text,link} = this.textLink(content.trim())

    function getLines() {
      var wa = text.trim().split(" "),
        phraseArray = [],
        lastPhrase = wa[0].trim(),
        measure = 0,
        splitChar = " ";
      if (wa.length <= 1) {
        return wa
      }
      for (var i = 1; i < wa.length; i++) {
        var word = wa[i].trim();
        if (word == "") continue;
        measure = this.widthOfNote(lastPhrase + splitChar + word);
        if (measure < w - 2 * pad) {
          lastPhrase += (splitChar + word);
        } else {
          phraseArray.push(lastPhrase);
          lastPhrase = word;
          measure = this.widthOfNote(lastPhrase);
          if (measure > w - 2 * pad) {
            w = measure + 2 * pad;
            return false;
          }
        }
        if (i === wa.length - 1) {
          phraseArray.push(lastPhrase);
          break;
        }
      }
      return phraseArray;
    }
    x = Math.max(x, 0);
    y = Math.max(y, 0);
    var lines = getLines.call(this);
    while (lines === false) lines = getLines.call(this);
    var h = pad * 2 + lines.length * this.config.noteFontSize * lineSpacing;
    return { x: x, y: y, w: w, h: h, lines: lines, link: link };
  };

  drawNote(info) {
    var pad = 5;
    var lineSpacing = 1.7;

    let g;

    if (info.link) {
      g = this.svg.link(this.config.linkHandler.href(info.link))
        .target(this.config.linkHandler.target(info.link))
      g.attr('onclick', this.config.linkHandler.onclick(info.link))
    } else {
      g = this.svg.group()
    }    

    let {x, y, w, h} = info
    // notes do not get translated as they
    // are set their own specific x,y coords

    g.attr('class','note')

    g.polygon([
        [x,y],
        [x,y + h],
        [x + w, y + h],
        [x + w, y + 10],
        [x + w - 10, y ],
     ])
      .fill(this.config.noteFill)
      .stroke({ color: this.config.noteStroke, width: 1 });
    g.polygon([
        [x + w, y + 10],
        [x + w - 10, y ],
        [x + w - 10, y + 10],
     ])
      .fill(this.config.noteFill)
      .stroke({ color: this.config.noteStroke, width: 1 });

    for (var i = 0; i < info.lines.length; i++) {
      g.plain(info.lines[i])
        .attr('text-anchor', ALIGN_LEFT)
        .font({ size: this.config.noteFontSize, weight: this.config.noteFontWeight, family: this.config.noteFontFamily })
        .fill({ color: this.config.noteForeground })
        .amove(this.dx + info.x + pad, this.dy + info.y + pad + this.config.fontSize * lineSpacing * (i + 1) - (this.config.fontSize / 3))
    }

    if (info.link) {
      g.path("M6 1h5v5L8.86 3.85 4.7 8 4 7.3l4.15-4.16zM2 3h2v1H2v6h6V8h1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1")
        .fill(this.config.linkIconColor)
        .move(info.x+info.w-this.config.fontSize-3,info.y+info.h-this.config.fontSize-3)
        .size(this.config.fontSize,this.config.fontSize)
    }
  }

  rightArrow(x, y) {
    x += this.dx
    y += this.dy
    this.svg.polyline([
      [x - this.config.arrowSize, y - this.config.arrowSize],
      [x, y],
      [x - this.config.arrowSize, y + this.config.arrowSize]])
      .fill('transparent')
      .stroke({ color: this.config.foreground, width: 1 });
  }

  solidRightArrow(x, y) {
    x += this.dx
    y += this.dy
    this.svg.polyline([
      [x - this.config.arrowSize, y - this.config.arrowSize],
      [x, y],
      [x - this.config.arrowSize, y + this.config.arrowSize]])
      .fill(this.config.foreground)
      .stroke({ color: this.config.foreground, width: 1 });
  }

  leftArrow(x, y) {
    x += this.dx
    y += this.dy
    this.svg.polyline([
      [x + this.config.arrowSize, y - this.config.arrowSize],
      [x, y],
      [x + this.config.arrowSize, y + this.config.arrowSize]])
      .fill('transparent')
      .stroke({ color: this.config.foreground, width: 1 });
  }

  solidLeftArrow(x, y) {
    x += this.dx
    y += this.dy
    this.svg.polyline([
      [x + this.config.arrowSize, y - this.config.arrowSize],
      [x, y],
      [x + this.config.arrowSize, y + this.config.arrowSize]])
      .fill(this.config.foreground)
      .stroke({ color: this.config.foreground, width: 1 });
  }

  cross(x, y) {
    x += this.dx
    y += this.dy
    let g = this.svg.group()
    g.line(x - this.config.arrowSize, y - this.config.arrowSize, x + this.config.arrowSize, y + this.config.arrowSize)
      .stroke({ color: this.config.foreground, width: 1 })
    g.line(x + this.config.arrowSize, y - this.config.arrowSize, x - this.config.arrowSize, y + this.config.arrowSize)
      .stroke({ color: this.config.foreground, width: 1 })
  }

  boundary(x, y, size) {
    let g = this.svg.group()
    g.transform({
      translateX: this.dx + x,
      translateY: this.dy + y
    })

    g.circle(size)
      .move(-size / 2, -size / 2)
      .fill(this.config.fill)
      .stroke({ color: this.config.foreground, width: 1 });
    var left = -Math.floor(size / 8 * 5);
    g.line(left, - size / 2, left, + size / 2)
      .stroke({ color: this.config.foreground, width: 1 });
    g.line(left, 0, - size / 2, 0)
      .stroke({ color: this.config.foreground, width: 1 });

  };

  control(x, y, size) {

    let g = this.svg.group()
    g.transform({
      translateX: this.dx + x,
      translateY: this.dy + y
    })

    g.circle(size)
      .move(-size / 2, -size / 2)
      .fill(this.config.fill)
      .stroke({ color: this.config.foreground, width: 1 });

    let gg = g.group()
    gg.transform({
      translateY: -size / 2,
      rotate: 45 / 2
    })
    gg.line(size / 4, -size / 4, 0, 0)
      .stroke({ color: this.config.foreground, width: 1 });
    gg.line(0, 0, size / 4, size / 4)
      .stroke({ color: this.config.foreground, width: 1 });

  };

  entity(x, y, size) {

    let g = this.svg.group()
    g.transform({
      translateX: this.dx + x,
      translateY: this.dy + y
    })

    g.circle(size)
      .move(-size / 2, -size / 2)
      .fill(this.config.fill)
      .stroke({ color: this.config.foreground, width: 1 });
    g.line(-size / 2, size / 2, size / 2, size / 2)
      .stroke({ color: this.config.foreground, width: 1 });

  };

  actor(x, y, size) {
    let g = this.svg.group()
    g.transform({
      translateX: this.dx + x,
      translateY: this.dy + y
    })

    g.circle(size / 3)
      .move(-size / 6, -3 * size / 6)
      .fill(this.config.fill)
      .stroke({ color: this.config.foreground, width: 1 });
    g.line(-size / 6, 0, size / 6, 0)
      .stroke({ color: this.config.foreground, width: 1 });
    g.line(0, -size / 6, 0, size / 6)
      .stroke({ color: this.config.foreground, width: 1 });
    g.line(-size / 6, size / 2, 0, size / 6)
      .stroke({ color: this.config.foreground, width: 1 });
    g.line(0, size / 6, size / 6, size / 2)
      .stroke({ color: this.config.foreground, width: 1 });
  }

  circle(x, y, r) {
    this.svg.circle(r * 2)
      .move(this.dx + x - r, this.dy + y - r)
      .fill(this.config.fill)
      .stroke({ color: this.config.foreground, width: 1 });
  }

  // addDiv(txt, x, y, w, h) {
  //   if (!this.config.refCallback) return;

  //   const div = document.createElement("div");
  //   const config = this.config;
  //   div.addEventListener('click', function () { config.refCallback(txt); });
  //   div.style.position = 'absolute';
  //   div.style.top = y + 'px';
  //   div.style.left = x + 'px';
  //   div.style.width = w + 'px';
  //   div.style.height = h + 'px';
  //   //	div.style.zIndex = 5;
  //   div.style.cursor = 'pointer';
  //   //	div.width = w;
  //   //	div.height = h;

  //   this.div.append(div);
  // };

  // getElement() {
  //   if (this.config.refCallback) return this.div;
  //   else return this.canvas;
  // };

}