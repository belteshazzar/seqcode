/* (c) 2016 Daniel Walton (daniel@belteshazzar.com) (Unpublished)
 * All Rights Reserved.
 */

import { ALIGN_LEFT, ALIGN_CENTER, ALIGN_RIGHT } from "./graph.js";

export class Graphics {

  constructor(canvas,_config) {
    this.config = _config;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.context.font = this.config.fontWeight + " " + this.config.fontSize + "pt " + this.config.fontFace;
    this.context.strokeStyle = this.config.foreground;
    this.context.fillStyle = this.config.foreground;
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

  };

  widthOf(str) {
    return Math.ceil(this.context.measureText(str).width);
  };

  text(str, x, y, color) {
    this.context.fillStyle = (color ? color : this.config.foreground);
    return this.context.fillText(str, x, y - (this.config.fontSize / 3));
  };

  align(x) {
    if (x == ALIGN_LEFT) this.context.textAlign = "left";
    else if (x == ALIGN_CENTER) this.context.textAlign = "center";
    else if (x == ALIGN_RIGHT) this.context.textAlign = "right";
  };

  line(x1, y1, x2, y2) {
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.stroke();
  };

  dashedLine(fromX, fromY, toX, toY) {
    this.context.beginPath();
    // Our growth rate for our line can be one of the following:
    //	(+,+), (+,-), (-,+), (-,-)
    // Because of this, our algorithm needs to understand if the x-coord and
    // y-coord should be getting smaller or larger and properly cap the values
    // based on (x,y).
    var lt = function (a, b) { return a <= b; };
    var gt = function (a, b) { return a >= b; };
    var capmin = function (a, b) { return Math.min(a, b); };
    var capmax = function (a, b) { return Math.max(a, b); };

    var checkX = { thereYet: gt, cap: capmin };
    var checkY = { thereYet: gt, cap: capmin };

    if (fromY - toY > 0) {
      checkY.thereYet = lt;
      checkY.cap = capmax;
    }
    if (fromX - toX > 0) {
      checkX.thereYet = lt;
      checkX.cap = capmax;
    }

    this.context.moveTo(fromX, fromY);
    var offsetX = fromX;
    var offsetY = fromY;
    var idx = 0, dash = true;
    while (!(checkX.thereYet(offsetX, toX) && checkY.thereYet(offsetY, toY))) {
      var ang = Math.atan2(toY - fromY, toX - fromX);
      var len = this.config.dashStyle[idx];

      offsetX = checkX.cap(toX, offsetX + (Math.cos(ang) * len));
      offsetY = checkY.cap(toY, offsetY + (Math.sin(ang) * len));

      if (dash) this.context.lineTo(offsetX, offsetY);
      else this.context.moveTo(offsetX, offsetY);

      idx = (idx + 1) % this.config.dashStyle.length;
      dash = !dash;
    }
    this.context.stroke();
  };

  clearRect(x, y, w, h) {
    this.context.save();
    this.context.fillStyle = this.config.background;
    this.context.fillRect(x, y, w, h);
    this.context.restore();

  };

  fillRect(x, y, w, h) {
    this.context.save();
    var grd = this.context.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, this.config.gradLight);
    grd.addColorStop(1, this.config.gradDark);
    this.context.fillStyle = grd;
    this.context.fillRect(x, y, w, h);
    this.context.restore();
  };

  roundRect(x, y, width, height, radius) {
    width = Math.max(radius * 2, width);
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
    this.context.beginPath();
    this.context.moveTo(x + radius.tl, y);
    this.context.lineTo(x + width - radius.tr, y);
    this.context.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    this.context.lineTo(x + width, y + height - radius.br);
    this.context.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    this.context.lineTo(x + radius.bl, y + height);
    this.context.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    this.context.lineTo(x, y + radius.tl);
    this.context.quadraticCurveTo(x, y, x + radius.tl, y);
    this.context.closePath();
    this.context.fillStyle = this.config.background;
    this.context.fill();
    this.context.strokeStyle = this.config.foreground;
    this.context.stroke();

  };

  transparentRect(x, y, width, height) {
    this.context.fillStyle = 'rgba(255,255,255,0.8)';
    this.context.fillRect(x, y, width, height);
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

    this.context.save();
    this.context.fillStyle = "rgba(255,255,204,0.8)";
    this.context.fillRect(info.x, info.y, info.w, info.h);
    this.context.strokeStyle = "#dddddd";
    this.context.strokeRect(info.x, info.y, info.w, info.h);
    this.context.restore();
    this.align(ALIGN_LEFT);
    for (var i = 0; i < info.lines.length; i++) {
      this.text(info.lines[i],
        info.x + pad,
        info.y + pad + this.config.fontSize * lineSpacing * (i + 1));
    }

  };

  strokeRect(x, y, w, h, color) {
    this.context.strokeStyle = (color ? color : this.config.foreground);
    this.context.strokeRect(x, y, w, h);
  };

  _rightArrow(x, y, done) {
    this.context.beginPath();
    this.context.moveTo(x - this.config.arrowSize, y - this.config.arrowSize);
    this.context.lineTo(x, y);
    this.context.lineTo(x - this.config.arrowSize, y + this.config.arrowSize);
    done.call(this.context);
  };

  rightArrow(x, y) {
    this._rightArrow(x, y, this.context.stroke);
  };

  solidRightArrow(x, y) {
    this._rightArrow(x, y, this.context.fill);
  };

  _leftArrow(x, y, done) {
    this.context.beginPath();
    this.context.moveTo(x + this.config.arrowSize, y - this.config.arrowSize);
    this.context.lineTo(x, y);
    this.context.lineTo(x + this.config.arrowSize, y + this.config.arrowSize);
    done.call(this.context);
  };

  leftArrow(x, y) {
    this._leftArrow(x, y, this.context.stroke);
  };

  solidLeftArrow(x, y) {
    this._leftArrow(x, y, this.context.fill);
  };

  cross(x, y) {
    this.context.beginPath();
    this.context.moveTo(x - this.config.arrowSize, y - this.config.arrowSize);
    this.context.lineTo(x + this.config.arrowSize, y + this.config.arrowSize);
    this.context.stroke();

    this.context.beginPath();
    this.context.moveTo(x + this.config.arrowSize, y - this.config.arrowSize);
    this.context.lineTo(x - this.config.arrowSize, y + this.config.arrowSize);
    this.context.stroke();
  };

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
  };
  circle(x, y, r) {
    this.context.save();
    var grd = this.context.createLinearGradient(x - r, 0, x + r, 0);
    grd.addColorStop(0, this.config.gradLight);
    grd.addColorStop(1, this.config.gradDark);
    this.context.fillStyle = grd;
    this.context.beginPath();
    this.context.arc(x, y, r, 0, Math.PI * 2, true);
    this.context.fill();
    this.context.stroke();
    this.context.restore();
  };

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