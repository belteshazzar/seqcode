/* (c) 2016 Daniel Walton (daniel@belteshazzar.com) (Unpublished)
 * All Rights Reserved.
 */


export const ALIGN_LEFT = "start";
export const ALIGN_CENTER = "middle";
export const ALIGN_RIGHT = "end";


export class Graphics {

  constructor(_config) {
    this.config = _config;
    this.canvas = _config.canvas;
    this.svg = _config.svg;
    this.context = this.canvas.getContext('2d');
    this.context.font = this.config.fontWeight + " " + this.config.fontSize + "pt " + this.config.fontFace;
    this.context.strokeStyle = this.config.foreground;
    this.context.fillStyle = this.config.foreground;
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
    /*
      if (window.devicePixelRatio)
      {
        console.log("---------"+window.devicePixelRatio);
        this.canvas.width = w * window.devicePixelRatio;
        this.canvas.height = h * window.devicePixelRatio;
        this.canvas.style.width = w;
        this.canvas.style.height = h;
        this.context.scale(window.devicePixelRatio, window.devicePixelRatio);					
      }
      else
      {
    */
    this.canvas.width = w;
    this.canvas.height = h;
    //	}

    // this.div.style.width = w + 'px';
    // this.div.style.height = h + 'px';

    this.context.translate(0.5, 0.5);

    this.context.font = this.config.fontWeight + " " + this.config.fontSize + "pt " + this.config.fontFace;
    this.context.strokeStyle = this.config.foreground;
    this.context.fillStyle = this.config.background;
    this.context.fillRect(0, 0, w, h);
    this.context.fillStyle = this.config.foreground;

    //	this.context.shadowColor = '#00a';
    //	this.context.shadowBlur = 1;
    //	this.context.shadowOffsetX = 0;
    //	this.context.shadowOffsetY = 0;

    this.svg.size(w, h)
    this.svg.viewbox(0,0,w,h)
    this.svg.rect(w, h)
      .fill(this.config.background)
      .stroke({ color: this.config.foreground, width: 1 });
  };

  widthOf(str) {
    const txt = this.svg.text(str).font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace });
    txt.remove()
    return txt.node.getBBox().width
  };

  link(url, str, x, y, align) {
    const link = this.svg.link(url)
      .target('_blank')
    //   .add(
    link.plain(str)
        .attr('text-anchor', align)
        .amove(x, y - (this.config.fontSize / 3))
        .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace })
        .fill({ color: this.config.foreground })
  }

  text(str, x, y, align) {
    if (align !== ALIGN_LEFT && align != ALIGN_CENTER && align != ALIGN_RIGHT) {
      throw new Error("Invalid alignment: " + align);
    }
    this.svg.plain(str)
      .attr('text-anchor', align)
      .font({ size: this.config.fontSize, weight: this.config.fontWeight, family: this.config.fontFace })
      .fill({ color: this.config.foreground })
      .amove(x,y - (this.config.fontSize / 3))

  };

  // align(x) {
  //   if (x == ALIGN_LEFT) {
  //     this.context.textAlign = "left";
  //     this.textAnchor = "start";
  //   } else if (x == ALIGN_CENTER) {
  //     this.context.textAlign = "center";
  //     this.textAnchor = "middle";
  //   } else if (x == ALIGN_RIGHT) {
  //     this.context.textAlign = "right";
  //     this.textAnchor = "end";
  //   }
  // };

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

    this.strokeRect(left, top, this.svg.width() - left*2, this.svg.height() - top*2);

    var width = this.widthOf(f.params)
    var bottom = this.rowSpacing();

    var gradient = this.svg.gradient('linear', (add) => {
      add.stop(0, this.config.gradLight)
      add.stop(1, this.config.gradDark)
    })

    this.svg.polygon([
        [left,top],
        [left, bottom],
        [left + width + 5, bottom],
        [left + width + 15, bottom - 10],
        [left + width + 15, top]
      ])
      .fill(gradient)//{ color: this.config.background })
      .stroke({ color: this.config.foreground, width: 1 });

    // g.context.save();
    // var grd = g.context.createLinearGradient(left, top, left, bottom);
    // grd.addColorStop(0, g.config.gradLight);
    // grd.addColorStop(1, g.config.gradDark);
    // g.context.fillStyle = grd;
    // g.context.beginPath();
    // g.context.moveTo(left, top);
    // g.context.lineTo(left, bottom);
    // g.context.lineTo(left + width + 5, bottom); // across
    // g.context.lineTo(left + width + 15, bottom - 10); // angled corner
    // g.context.lineTo(left + width + 15, top); // side
    // g.context.fill();
    // g.context.stroke();
    // g.context.restore();

    this.text(f.params, left + 5, bottom - this.config.fontSize,ALIGN_LEFT);
  }


  fillRect(x, y, w, h) {
    var gradient = this.svg.gradient('linear', (add) => {
      add.stop(0, this.config.gradLight)
      add.stop(1, this.config.gradDark)
    })
    this.svg.rect(w, h)
      .move(x, y)
      .fill(gradient)//{ color: this.config.background })
      .stroke({ color: this.config.foreground, width: 1 });
  };

  roundRect(x, y, width, height, radius) {
    this.svg.rect(width, height)
      .move(x, y)
      .radius(radius)
      .fill({ color: this.config.background })
      .stroke({ color: this.config.foreground, width: 1 });
  };

  transparentRect(x, y, width, height) {
    console.log("transparentRect", x, y, width, height);
    this.svg.rect(width, height)
      .move(x, y)
      .radius(radius)
      .fill({ color: 'rgba(255,255,255,0.8)' })
  };

  layoutNote(x, y, w, txt) {
    var pad = 5;
    var lineSpacing = 1.7;

    function getLines() {
      var wa = txt.trim().split(" "),
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
        measure = this.context.measureText(lastPhrase + splitChar + word).width;
        if (measure < w - 2 * pad) {
          lastPhrase += (splitChar + word);
        } else {
          phraseArray.push(lastPhrase);
          lastPhrase = word;
          measure = this.context.measureText(lastPhrase).width;
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
    return { x: x, y: y, w: w, h: h, lines: lines };
  };

  drawNote(info) {
    var pad = 5;
    var lineSpacing = 1.7;

    this.svg.rect(info.w, info.h)
    .move(info.x, info.y)
    .fill('rgba(255,255,204,0.8)')
    .stroke({ color: '#dddddd', width: 1 });

    for (var i = 0; i < info.lines.length; i++) {
      this.text(info.lines[i],
        info.x + pad,
        info.y + pad + this.config.fontSize * lineSpacing * (i + 1),ALIGN_LEFT);
    }
  }

  strokeRect(x, y, w, h, color) {
    this.svg.rect(w, h)
    .move(x, y)
    .fill('transparent')
    .stroke({ color: color ? color : this.config.foreground, width: 1 });
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
    g.line(x - this.config.arrowSize, y - this.config.arrowSize,x + this.config.arrowSize, y + this.config.arrowSize)
      .stroke({ color: this.config.foreground, width: 1 })
    g.line(x + this.config.arrowSize, y - this.config.arrowSize,x - this.config.arrowSize, y + this.config.arrowSize)
      .stroke({ color: this.config.foreground, width: 1 })
  }

  boundary(x, y, size) {
    this.context.save();

    var grd = this.context.createLinearGradient(x - size / 2, y, x + size / 2, y);
    grd.addColorStop(0, this.config.gradLight);
    grd.addColorStop(1, this.config.gradDark);
    this.context.fillStyle = grd;

    this.context.beginPath();
    this.context.arc(x, y, size / 2, 0, Math.PI * 2, true);
    this.context.fill();

    this.context.beginPath();
    this.context.arc(x, y, size / 2, 0, Math.PI * 2, true);
    var left = Math.floor(x - size / 8 * 5);
    this.context.moveTo(left, y - size / 2);
    this.context.lineTo(left, y + size / 2);
    this.context.moveTo(left, y);
    this.context.lineTo(x - size / 2, y);
    this.context.stroke();

    this.context.restore();
  };

  control(x, y, size) {
    this.context.save();

    var grd = this.context.createLinearGradient(x - size / 2, y, x + size / 2, y);
    grd.addColorStop(0, this.config.gradLight);
    grd.addColorStop(1, this.config.gradDark);
    this.context.fillStyle = grd;

    this.context.beginPath();
    this.context.arc(x, y, size / 2, 0, Math.PI * 2, true);
    this.context.fill();

    this.context.beginPath();
    this.context.arc(x, y, size / 2, 0, Math.PI * 2, true);
    this.context.stroke();
    this.context.translate(x, y - size / 2);
    this.context.rotate(Math.PI / 8);
    this.context.beginPath();
    this.context.moveTo(size / 4, -size / 4);
    this.context.lineTo(0, 0);
    this.context.lineTo(size / 4, size / 4);
    this.context.stroke();

    this.context.restore();
  };

  entity(x, y, size) {
    this.context.save();

    var grd = this.context.createLinearGradient(x - size / 2, y, x + size / 2, y);
    grd.addColorStop(0, this.config.gradLight);
    grd.addColorStop(1, this.config.gradDark);
    this.context.fillStyle = grd;

    this.context.beginPath();
    this.context.arc(x, y, size / 2, 0, Math.PI * 2, true);
    this.context.fill();

    this.context.beginPath();
    this.context.arc(x, y, size / 2, 0, Math.PI * 2, true);
    this.context.moveTo(x - size / 2, y + size / 2);
    this.context.lineTo(x + size / 2, y + size / 2);
    this.context.stroke();

    this.context.restore();
  };

  actor(x, y, size) {
    this.context.save();

    this.context.translate(x, y);
    //	this.context.fillStyle="white";
    //	this.context.fillRect(-size/6,-size/2,size/3,size);
    this.context.beginPath();
    // arms
    this.context.moveTo(-size / 6, 0);
    this.context.lineTo(size / 6, 0);
    // body
    this.context.moveTo(0, -size / 6);
    this.context.lineTo(0, size / 6);
    // legs
    this.context.moveTo(-size / 6, size / 2); // left foot
    this.context.lineTo(0, size / 6); // groin
    this.context.lineTo(size / 6, size / 2); // right foot
    this.context.stroke();

    var grd = this.context.createLinearGradient(-size / 6, 0, size / 6, 0);
    grd.addColorStop(0, this.config.gradLight);
    grd.addColorStop(1, this.config.gradDark);
    this.context.fillStyle = grd;

    this.context.beginPath();
    this.context.arc(0, -2 * size / 6, size / 6, 0, Math.PI * 2, true);
    this.context.fill();
    this.context.beginPath();
    this.context.arc(0, -2 * size / 6, size / 6, 0, Math.PI * 2, true);
    this.context.stroke();

    this.context.restore();
  }

  circle(x, y, r) {

    var gradient = this.svg.gradient('linear', (add) => {
      add.stop(0, this.config.gradLight)
      add.stop(1, this.config.gradDark)
    })

    this.svg.circle(r * 2)
      .move(x-r,y-r)
      .fill(gradient)
      .stroke({ color: this.config.foreground, width: 1 });
  }

  addDiv(txt, x, y, w, h) {
    if (!this.config.refCallback) return;

    const div = document.createElement("div");
    const config = this.config;
    div.addEventListener('click', function () { config.refCallback(txt); });
    div.style.position = 'absolute';
    div.style.top = y + 'px';
    div.style.left = x + 'px';
    div.style.width = w + 'px';
    div.style.height = h + 'px';
    //	div.style.zIndex = 5;
    div.style.cursor = 'pointer';
    //	div.width = w;
    //	div.height = h;

    this.div.append(div);
  };

  getElement() {
    if (this.config.refCallback) return this.div;
    else return this.canvas;
  };

}