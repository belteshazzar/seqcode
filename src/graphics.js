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
      .stroke({ color: this.config.foreground, width: 1 });

    const link = this.svg.link("http://seqcode.app")
      .target("_blank")
    const text = link.plain("seqcode ") // space for size hack with font size
      .attr('text-anchor', ALIGN_RIGHT)
      .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace })
      .fill({ color: this.config.linkColor })
      .amove(w-this.config.fontSize*0.3,h-this.config.fontSize*0.3-3)

    // const icon = link.path("M6 1h5v5L8.86 3.85 4.7 8 4 7.3l4.15-4.16zM2 3h2v1H2v6h6V8h1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1")
    //   .fill(this.config.linkColor)
    //   .size(this.config.fontSize,this.config.fontSize)
    //   .x(w-this.config.fontSize*1.2)
    //   .y(h-this.config.fontSize*1.2)


      //link.transform({translate: [w-linkBox.width-5, h-linkBox.height+5]})
  };

  widthOf(str) {
    const txt = this.svg.text(str).font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace });
    const w = txt.bbox().width
    txt.remove()
    return w
  };

  frameLabel(x, y, w, h, text) {
    let g = this.svg.group()
    
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
          .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace })
          .fill({ color: this.config.foreground })
      }
  }


  text(str, x, y, align) {
    if (align !== ALIGN_LEFT && align != ALIGN_CENTER && align != ALIGN_RIGHT) {
      throw new Error("Invalid alignment: " + align);
    }
    return this.svg.plain(str)
      .attr('text-anchor', align)
      .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace })
      .fill({ color: this.config.foreground })
      .amove(x, y - (this.config.fontSize / 3))

    // const w = this.widthOf(str)
    // this.svg.line(x, y, x + w, y)
    //   .stroke({ color: 'red', width: 1 })
  };

  line(x1, y1, x2, y2) {
    this.svg.line(x1, y1, x2, y2).stroke({ color: this.config.foreground, width: 1 })
  };

  dashedLine(fromX, fromY, toX, toY) {
    this.svg.line(fromX, fromY, toX, toY)
      .attr('stroke-dasharray', this.config.dashStyle.join(' '))
      .stroke({ color: this.config.foreground, width: 1 })
  };

  drawDiagramFrame(f) {
    var left = 1;
    var top = 1;
    var width = this.widthOf(f.params)
    var bottom = this.rowSpacing();

    this.strokeRect(left, top, this.svg.width() - left * 2, this.svg.height() - top * 2);
    this.frameLabel(left, top, width + 15, bottom - top)
    this.text(f.params, left + 5, bottom - this.config.fontSize, ALIGN_LEFT);
  }

  strokeRect(x, y, w, h, color) {
    this.svg.rect(w, h)
      .move(x, y)
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
        .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace })
        .fill({ color: this.config.foreground })
    }

    if (link) {
      g.path("M6 1h5v5L8.86 3.85 4.7 8 4 7.3l4.15-4.16zM2 3h2v1H2v6h6V8h1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1")
        .fill(this.config.linkColor)
        .x(x+w-this.config.fontSize-3)
        .y(y+h-this.config.fontSize-3)
        .size(this.config.fontSize,this.config.fontSize)
    }
  };

  roundRect(x, y, w, h, r, t) {
    let g = this.svg.group()

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
        .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace })
        .fill({ color: this.config.foreground })
    }
  };

  transparentRect(x, y, w, h,t) {
    let g = this.svg.group()

    g.rect(w, h)
      .move(x, y)
      // .radius(radius)
      .fill({ color: 'rgba(255,255,255,0.8)' })

    if (t) {
      g.plain(t)
        .attr('x',x + w / 2)
        .attr('y',y + h / 2)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace })
        .fill({ color: this.config.foreground })
    }

  };

  textLink(txt) {
    const regex = /(.*)\|\s*(\S+)$/g;
    let match = regex.exec(txt);

    if (match) {
      return {
        text: match[1].trim(),
        link: match[2].trim()
      }
    } else {
      return {
        text: txt ? txt.trim() : null,
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
        measure = this.widthOf(lastPhrase + splitChar + word);
        if (measure < w - 2 * pad) {
          lastPhrase += (splitChar + word);
        } else {
          phraseArray.push(lastPhrase);
          lastPhrase = word;
          measure = this.widthOf(lastPhrase);
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
    var h = pad * 2 + lines.length * this.config.fontSize * lineSpacing;
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

    g.polygon([
        [x,y],
        [x,y + h],
        [x + w, y + h],
        [x + w, y + 10],
        [x + w - 10, y ],
     ])
      .fill(this.config.noteBackground)
      .stroke({ color: this.config.noteStroke, width: 1 });
    g.polygon([
        [x + w, y + 10],
        [x + w - 10, y ],
        [x + w - 10, y + 10],
     ])
      .fill(this.config.noteBackground)
      .stroke({ color: this.config.noteStroke, width: 1 });

    for (var i = 0; i < info.lines.length; i++) {
      this.text(info.lines[i],
        info.x + pad,
        info.y + pad + this.config.fontSize * lineSpacing * (i + 1), ALIGN_LEFT)
        .addTo(g)
        .fill(this.config.foreground)
    }

    if (info.link) {
      g.path("M6 1h5v5L8.86 3.85 4.7 8 4 7.3l4.15-4.16zM2 3h2v1H2v6h6V8h1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1")
        .fill(this.config.linkColor)
        .move(info.x+info.w-this.config.fontSize-3,info.y+info.h-this.config.fontSize-3)
        .size(this.config.fontSize,this.config.fontSize)
    }
  }

  rightArrow(x, y) {
    this.svg.polyline([
      [x - this.config.arrowSize, y - this.config.arrowSize],
      [x, y],
      [x - this.config.arrowSize, y + this.config.arrowSize]])
      .fill('transparent')
      .stroke({ color: this.config.foreground, width: 1 });
  }

  solidRightArrow(x, y) {
    this.svg.polyline([
      [x - this.config.arrowSize, y - this.config.arrowSize],
      [x, y],
      [x - this.config.arrowSize, y + this.config.arrowSize]])
      .fill(this.config.foreground)
      .stroke({ color: this.config.foreground, width: 1 });
  }

  leftArrow(x, y) {
    this.svg.polyline([
      [x + this.config.arrowSize, y - this.config.arrowSize],
      [x, y],
      [x + this.config.arrowSize, y + this.config.arrowSize]])
      .fill('transparent')
      .stroke({ color: this.config.foreground, width: 1 });
  }

  solidLeftArrow(x, y) {
    this.svg.polyline([
      [x + this.config.arrowSize, y - this.config.arrowSize],
      [x, y],
      [x + this.config.arrowSize, y + this.config.arrowSize]])
      .fill(this.config.foreground)
      .stroke({ color: this.config.foreground, width: 1 });
  }

  cross(x, y) {
    let g = this.svg.group()
    g.line(x - this.config.arrowSize, y - this.config.arrowSize, x + this.config.arrowSize, y + this.config.arrowSize)
      .stroke({ color: this.config.foreground, width: 1 })
    g.line(x + this.config.arrowSize, y - this.config.arrowSize, x - this.config.arrowSize, y + this.config.arrowSize)
      .stroke({ color: this.config.foreground, width: 1 })
  }

  boundary(x, y, size) {
    let g = this.svg.group()
    g.transform({
      translateX: x,
      translateY: y
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
      translateX: x,
      translateY: y
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
      translateX: x,
      translateY: y
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
      translateX: x,
      translateY: y
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
      .move(x - r, y - r)
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