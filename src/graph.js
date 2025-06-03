/* (c) 2016 Daniel Walton (daniel@belteshazzar.com) (Unpublished)
 * All Rights Reserved.
 */

import { Obj, OBJ_CREATED, OBJ_DESTROYED } from "./obj.js";
import { ALIGN_LEFT, ALIGN_CENTER, ALIGN_RIGHT } from "./graphics.js";

const DEBUG = false;

export function graph(_objs, rootCall, g) {

  function minmax(node) {
    var min = Math.min(node.parent.objIndex, node.objIndex);
    var max = Math.max(node.parent.objIndex, node.objIndex);

    for (var i = 0; i < node.nodes.length; i++) {
      min = Math.min(min, node.nodes[i].min);
      max = Math.max(max, node.nodes[i].max);
    }

    if (node.later) {
      for (var i = 0; i < node.later.length; i++) {
        min = Math.min(min, node.later[i].min);
        max = Math.max(max, node.later[i].max);
      }
    }

    return { min: min, max: max };
  }

  var root = null;
  var objs = null;
  var lines = null;
  var invocations = null;
  var maxY = 0;
  var DEFER_ASYNC = true;
  var errors = [];
  var notes = [];
  // var refs = [];

  function reset() {
    lines = [];
    invocations = [];
    maxY = 0;
    errors = [];
    notes = [];
    refs = [];

    for (var i = 0; i < objs.length; i++) {
      objs[i].marks = [];
      objs[i].lifeEvents = [];
      objs[i].alive = null;
      objs[i].pendingAsynch = null;
    }
  }

  function init() {

    function drawLifes() {

      if (this.lifeEvents.length > 0) {
        var createdAt = (this.lifeEvents[0].event == OBJ_CREATED ? -1 : 0);

        for (var i = 0; i < this.lifeEvents.length; i++) {
          var ev = this.lifeEvents[i];

          if (ev.event == OBJ_CREATED && createdAt == -1) {
            createdAt = ev.y;
          } else if (ev.event == OBJ_DESTROYED) {
            if (createdAt == -1) createdAt = ev.y - 2;
            g.dashedLine(this.x, y(createdAt) + g.rowSpacing() / 2, this.x, y(ev.y));
            createdAt = -1;
          }
        }

        if (this.lifeEvents[this.lifeEvents.length - 1].event == OBJ_CREATED && createdAt != -1) {
          g.dashedLine(this.x, y(createdAt) + g.rowSpacing() / 2, this.x, y(maxY + 1));
        }
      } else {
        g.dashedLine(this.x, y(0) + g.rowSpacing() / 2, this.x, y(maxY + 1));
      }
    }

    function drawObjs() {
      this.creation = function (yPos) {
        var level = maxLevelRange(this.objIndex, yPos, yPos);
        var x = this.x + WIDTH / 2 * (level == -1 ? 0 : level);
        if (this.cls == "actor") {
          g.actor(x, y(yPos) - g.rowSpacing() / 2, g.rowSpacing());
          if (this.name != "") {
            g.text(this.name, x, y(yPos) + g.rowSpacing() / 2,ALIGN_CENTER);
          }
        } else if (this.cls == "boundary") {
          g.boundary(x, y(yPos) - g.rowSpacing() / 2, g.rowSpacing());
          g.text(this.name, x, y(yPos) + g.rowSpacing() / 2,ALIGN_CENTER);
        } else if (this.cls == "control") {
          g.control(x, y(yPos) - g.rowSpacing() / 2, g.rowSpacing());
          g.text(this.name, x, y(yPos) + g.rowSpacing() / 2,ALIGN_CENTER);
        } else if (this.cls == "entity") {
          g.entity(x, y(yPos) - g.rowSpacing() / 2, g.rowSpacing());
          g.text(this.name, x, y(yPos) + g.rowSpacing() / 2,ALIGN_CENTER);
        } else {
          var w = g.widthOf(this.getText());
          var left = Math.floor(x - w / 2 - 5);

          g.fillRect(left, y(yPos) - g.rowSpacing() / 2, Math.ceil(w + 5 * 2), g.rowSpacing(),this.getText());
        }
      };
      if (this.lifeEvents.length > 0) {
        if (this.lifeEvents[0].event == OBJ_DESTROYED) {
          this.creation(0);
        }
        for (var i = 0; i < this.lifeEvents.length; i++) {
          var ev = this.lifeEvents[i];
          if (ev.event == OBJ_CREATED) {
            this.creation(ev.y);
          } else if (ev.event == OBJ_DESTROYED) {
            var level = maxLevelRange(this.objIndex, ev.y, ev.y);
            var x = this.x + WIDTH / 2 * (level + 1);
            g.cross(x, y(ev.y));
          }
        }
      } else {
        this.creation(0);
      }
    }

    objs = _objs;
    lines = [];
    invocations = [];
    //		frames = [];
    //		labels = [];
    maxY = 0;
    notes = [];
    // refs = [];

    for (var i = 0; i < objs.length; i++) {
      objs[i].objIndex = i; // does this overlap with call objIndex?
      objs[i].marks = [];
      objs[i].lifeEvents = [];
      objs[i].later = [];
      objs[i].alive = null;
      objs[i].drawLifes = drawLifes;
      objs[i].drawObjs = drawObjs;
      objs[i].pendingAsynch = null;
    }
  }

  ///////////////////////////////////////////////////////////////////////////
  //
  function layoutLater(inv, y) {

    if (inv.later) {
      objs[inv.objIndex].later = objs[inv.objIndex].later.concat(inv.later);
      inv.later = null;
    }

    if (inv.inFrame) {
      return;
    }

    for (let i = 0; i < objs.length; i++) {
      layoutObjLater(i, y);
    }
  }

  function layoutObjLater(objIndex, y) {
    var x = 1000;
    while (x > 0 && objs[objIndex].later.length > 0) {
      x--;
      var invocations = countInvocationsAt(objIndex, y);
      if (invocations > 0) {
        y++;
      } else {
        var later = objs[objIndex].later.shift();
        y = later.layout(y);
      }
    }
  }

  function marksAt(y, x1, x2) {

    var count = 0;
    var left = Math.min(x1, x2);
    var right = Math.max(x1, x2);
    for (var x = left; x <= right; x++) {
      if (objs[x].marks[y] == 'X') count++;
    }
    return count;
  }

  function mark(oFrom, oTo, y) {
    var lr = leftRight(oFrom, oTo, y);
    while (marksAt(y, lr.l, lr.r) != 0) {
      y++;
    }
    for (var x = lr.l; x <= lr.r; x++) {
      objs[x].marks[y] = 'X';
    }
    if (y > maxY) maxY = y;
    return y;
  }

  function leftRight(oFrom, oTo, y) {

    if (oFrom == undefined || oTo == undefined || y == undefined) {
      throw new Exception();
    }
    if (isNaN(oFrom.objIndex) || isNaN(oTo.objIndex) || isNaN(y)) {
      throw new Exception();
    }
    var l = Math.min(oFrom.objIndex, oTo.objIndex);
    var r = Math.max(oFrom.objIndex, oTo.objIndex);
    return { l: l, r: r };
  }

  function mark2(oFrom, oTo, y) {
    var lr = leftRight(oFrom, oTo, y);
    while (true) {
      if (marksAt(y, lr.l, lr.r) == 0) {
        if (marksAt(y + 1, lr.l, lr.r) == 0) break;
      }
      y++;
    }
    var y1 = y + 1;
    for (var x = lr.l; x <= lr.r; x++) {
      objs[x].marks[y] = 'X';
      objs[x].marks[y1] = 'X';
    }
    if (y1 > maxY) maxY = y1;
    return y;
  }

  function mark3(oFrom, oTo, y) {
    var lr = leftRight(oFrom, oTo, y);
    while (true) {
      if (marksAt(y, lr.l, lr.r) == 0) {
        if (marksAt(y + 1, lr.l, lr.r) == 0) {
          if (marksAt(y + 2, lr.l, lr.r) == 0) break;
        }
      }
      y++;
    }
    var y1 = y + 1;
    var y2 = y + 2;
    for (var x = lr.l; x <= lr.r; x++) {
      objs[x].marks[y] = 'X';
      objs[x].marks[y1] = 'X';
      objs[x].marks[y2] = 'X';
    }
    if (y2 > maxY) maxY = y2;
    return y;
  }

  function mark4(oFrom, oTo, y) {
    var lr = leftRight(oFrom, oTo, y);
    while (true) {
      if (marksAt(y, lr.l, lr.r) == 0) {
        if (marksAt(y + 1, lr.l, lr.r) == 0) {
          if (marksAt(y + 2, lr.l, lr.r) == 0) {
            if (marksAt(y + 3, lr.l, lr.r) == 0) break;
          }
        }
      }
      y++;
    }
    var y1 = y + 1;
    var y2 = y + 2;
    var y3 = y + 3;
    for (var x = lr.l; x <= lr.r; x++) {
      objs[x].marks[y] = 'X';
      objs[x].marks[y1] = 'X';
      objs[x].marks[y2] = 'X';
      objs[x].marks[y3] = 'X';
    }
    if (y3 > maxY) maxY = y3;
    return y;
  }

  function layoutFrame(f) {

    const FRAME_PADDING = 20;

    if (!f.layoutInfo) return;

    const top = f.top;
    const bottom = f.bottom;
    const left = f.layoutInfo.left;
    const right = f.layoutInfo.right;

    const leftFrames = objs[left].leftFrameDepth(top, top);
    const rightFrames = objs[right].rightFrameDepth(top, top);

    f.layoutInfo.leftPadding = objs[left].getLeftWidth(g, top, bottom) - (leftFrames - 1) * FRAME_PADDING;
    f.layoutInfo.rightPadding = objs[right].getRightWidth(g, top, bottom) - (rightFrames - 1) * FRAME_PADDING;;

    f.layoutInfo.yy = y(f.layoutInfo.top);
    f.layoutInfo.h = y(f.bottom) - f.layoutInfo.yy;

    f.layoutInfo.xx = objs[f.layoutInfo.left].x - f.layoutInfo.leftPadding;
    f.layoutInfo.w = objs[f.layoutInfo.right].x + f.layoutInfo.rightPadding - f.layoutInfo.xx;
  }

  function layoutFrames(f) {
    for (var i = 0; i < f.frames.length; i++) {
      layoutFrames(f.frames[i]);
    }

    layoutFrame(f);
  }

  function layoutObjects() {

    var prev = null;
    var prevLeftWidth;
    var prevRightWidth;
    var obj = null;
    var objLeftWidth;
    var objRightWidth;

    for (var i = 0; i < objs.length; i++) {
      obj = objs[i];
      objLeftWidth = obj.getLeftWidth(g);
      objRightWidth = obj.getRightWidth(g);

      if (prev == null) {
        obj.x = g.objectSpacing() + objLeftWidth;
      } else {
        obj.x = prev.x + prevRightWidth + g.objectSpacing() + objLeftWidth;
      }
      prev = obj;
      prevLeftWidth = objLeftWidth;
      prevRightWidth = objRightWidth;
    }

    return obj.x + objRightWidth + g.objectSpacing();
  }

  function layoutNotes() {
    const dim = { w: 0, h: 0 };

    for (var i = 0; i < notes.length; i++) {
      notes[i].layout();
      if (notes[i].info) {
        dim.w = Math.max(dim.w, notes[i].info.x + notes[i].info.w + 5);
        dim.h = Math.max(dim.h, notes[i].info.y + notes[i].info.h + 5);
      }
    }

    return dim;
  }

  function layoutLines() {

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];

      var left = l.from.objIndex;
      var leftLevel = l.from.level;
      var right = l.to.objIndex;

      // self lines are handled by object layout
      if (left == right) continue;

      if (left > right) {
        left = l.to.objIndex;
        leftLevel = l.to.level;
        right = l.from.objIndex;
      }

      var leftX = objs[left].x + WIDTH / 2 * leftLevel;
      var rightX = objs[right].x - WIDTH / 2; // don't care about right level

      leftX += WIDTH / 2;
      rightX -= WIDTH / 2;

      var currentObjSpacing = rightX - leftX;
      var textLength = g.widthOf(" " + l.text + " ");
      var extra = 0;
      if (!l.style[0] && !l.style[1] && l.text == "<<create>>") {
        var toObj = objs[l.to.objIndex];
        var objExtra = Math.ceil(g.widthOf(toObj.getText()) / 2);
        /////
        if (toObj.cls == "actor") objExtra = Math.max(g.widthOf(toObj.getText()) / 2, 10);
        else if (toObj.cls == "control" || toObj.cls == "boundary" || toObj.cls == "entity") objExtra = Math.max(g.widthOf(toObj.getText()) / 2, 20);
        if (l.to.objIndex > l.from.objIndex) {
          if (toObj.cls == "boundary") objExtra += 5;
        }
        ////////
        extra = Math.ceil(textLength - currentObjSpacing + g.arrowSize() * 2 + objExtra);
      } else if (l.style == LOST) {
        extra = Math.ceil(textLength - currentObjSpacing + g.arrowSize() * 2 + WIDTH * 2);

      } else {
        extra = textLength - currentObjSpacing + g.arrowSize() * 2;
      }


      addSpaceBetweenObjects(left, right, extra);

    }

  }

  function addSpaceBetweenObjects(left, right, extra) {
    if (extra <= 0) return;

    const extraPer = Math.ceil(extra / (right - left));
    extra = extraPer * (right - left);

    for (let i = left; i <= right; i++) {
      objs[i].x += extraPer * (i - left);
    }

    for (let i = right + 1; i < objs.length; i++) {
      objs[i].x += extra;
    }
  }

  function extentsOf(d1, d2) {
    return { w: Math.max(d1.w, d2.w), h: Math.max(d1.h, d2.h) };
  }

  function layout() {

    let dim = { w: 0, h: y(maxY + 2) };
    dim = extentsOf(dim, layoutNotes());
    dim.w = Math.max(dim.w, layoutObjects());
    layoutLines();
    layoutFrames(root);
    for (let i = 0; i < root.frames.length; i++) {
      dim.w = Math.max(dim.w, root.frames[i].layoutInfo.xx + root.frames[i].layoutInfo.w + g.objectSpacing());
    }
    dim.w = Math.max(dim.w, objs[objs.length - 1].x + objs[objs.length - 1].getRightWidth(g) + g.objectSpacing());

    return dim;
  }

  function drawFramesAndLabels(f) {
    for (var i = 0; i < f.labels.length; i++) {
      drawLabel(f.labels[i].layoutInfo);
    }
    drawFrame(f);

    for (var i = 0; i < f.frames.length; i++) {
      drawFramesAndLabels(f.frames[i]);
    }
  }

  function draw() {

    for (var i = 0; i < objs.length; i++) {
      objs[i].drawLifes();
    }
    for (var i = 0; i < invocations.length; i++) {
      drawInvocation(invocations[i]);
    }
    for (var i = 0; i < lines.length; i++) {
      drawLine(lines[i]);
    }

    for (var i = 0; i < objs.length; i++) {
      objs[i].drawObjs();
    }

    drawFramesAndLabels(root);

    for (var i = 0; i < notes.length; i++) {
      notes[i].draw();
    }
  }

  // call = SOLID CLOSED
  var CALL = [true, true];
  // return = DASHED OPEN
  var RETURN = [false, false];
  // asynch = SOLID OPEN
  var ASYNCH = [true, false];
  // life = DASHED OPEN
  var LIFE = [false, false];
  // lost = SOLID OPEN
  var LOST = [true, false];
  // lost = SOLID OPEN
  var FOUND = [true, false];

  var HIDDEN = [false, false];
  var REF = [false, false];

  // invocation width
  var WIDTH = 20;

  function line(text, from, to, y, style, meta) {
    const ln = { text: text, from: from, to: to, y: y, style: style, meta: meta };
    lines.push(ln);
    if (from.lines) from.lines.push(ln);
  }

  function y(ygrid) {
    return g.margin() + g.rowSpacing() * (ygrid + (diagramFrame ? 2 : 1));
  }

  function str(s) {
    if (s == undefined || s == null) return false;
    s = s.trim();
    if (s.length == 0) return false;
    return s;
  }

  function maxLevelRange(x, y1, y2) {
    var max = -1;
    for (var i = 0; i < invocations.length; i++) {
      var inv = invocations[i];
      if (inv.objIndex != x) continue;
      if (inv.top > y2) continue;
      if (inv.bottom < y1) continue;
      max = Math.max(max, inv.level);
    }
    return max;
  }

  // function maxRight(x, y1, y2) {
  //   var max = 0;
  //   for (var i = 0; i < invocations.length; i++) {
  //     var inv = invocations[i];
  //     if (inv.objIndex != x) continue;
  //     if (inv.top > y2) continue;
  //     if (inv.bottom < y1) continue;
  //     if (inv.objIndex == inv.parent.objIndex) {
  //       max = Math.max(max, (inv.level + 2) * (WIDTH / 2));
  //       max = Math.max(max, (inv.level) * (WIDTH / 2) + g.widthOf(inv.name + (inv.params ? "( " + inv.params + " )" : "")));
  //     } else {
  //       max = Math.max(max, (inv.level) * (WIDTH / 2));
  //     }
  //   }
  //   return max;
  // }

  function countInvocationsAt(x, y) {
    var n = 0;
    for (var i = 0; i < invocations.length; i++) {
      var inv = invocations[i];
      if (inv.objIndex != x) continue;
      if (inv.top > y) continue;
      if (inv.bottom < y) continue;
      n++;
    }
    return n;
  }

  // function labelWidth(l) {
  //   if (l.name == "state") {
  //     var radius = 15;
  //     return g.widthOf(l.text ? l.text : "") + radius * 2;
  //   } else if (l.name == "invariant") {
  //     return g.widthOf("{" + (l.text ? l.text : "") + "}");
  //   } else {
  //     return 0;
  //   }
  // }

  function drawRef(r) {

    let text;
    let left;
    let right;
    let top;
    let bottom;
    let link = null

    if (r.name) {
      // called from drawing a label
      text = r.params;
      link = r.link
      left = r.left;
      right = r.right;
      top = r.top;
      bottom = r.bottom;
    } else {
      // called from drawing a line
      text = r.text;
      link = r.meta.link
      left = Math.min(r.from.objIndex, r.to.objIndex);
      right = Math.max(r.from.objIndex, r.to.objIndex);
      top = r.y;
      bottom = top + 3;
    }

    const rlevel = objs[right].maxInvocationDepth(top, bottom);

    const tw = g.widthOf("ref");
    const w2 = Math.max(25, left == right ? Math.ceil(g.widthOf("-" + text + "-") / 2) : Math.ceil((objs[right].x - objs[left].x + rlevel * 10 + 30) / 2));
    const w = w2 * 2;
    const c = left == right ? objs[left].x : objs[left].x + w2 - 20; // TODO: not quite right!
    const xl = c - w2;

    g.fillRect(xl, y(top), w, y(bottom) - y(top),text,link);
//    g.strokeRect(xl, y(top), w, y(bottom) - y(top));

//    g.addDiv(text, xl, y(top), w, y(bottom) - y(top));

    g.frameLabel(xl,y(top),tw+15,y(top+1)-y(top),"ref")

    // g.text("ref", xl + 5, y(top + 1) - g.config.fontSize,ALIGN_LEFT);

//    g.text(text, c, y(top + 2) - g.config.fontSize,ALIGN_CENTER);
  }

  function drawLabel(r) {

    if (r.name == "ref") {

      drawRef(r);

    } else if (r.name == "state") {

      const invs = objs[r.x].maxInvocationDepth(r.top, r.top);
      var objX = objs[r.x].x + (invs - 1) * 5;

      var radius = 5;// TODO same as measure width?
      const w = Math.max(invs * 10 + 30, Math.max(50, g.widthOf(r.text) + radius * 2));
      var left = Math.ceil(objX - w / 2);
      g.roundRect(left, y(r.top), w, y(r.bottom) - y(r.top), radius, r.text);
      // if (r.text) {
      //   g.text(r.text, objX, y(r.top) + g.config.rowSpacing / 2 + g.config.fontSize - 2,ALIGN_CENTER);
      // }
    } else if (r.name == "invariant") {
      const invs = objs[r.x].maxInvocationDepth(r.top, r.top);
      var objX = objs[r.x].x + (invs - 1) * 5;
      const txt = "{" + (r.text ? r.text : "") + "}"
      var radius = 5;// TODO same as measure width?
      const w = Math.max(invs * 10 + 30, Math.max(50, g.widthOf(r.text) + radius * 2));
      var left = Math.ceil(objX - w / 2);
      g.transparentRect(left, y(r.top), w, y(r.bottom) - y(r.top), txt);
      // g.text(txt, objX, y(r.top) + g.config.rowSpacing / 2 + g.config.fontSize - 2,ALIGN_CENTER);
    }
  }

  function frameTextWidth(f) {
    var maxTextWidth = g.widthOf(f.name) + 20;
    if (str(f.params)) {
      maxTextWidth = Math.max(maxTextWidth, g.widthOf("[ " + f.params + " ]") + 20);
    }
    if (f.layoutInfo.splits) {
      for (var i = 0; i < f.layoutInfo.splits.length; i++) {
        maxTextWidth = Math.max(maxTextWidth, g.widthOf("[ " + f.layoutInfo.splits[i].text + " ]") + 20);
      }
    }
    return maxTextWidth;
  }

  function drawFrame(f) {
    if (!f.layoutInfo) return;

    var xx = f.layoutInfo.xx;
    var yy = f.layoutInfo.yy;
    var w = f.layoutInfo.w;
    var h = f.layoutInfo.h;

    g.strokeRect(xx, yy, w, h);

    if (f.layoutInfo.splits) {

      for (var i = 0; i < f.layoutInfo.splits.length; i++) {
        var text = f.layoutInfo.splits[i].text;
        if (text) g.text("[ " + text + " ]", xx + 5, y(f.layoutInfo.splits[i].top + 1),ALIGN_LEFT);
        if (i == 0) continue; // don't draw line for first sub-frame
        g.dashedLine(xx, y(f.layoutInfo.splits[i].top), xx + w, y(f.layoutInfo.splits[i].top));
      }
    }

    var tw = g.widthOf(f.name);

    g.frameLabel(xx,yy,tw+15,y(f.top+1)-yy, f.name)

    // g.text(f.name, xx + 5, y(f.top + 1) - g.config.fontSize,ALIGN_LEFT);
    if (str(f.params)) g.text("[ " + f.params + " ]", xx + 5, y(f.top + 2),ALIGN_LEFT);
  }

  function drawLine(l) {

    if (l.style == HIDDEN) return;

    // handle frames, should move this out of here, similar to calc invocation levels
    if (l.from.level == -1) {
      var p = l.from.parent;
      while (p.level == -1) p = p.parent;
      l.from.level = p.level;
    }

    var fromX = objs[l.from.objIndex].x + WIDTH / 2 * l.from.level;
    var toX = objs[l.to.objIndex].x + WIDTH / 2 * l.to.level;

    if (isNaN(fromX) || isNaN(toX)) {
      console.error(l.from.objIndex + "#" + l.from.level + ":" + fromX + " -> " + l.to.objIndex + "#" + l.to.level + ":" + toX);
      return;
    }
    if (l.style == LOST) {

      var width = g.widthOf(l.text);
      fromX += WIDTH / 2;
      toX = fromX + width + WIDTH;
      g.line(fromX, y(l.y), toX, y(l.y));

      g.text(l.text, fromX + 3, y(l.y),ALIGN_LEFT);
      g.rightArrow(toX, y(l.y));
      g.circle(toX + WIDTH / 2, y(l.y), WIDTH / 2);

    } else if (l.style == FOUND) {

      var width = g.widthOf(l.text);
      fromX = fromX - width - 1.5 * WIDTH;
      toX = toX - WIDTH / 2;
      g.line(fromX, y(l.y), toX, y(l.y));

      g.text(l.text, fromX + 3, y(l.y),ALIGN_LEFT);
      g.rightArrow(toX, y(l.y));
      g.circle(fromX - WIDTH / 2, y(l.y), WIDTH / 2);

    } else if (l.style == REF) {

      drawRef(l);

    } else if (l.from.objIndex == l.to.objIndex) {

        // return self line, y == where it joins parent

      fromX += WIDTH / 2;
      toX += WIDTH / 2;
      var vertX = Math.max(fromX, toX) + WIDTH;
      g.text(l.text, fromX + 3, y(l.y),ALIGN_LEFT);
      if (l.style[0]) {
        g.line(fromX, y(l.y), vertX, y(l.y));
        g.line(vertX, y(l.y), vertX, y(l.to.top));
        g.line(toX, y(l.to.top), vertX, y(l.to.top));
        if (l.style[1]) g.solidLeftArrow(toX, y(l.to.top));
        else g.leftArrow(toX, y(l.to.top));
      } else {
        g.dashedLine(fromX, y(l.from.bottom), vertX, y(l.from.bottom));
        g.dashedLine(vertX, y(l.from.bottom), vertX, y(l.y));
        g.dashedLine(toX, y(l.y), vertX, y(l.y));
        if (l.style[1]) g.solidLeftArrow(toX, y(l.y));
        else g.leftArrow(toX, y(l.y));
      }
    } else {
      if (fromX < toX) {
        fromX += WIDTH / 2;
        toX -= WIDTH / 2;
      } else {
        fromX -= WIDTH / 2;
        toX += WIDTH / 2;
      }

      if (l.style[0]) g.line(fromX, y(l.y), toX, y(l.y));
      else {
        if (!l.style[1] && l.text == "<<create>>") {
          var toObj = objs[l.to.objIndex];
          var offset = Math.ceil(g.widthOf(toObj.getText()) / 2) + 5;
          if (toObj.cls == "actor") offset = Math.max(g.widthOf(toObj.getText()) / 2, 10) + 5;
          else if (toObj.cls == "control" || toObj.cls == "boundary" || toObj.cls == "entity") offset = Math.max(g.widthOf(toObj.getText()) / 2, 20) + 5;
          if (toX > fromX) {
            toX = Math.floor(toObj.x + WIDTH / 2 * l.to.level - offset);
            if (toObj.cls == "boundary") toX -= 5;
          } else {
            toX = Math.ceil(toObj.x + WIDTH / 2 * l.to.level + offset);
          }
        }
        g.dashedLine(fromX, y(l.y), toX, y(l.y));
      }
      // for line right-left align text with left of right object
      g.text(l.text, l.from.objIndex < l.to.objIndex ? fromX + 3 : objs[l.from.objIndex].x - WIDTH / 2 - 3, y(l.y),l.from.objIndex < l.to.objIndex ? ALIGN_LEFT : ALIGN_RIGHT);
      if (l.style[1]) {
        if (fromX < toX) g.solidRightArrow(toX, y(l.y));
        else g.solidLeftArrow(toX, y(l.y));
      } else {
        if (fromX < toX) g.rightArrow(toX, y(l.y));
        else g.leftArrow(toX, y(l.y));
      }
    }
  }

  // function text(str, x, yGrid) {
  //   g.context.save();
  //   g.context.fillStyle = "red";
  //   g.text(str, objs[x].x, y(yGrid));
  //   g.context.restore();
  // }

  function sortInvocations() {
    // sort by objIndex's then top's
    invocations.sort(function (a, b) {
      if (a.objIndex < b.objIndex) return -1;
      else if (a.objIndex > b.objIndex) return 1;
      else if (a.top < b.top) return -1;
      else if (a.top > b.top) return 1;
      else return 0;
    });
  }

  function calcInvocationLevels() {

    for (var i = 0, x = 0; x < objs.length && i < invocations.length; x++) {
      var stack = [];
      for (; i < invocations.length && invocations[i].objIndex == x; i++) {
        while (stack.length > 0 && stack[stack.length - 1].bottom < invocations[i].top) stack.pop();
        invocations[i].level = stack.length;
        stack.push(invocations[i]);
      }
    }
  }

  // function level(x, y) {
  //   var count = 0;
  //   for (var i = 0; i < invocations.length; i++) {
  //     var inv = invocations[i];
  //     if (inv.objIndex == x && inv.top <= y && (inv.bottom == undefined || inv.bottom >= y)) count++;
  //   }
  //   return count;
  // }

  function drawInvocation(i) {
    var x = objs[i.objIndex].x + WIDTH / 2 * (i.level - 1);
    var yPx = y(i.top);
    var w = WIDTH;
    var h = y(i.bottom) - yPx;
    var cls = objs[i.objIndex].cls;
    if (i.constructor == Create
      && !i.error
      && (cls == "actor"
        || cls == "boundary"
        || cls == "control"
        || cls == "entity")) {
      yPx += g.rowSpacing() / 2;
      h -= g.rowSpacing() / 2;
    }
    g.fillRect(x, yPx, w, h);
    // g.strokeRect(x, yPx, w, h);
  }

  //top==undefined means not layed out yet
  //bottom==undefined means bottom not layed out yet
  // function maxLevel(x, y) {
  //   var max = -1;
  //   for (var i = 0; i < invocations.length; i++) {
  //     var inv = invocations[i];
  //     if (inv.level == undefined) continue;
  //     if (inv.objIndex != x) continue;
  //     if (inv.top == undefined) continue;
  //     if (inv.top > y) continue;
  //     if (inv.bottom == undefined) {
  //       max = Math.max(max, inv.level);
  //     } else if (inv.bottom >= y) {
  //       max = Math.max(max, inv.level);
  //     }
  //   }
  //   return max;
  // }

  // function calcLevel(x, y) {
  //   return maxLevel(x, y) + 1;
  // }

  function countLinesUnder() {
    // find lines to/from right of this.objIndex between top and bottom
    var results = [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (ln.style == HIDDEN || ln.style == REF) continue;
      if (ln.y <= this.top) continue;
      if (ln.y >= this.bottom) continue;
      if (ln.to.objIndex == this.objIndex && ln.from.objIndex > this.objIndex) {
        if (ln.to.level >= this.level) continue;
        if (ln.to.level == -1) continue // frame line
        results.push(ln);
        continue;
      }
      if (ln.from.objIndex == this.objIndex && ln.to.objIndex > this.objIndex) {
        if (ln.from.level >= this.level) continue;
        if (ln.from.level == -1) continue // frame line
        results.push(ln);
        continue
      }
    }
    return results;
  };

  class Note {
    constructor(call) {
      this.params = call.params;
    }
    layout() {
      const parsed = Note.parseParams(this.params)
      this.info = g.layoutNote(parsed.x, parsed.y, parsed.w, parsed.text);
    }
    draw() {
      if (this.info) g.drawNote(this.info);
    }

    static parseParams(params) {
      var ss = params.split(",");
      if (ss.length < 4) {
        return null;
      }
      var x = parseInt(ss[0]);
      var y = parseInt(ss[1]);
      var w = parseInt(ss[2]);
      if (isNaN(x) || x != ss[0] || isNaN(y) || y != ss[1] || isNaN(w) || w != ss[2]) {
        return null;
      }
      ss.shift();
      ss.shift();
      ss.shift();
      // if there are no more elements in ss, empty string
      var text = "" + ss.join(",");
      return {x,y,w,text}
    }
  };




  class FoundMessage {
    constructor(parent, call) {
      this.parent = parent;
      this.name = call.name;
      this.params = call.params;
      this.objIndex = call.objIndex;
      this.min = this.objIndex;
      this.max = this.objIndex;
      objs[this.objIndex].alive = true;
    }
    text() {
      return this.name.substr(1) + (this.params === null ? "()" : "(" + this.params + ")");
    }
    check() {
      return true;
    }
    findMaxY() {
      var maxY = this.bottom;
      return maxY;
    }
    layout(y) {
      this.top = mark(this.parent, this, y);
      objs[this.objIndex].addFoundMessage(this);
      line(this.text(), this.parent, this.parent, this.top, FOUND);
      this.bottom = this.top;
      return this.bottom;
    }
  };








  class Message {
    constructor(parent, call) {
      this.parent = parent;
      this.name = call.name;
      this.params = call.params;
      this.objIndex = call.objIndex;
      this.frames = this.parent.frames;
      this.inFrame = this.parent.inFrame;
      this.inFrame = this.parent.inFrame;
      this.labels = this.parent.labels;
      this.lines = this.parent.lines;
      objs[this.objIndex].alive = true;
      this.nodes = createNodes(this, call.subCalls);
      if (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage) {
          if (last.name == "return" && last.params != null && last.nodes.length == 0) {
            this.nodes.length--;
            this.returns = last.params;
          }
        }
      }
      this.later = [];
      while (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage
          && last.name == "later"
          && last.params === ""
          && last.nodes.length > 0) {
          this.nodes.length--;
          last.islater = true;
          this.later.unshift(last);
          this.returns = last.params;
        } else {
          break;
        }
      }
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
    }
    text() {
      return this.name + (this.params === null ? "()" : "(" + this.params + ")");
    }
    findMaxY() {
      var maxY = this.bottom;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
    check() {
      // backwards
      if (this.parent.objIndex > this.objIndex) {
        var lines = countLinesUnder.call(this);
        if (lines.length > 0) {
          // insert pause before me
          // find my index
          var me = 0;
          while (me < this.parent.nodes.length && this.parent.nodes[me] != this) me++;
          this.parent.nodes.splice(me, 0, new Pause(this.parent));
          return false;
        } else {
          for (var i = 0; i < this.nodes.length; i++) {
            if (!this.nodes[i].check()) return false;
          }
          return true;
        }
      } else {
        for (var i = 0; i < this.nodes.length; i++) {
          if (!this.nodes[i].check()) return false;
        }
        return true;
      }
    }
    layout(y) {
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      var deferred = [];
      this.top = mark(this.parent, this, y);
      line(this.text(), this.parent, this, this.top, CALL);
      y = this.top + 1;
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else {
          y = lo;
        }
      }
      this.bottom = mark(this, this.parent, y);
      line((this.returns ? this.returns : ""), this, this.parent, this.bottom, RETURN);
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      y = this.bottom + 1;
      layoutLater(this, y);
      return this.bottom;
    }
  };





  ///////////////////////////////////////////


  class RefMessage {
    constructor(parent, call) {
      this.parent = parent;
      this.name = call.name;
      this.params = call.params;
      this.link = null;
      if (this.params) {
        let tl = g.textLink(this.params)

        if (tl) {
          this.params = tl.text
          this.link = tl.link
        }
      }
      this.objIndex = call.objIndex;
      objs[this.objIndex].alive = true;
      this.min = Math.min(this.objIndex, parent.objIndex);
      this.max = Math.max(this.objIndex, parent.objIndex);
    }
    text() {
      return this.name + (this.params === null ? "()" : "(" + this.params + ")");
    }
    findMaxY() {
      return this.bottom;
    }
    check() {
      return true;
    }
    layout(y) {
      this.top = mark4(objs[this.min], objs[this.max], y);
      this.bottom = this.top + 3;
      y = this.bottom + 1;

      const fakeLabel = { top: this.top, bottom: this.bottom, params: "x" };
      objs[this.min].addLabel(fakeLabel);
      objs[this.max].addLabel(fakeLabel);
      line(this.params, { objIndex: this.min, level: 0 }, { objIndex: this.max, level: 0 }, this.top, REF, { link : this.link });
      this.layoutInfo = { name: this.name, params: this.params, link: this.link, top: this.top, bottom: this.bottom, left: this.min, right: this.max, x: this.objIndex };
      return this.bottom;
    }
  };






  ///////////////////////////////////////////
  class Pause {
    constructor(parent) {
      this.parent = parent;
      this.objIndex = parent.objIndex;
      this.min = parent.objIndex;
      this.max = parent.objIndex;
    }
    text() {
      throw "Pause.text";
    }
    findMaxY() {
      return this.bottom;
    }
    check() {
      return true;
    }
    layout(y) {
      this.top = mark(this, this, y);
      this.bottom = this.top;
      return this.bottom;
    }
  };





  class SelfMessage {
    constructor(parent, call) {
      this.parent = parent;
      this.name = call.name;
      this.params = call.params;
      this.objIndex = call.objIndex;
      this.frames = this.parent.frames;
      this.inFrame = this.parent.inFrame;
      this.labels = this.parent.labels;
      this.lines = this.parent.lines;
      objs[this.objIndex].alive = true;
      this.nodes = createNodes(this, call.subCalls);
      if (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage) {
          if (last.name == "return" && last.params != null && last.nodes.length == 0) {
            this.nodes.length--;
            this.returns = last.params;
          }
        }
      }
      this.later = [];
      while (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage
          && last.name == "later"
          && last.params === ""
          && last.nodes.length > 0) {
          this.nodes.length--;
          last.islater = true;
          this.later.unshift(last);
          this.returns = last.params;
        } else {
          break;
        }
      }
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
    }
    text() {
      return this.name + (this.params === null ? "()" : "(" + this.params + ")");
    }
    check() {
      for (var i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].check()) return false;
      }
      return true;
    }
    findMaxY() {
      var maxY = this.bottom;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
    layout(y) {
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      var deferred = [];
      if (this.islater) {
        this.top = mark(this.parent, this, y);
      } else {
        this.msgTop = mark(this.parent, this, y);
        this.top = mark(this.parent, this, this.msgTop);
        line(this.text(), this.parent, this, this.msgTop, CALL); // MIGHT NOT JOIN!!!!!!!
      }

      objs[this.objIndex].addSelfMessage(this);

      y = this.top + 1;
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else y = lo;
      }
      this.bottom = mark(this, this, y);
      if (!this.islater) {
        this.msgBottom = mark(this.parent, this, this.bottom);
        line((this.returns ? this.returns : ""), this, this.parent, this.msgBottom, RETURN); // MIGHT NOT JOIN!!!!!!!
      }
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      if (this.islater) y = this.bottom + 1;
      else y = this.bottom + 3;
      //if (!this.islater) 
      layoutLater(this, y);
      return this.bottom;
    }
  };










  class Root {
    constructor(call) {
      this.parent = { objIndex: 0 };
      this.name = call.name;
      this.params = call.params;
      this.objIndex = call.objIndex;
      this.frames = [];
      this.inFrame = false;
      this.labels = [];
      this.lines = [];
      objs[this.objIndex].alive = true;
      this.nodes = createNodes(this, call.subCalls);
      if (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage) {
          if (last.name == "return" && last.params != null && last.nodes.length == 0) {
            this.nodes.length--;
            this.returns = last.params;
          }
        }
      }
      this.later = [];
      while (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage
          && last.name == "later"
          && last.params === ""
          && last.nodes.length > 0) {
          this.nodes.length--;
          last.islater = true;
          this.later.unshift(last);
          this.returns = last.params;
        } else {
          break;
        }
      }
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
      this.level = 0;
    }
    text() {
      return this.name + (this.params === null ? "()" : "(" + this.params + ")");
    }
    check() {
      for (var i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].check()) return false;
      }
      return true;
    }
    findMaxY() {
      var maxY = this.bottom;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
    layout(y) {
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      this.top = mark(this.parent, this, y);
      var deferred = [];
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else y = lo;
      }
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      this.bottom = mark(this.parent, this, y);

      layoutLater(this, this.bottom + 1);

      return y;
    }
  };





  class LostMessage {
    constructor(parent, call) {
      this.parent = parent;
      this.name = call.name;
      this.params = call.params;
      this.objIndex = call.objIndex;
      this.min = this.objIndex;
      this.max = this.objIndex;
      objs[this.objIndex].alive = true;
    }
    text() {
      return this.name.substr(1) + (this.params === null ? "()" : "(" + this.params + ")");
    }
    check() {
      return true;
    }
    findMaxY() {
      var maxY = this.bottom;
      return maxY;
    }
    layout(y) {
      this.top = mark(this.parent, this, y);
      objs[this.objIndex].addLostMessage(this);
      line(this.text(), this.parent, this.parent, this.top, LOST);
      this.bottom = this.top;
      return this.bottom;
    }
  };





  class AsynchMessage {
    constructor(parent, call) {
      this.parent = parent;
      this.name = call.name;
      this.params = call.params;
      this.objIndex = call.objIndex;
      objs[this.objIndex].alive = true;
      this.frames = this.parent.frames;
      this.inFrame = this.parent.inFrame;
      this.labels = this.parent.labels;
      this.lines = this.parent.lines;
      this.nodes = createNodes(this, call.subCalls);
      this.later = [];
      while (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage
          && last.name == "later"
          && last.params === ""
          && last.nodes.length > 0) {
          this.nodes.length--;
          last.islater = true;
          this.later.unshift(last);
          this.returns = last.params;
        } else {
          break;
        }
      }
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
    }
    check() {

      // forwards
      if (this.parent.objIndex < this.objIndex) {
        var lines = countLinesUnder.call(this);
        if (lines.length > 0) {
          // insert pause before me
          // find my index
          var me = 0;
          while (me < this.parent.nodes.length && this.parent.nodes[me] != this) me++;
          this.parent.nodes.splice(me, 0, new Pause(this.parent));
          return false;
        } else {
          for (var i = 0; i < this.nodes.length; i++) {
            if (!this.nodes[i].check()) return false;
          }
          return true;
        }
      } else {
        var lines = countLinesUnder.call(this);
        if (lines.length > 0) {
          for (var i = 0; i < lines.length; i++) {
            // for each line add a pause at the end of the invocation
            if (lines[i].from.objIndex == this.objIndex) {
              // insert pause before me
              // find my index
              var me = 0;
              while (me < this.parent.nodes.length && this.parent.nodes[me] != this) me++;
              this.parent.nodes.splice(me, 0, new Pause(this.parent));
              return false;
            } else {
              lines[i].from.nodes.push(new Pause(lines[i].from));
            }
          }
          return false;
        } else {
          for (var i = 0; i < this.nodes.length; i++) {
            if (!this.nodes[i].check()) return false;
          }
          return true;
        }
      }
    }
    text() {
      return this.name + (this.params === null ? "()" : "(" + this.params + ")");
    }
    layout(y) {
      this.done = false;
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      if (objs[this.objIndex].pendingAsynch != null) {
        //objs[this.objIndex].pendingAsynch.deferredLayout();
        objs[this.objIndex].pendingAsynch = null;
      }
      this.top = mark(this.parent, this, y);
      line(this.text(), this.parent, this, this.top, ASYNCH);
      this.bottom = this.top + 1; // placeholder
      if (!DEFER_ASYNC || this.parent.objIndex > this.objIndex) {
        return this.deferredLayout();
      } else {
        objs[this.objIndex].pendingAsynch = this;
        return this;
      }
    }
    findMaxY() {
      var maxY = this.bottom;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
    deferredLayout() {
      if (!this.done) this.done = true;
      else return;
      var deferred = [];
      var y = this.top + 1;
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else y = lo;
      }
      this.bottom = mark(this, this, y);
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      y = this.bottom + 1;
      layoutLater(this, y);
      return this.top;
    }
  };






  class AsynchSelfMessage {
    constructor(parent, call) {

      this.parent = parent;
      this.name = call.name;
      this.params = call.params;
      this.objIndex = call.objIndex;
      objs[this.objIndex].alive = true;
      this.frames = this.parent.frames;
      this.inFrame = this.parent.inFrame;
      this.labels = this.parent.labels;
      this.lines = this.parent.lines;
      this.nodes = createNodes(this, call.subCalls);
      this.later = [];
      while (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage
          && last.name == "later"
          && last.params === ""
          && last.nodes.length > 0) {
          this.nodes.length--;
          last.islater = true;
          this.later.unshift(last);
          this.returns = last.params;
        } else {
          break;
        }
      }
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
    }
    text() {
      return this.name + (this.params === null ? "()" : "(" + this.params + ")");
    }
    check() {
      for (var i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].check()) return false;
      }
      return true;
    }
    layout(y) {
      this.done = false;
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      if (objs[this.objIndex].pendingAsynch != null) {
        //objs[this.objIndex].pendingAsynch.deferredLayout();
        objs[this.objIndex].pendingAsynch = null;
      }

      this.msgTop = mark(this.parent, this, y);
      this.top = mark(this.parent, this, this.msgTop);

      objs[this.objIndex].addSelfMessage(this); ////////////////////// TEST

      line(this.text(), this.parent, this, this.msgTop, ASYNCH);
      objs[this.objIndex].pendingAsynch = this;
      //if (DEFER_ASYNC) return this;
      //else 
      return this.deferredLayout();
    }
    findMaxY() {
      var maxY = this.bottom;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
    deferredLayout() {
      if (!this.done) this.done = true;
      else return;
      var deferred = [];
      var y = this.top + 1;
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else y = lo;
      }
      this.bottom = mark(this.parent, this, y);
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      y = this.bottom + 1;
      layoutLater(this, y);
      return this.top;
    }
  };






  class Create {
    constructor(parent, call) {
      this.parent = parent;
      this.objIndex = call.objIndex;
      objs[this.objIndex].alive = true;
      this.frames = this.parent.frames;
      this.inFrame = this.parent.inFrame;
      this.labels = this.parent.labels;
      this.lines = this.parent.lines;
      this.nodes = createNodes(this, call.subCalls);
      this.later = [];
      while (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage
          && last.name == "later"
          && last.params === ""
          && last.nodes.length > 0) {
          this.nodes.length--;
          last.islater = true;
          this.later.unshift(last);
          this.returns = last.params;
        } else {
          break;
        }
      }
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
    }
    text() {
      return (this.error ? "create" : "<<create>>");
    }
    check() {
      for (var i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].check()) return false;
      }
      return true;
    }
    findMaxY() {
      var maxY = this.bottom;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
    layout(y) {
      var deferred = [];
      this.top = mark(this.parent, this, y);
      this.error = (countInvocationsAt(this.objIndex, this.top) > 0); // || objs[this.objIndex].alive===true);

      //		objs[this.objIndex].alive = true;
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      if (!this.error) {
        if (objs[this.objIndex].cls == "actor"
          || objs[this.objIndex].cls == "boundary"
          || objs[this.objIndex].cls == "control"
          || objs[this.objIndex].cls == "entity") {
          this.top = mark(this.parent, this, this.top);
        }
      }
      line(this.text(), this.parent, this, this.top, (this.error ? CALL : LIFE));
      y = this.top + 1;
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else y = lo;
      }
      this.bottom = mark(this.parent, this, y);
      if (!this.error) {
        objs[this.objIndex].addLifeEvent({ event: OBJ_CREATED, y: this.top });
      }
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      if (this.error) {
        line("", this, this.parent, this.bottom, RETURN);
      }
      y = this.bottom + 1;
      layoutLater(this, y);
      return this.bottom;
    }
  };




  class Destroy {
    constructor(parent, call) {
      this.parent = parent;
      this.objIndex = call.objIndex;
      objs[this.objIndex].alive = false;
      this.frames = this.parent.frames;
      this.inFrame = this.parent.inFrame;
      this.labels = this.parent.labels;
      this.lines = this.parent.lines;
      this.nodes = createNodes(this, call.subCalls);
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
    }
    text() {
      return (this.error ? "destroy" : "<<destroy>>");
    }
    check() {
      for (var i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].check()) return false;
      }
      return true;
    }
    findMaxY() {
      var maxY = this.bottom;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
    layout(y) {
      var deferred = [];
      this.top = mark(this.parent, this, y);
      this.error = (countInvocationsAt(this.objIndex, this.top) > 0); // || objs[this.objIndex].alive===false);
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      line(this.text(), this.parent, this, this.top, (this.error ? CALL : LIFE));
      y = this.top + 1;
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else y = lo;
      }
      this.bottom = mark(this, this, y);
      if (!this.error) {
        this.cross = mark(this, this, this.bottom);
        objs[this.objIndex].addLifeEvent({ event: OBJ_DESTROYED, y: this.cross });
      }
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      if (this.error) {
        line("", this, this.parent, this.bottom, RETURN);
      } else {
        objs[this.objIndex].alive = false;
      }
      return (this.error ? this.bottom : this.cross); // y = lo + 1
    }
  };





  class MultiFrame {
    constructor(parent, parts) {
      this.parent = parent;
      this.parent.frames.push(this);
      this.frames = [];
      this.inFrame = true;
      this.labels = [];
      this.lines = [];
      this.name = parts[0].name;
      this.objIndex = parent.objIndex;
      this.nodes = [];
      for (var i = 0; i < parts.length; i++) {
        this.nodes.push(new MultiFramePart(this, parts[i]));
      }
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
      for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].min = this.min;
        this.nodes[i].max = this.max;
      }
      this.level = -1;
    }
    text() {
      console.error(new Error().stack);
      throw "MultiFrame.text";
    }
    check() {
      for (var i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].check()) return false;
      }
      return true;
    }
    findMaxY() {
      if (this.bottom) return this.bottom;
      var maxY = this.top;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
    layout(y) {
      var deferred = [];
      this.top = mark(objs[this.min], objs[this.max], y);
      y = this.top + 1;
      for (var i = 0; i < this.nodes.length; i++) {
        y = this.nodes[i].layout(y);
      }
      this.bottom = mark(objs[this.min], objs[this.max], y);
      var splits = [];
      for (var i = 0; i < this.nodes.length; i++) {
        splits.push({ text: this.nodes[i].params, top: this.nodes[i].top });
      }

      objs[this.min].addLeftFrame(this);
      objs[this.max].addRightFrame(this);

      this.layoutInfo = { name: this.name, params: this.params, top: this.top, bottom: this.bottom, left: this.min, right: this.max, splits: splits };
      return this.bottom;
    }
  };





  class MultiFramePart {
    constructor(parent, call) {
      this.parent = parent;
      this.params = call.params;
      this.objIndex = call.objIndex;
      this.frames = this.parent.frames;
      this.inFrame = this.parent.inFrame;
      this.labels = this.parent.labels;
      this.lines = this.parent.lines;
      this.nodes = createNodes(this, call.subCalls);

      this.later = [];
      while (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage
          && last.name == "later"
          && last.params === ""
          && last.nodes.length > 0) {
          this.nodes.length--;
          last.islater = true;
          this.later.unshift(last);
          this.returns = last.params;
        } else {
          break;
        }
      }

      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
      this.level = -1;
    }
    text() {
      return this.params === null ? "" : "[ " + this.params + " ]";
    }
    check() {
      for (var i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].check()) return false;
      }
      return true;
    }
    layout(y) {
      var lineAt = -1;
      if (str(this.params)) {
        this.top = mark2(objs[this.min], objs[this.max], y);
        lineAt = this.top + 1;
        y = this.top + 2;
      } else {
        this.top = mark(objs[this.min], objs[this.max], y);
        y = this.top + 1;
      }
      var deferred = [];
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else y = lo;
      }
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }

      if (lineAt > 0) {
        if (this.min == this.max) {
          objs[this.objIndex].addSelfMessage(this);
        }
        line(this.params, { objIndex: this.min, level: 0 }, { objIndex: this.max, level: 0 }, lineAt, HIDDEN);
      }

      //this.bottom = mark(objs[this.min],objs[this.max],this.findMaxY());
      this.bottom = this.findMaxY();

      layoutLater(this, this.bottom + 1);
      return this.bottom;
    }
    findMaxY() {
      if (this.bottom) return this.bottom;
      var maxY = this.top;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
  };





  class Frame {
    constructor(parent, call) {
      this.parent = parent;
      this.parent.frames.push(this);
      this.name = call.name;
      this.params = call.params;
      this.objIndex = call.objIndex;
      this.frames = [];
      this.inFrame = true;
      this.labels = [];
      this.lines = [];
      this.nodes = createNodes(this, call.subCalls);

      this.later = [];
      while (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage
          && last.name == "later"
          && last.params === ""
          && last.nodes.length > 0) {
          this.nodes.length--;
          last.islater = true;
          this.later.unshift(last);
          this.returns = last.params;
        } else {
          break;
        }
      }

      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
      this.level = -1;
    }
    text() {
      return this.params === null ? "" : "[ " + this.params + " ]";
    }
    check() {
      for (var i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].check()) return false;
      }
      return true;
    }
    findMaxY() {
      if (this.bottom) return this.bottom;
      var maxY = this.top;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
    layout(y) {
      var deferred = [];
      var lineAt = -1;

      if (!str(this.params)) {
        this.top = mark2(objs[this.min], objs[this.max], y);
        y = this.top + 2;
      } else {
        this.top = mark3(objs[this.min], objs[this.max], y);
        lineAt = this.top + 2;
        y = this.top + 3;
      }
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else y = lo;
      }
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }

      this.bottom = mark(objs[this.min], objs[this.max], this.findMaxY());

      if (lineAt > 0) {
        if (this.min == this.max) {
          objs[this.objIndex].addSelfMessage(this);
        }
        line(this.params, { objIndex: this.min, level: 0 }, { objIndex: this.max, level: 0 }, lineAt, HIDDEN);
      }

      layoutLater(this, this.bottom + 1);

      objs[this.min].addLeftFrame(this);
      objs[this.max].addRightFrame(this);

      this.layoutInfo = { name: this.name, params: this.params, top: this.top, bottom: this.bottom, left: this.min, right: this.max };
      return this.bottom;
    }
  };







  class RefLabel {
    constructor(parent, call) {
      this.parent = parent;
      this.parent.labels.push(this);
      this.name = call.name;
      this.params = call.params;
      this.params = call.params;
      this.link = null;
      if (this.params) {
        let tl = g.textLink(this.params)

        if (tl) {
          this.params = tl.text
          this.link = tl.link
        }
      }

      this.objIndex = call.objIndex;
      this.min = this.objIndex;
      this.max = this.objIndex;
      this.level = -1;
    }
    text() {
      return this.params === null ? "" : "[ " + this.params + " ]";
    }
    check() {
      return true;
    }
    findMaxY() {
      if (this.bottom) return this.bottom;
    }
    layout(y) {

      this.top = mark4(objs[this.objIndex], objs[this.objIndex], y);
      this.bottom = this.top + 3;
      y = this.bottom + 1;
      objs[this.min].addLabel(this);
      this.layoutInfo = { name: this.name, params: this.params, link: this.link, top: this.top, bottom: this.bottom, left: this.objIndex, right: this.objIndex, x: this.objIndex };
      return this.bottom;
    }
  };






  class Label {
    constructor(parent, call) {
      this.parent = parent;
      this.parent.labels.push(this);
      this.name = call.name;
      this.params = call.params;
      this.objIndex = call.objIndex;
      objs[this.objIndex].alive = true;
      this.nodes = [];
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
      this.level = parent.level;
    }
    text() {
      return this.name + (this.params === null ? "" : "( " + this.params + " )");
    }
    check() {
      return true;
    }
    layout(y) {
      var left = { objIndex: this.objIndex };
      //		if (this.objIndex>0) left.objIndex--;
      var right = { objIndex: this.objIndex };
      //		if (objs.length>this.objIndex+1) right.objIndex++;
      this.top = mark(left, right, y);
        /*if (this.name=="ref") y = mark(left,right,this.top);
        else */ y = this.top;
      this.bottom = mark(left, right, y);
      this.layoutInfo = { name: this.name, text: this.params, top: this.top, bottom: this.bottom, left: this.objIndex, right: this.objIndex, x: this.objIndex };

      objs[this.objIndex].addLabel(this);

      return this.bottom;
    }
    findMaxY() {
      return this.bottom;
    }
  };





  function createNodes(parent, subCalls) {
    var nodes = [];
    for (var i = 0; i < subCalls.length; i++) {

      var name = subCalls[i].name.toLowerCase();
      var noChildren = subCalls[i].subCalls.length == 0;

      if (parent.objIndex == subCalls[i].objIndex) {

        if (noChildren && name == "pause") {
          nodes.push(new Pause(parent));
        } else if (noChildren && name == "note" && Note.parseParams(subCalls[i].params)) {
          notes.push(new Note(subCalls[i]));
        } else if (noChildren && name.charAt(0) == "-") {
          nodes.push(new LostMessage(parent, subCalls[i]));
        } else if (noChildren && name.charAt(0) == "+") {
          nodes.push(new FoundMessage(parent, subCalls[i]));
        } else if (noChildren && (name == "state" || name == "invariant") && subCalls[i].params !== null) {
          nodes.push(new Label(parent, subCalls[i]));
        } else if (noChildren && name == "ref" && subCalls[i].params !== null) {

          nodes.push(new RefLabel(parent, subCalls[i]));

        } else if (!noChildren && (name == "alt" || name == "par" || name == "strict" || name == "seq")) {
          var calls = [];
          for (; i < subCalls.length && subCalls[i].name == name; i++) {
            calls.push(subCalls[i]);
          }
          i--;
          nodes.push(new MultiFrame(parent, calls));

        } else if (!noChildren && (name == "loop" || name == "opt"
          || name == "critical" || name == "ignore" || name == "consider"
          || name == "assert" || name == "neg" || name == "break")) {

          nodes.push(new Frame(parent, subCalls[i]));

        } else if (subCalls[i].isAsynch) {
          nodes.push(new AsynchSelfMessage(parent, subCalls[i]));
        } else {
          nodes.push(new SelfMessage(parent, subCalls[i]));
        }
      } else {

        if (subCalls[i].isAsynch) {
          if (objs[subCalls[i].objIndex].alive === false) {
            nodes.push(new Create(parent, { objIndex: subCalls[i].objIndex, name: "create", params: null, isAsynch: false, subCalls: [] }));
          }
          nodes.push(new AsynchMessage(parent, subCalls[i]));
        } else if (subCalls[i].name.toLowerCase() == "create") {
          if (objs[subCalls[i].objIndex].alive === true) {
            nodes.push(new Destroy(parent, { objIndex: subCalls[i].objIndex, name: "destroy", params: null, isAsynch: false, subCalls: [] }));
          }
          nodes.push(new Create(parent, subCalls[i]));
        } else if (subCalls[i].name.toLowerCase() == "destroy") {
          if (objs[subCalls[i].objIndex].alive === false) {
            nodes.push(new Create(parent, { objIndex: subCalls[i].objIndex, name: "create", params: null, isAsynch: false, subCalls: [] }));
          }
          nodes.push(new Destroy(parent, subCalls[i]));
        } else if (name == "ref" && noChildren && subCalls[i].params !== null) {
          nodes.push(new RefMessage(parent, subCalls[i]));
        } else {
          if (objs[subCalls[i].objIndex].alive === false) {
            nodes.push(new Create(parent, { objIndex: subCalls[i].objIndex, name: "create", params: null, isAsynch: false, subCalls: [] }));
          }
          nodes.push(new Message(parent, subCalls[i]));
        }
      }
    }
    return nodes;
  }

   function drawYs() {
     for (let i = 0; i <= maxY; i++) {
       g.text(i, 3, y(i),ALIGN_LEFT)
     }
     for (let i = 0; i < objs.length; i++) {
      g.text(i, objs[i].x, 20, ALIGN_LEFT)
      for (let j=0 ; j < objs[i].marks.length; j++) {
        if (objs[i].marks[j]) g.text("X", objs[i].x, y(j), ALIGN_LEFT)
      }

      console.log(i + " " + objs[i].name + " " + objs[i].bottom + " " + objs[i].getLeftWidth(g) + " " + objs[i].getRightWidth(g))  
     }
   }


  if (_objs.length == 0) {
    _objs.push(new Obj("", "actor"));
  }

  var diagramFrame = null;

  init(_objs);
  try {

    if (rootCall.subCalls.length == 1
      && rootCall.subCalls[0].name == "frame"
      && rootCall.subCalls[0].params != null
      && rootCall.subCalls[0].objIndex == 0) {
      diagramFrame = rootCall.subCalls[0];
      rootCall.subCalls = rootCall.subCalls[0].subCalls;
    }

    root = new Root(rootCall);
    //var n = new FoundMessage({objIndex:0},rootCall);
    for (var i = 0; ; i++) {
      root.layout(1);
      sortInvocations();
      calcInvocationLevels();
      if (root.check() || i == 5) break;
      reset();

    }

    // work out sizes
    //objs.push();
    const dim = layout();
    const diagramWidth = dim.w

    dim.w = Math.max(dim.w, g.widthOf("seqcode--")*1.5)
    if (diagramFrame) {
      dim.w = Math.max(dim.w, g.widthOf(diagramFrame.params) + 30);
    }

    g.setSize(dim.w, dim.h); // Math.max(maxNoteY,y(maxY+2)));
    const svgWidth = dim.w

    if (svgWidth > diagramWidth) {
      // translate graphics to center
      g.setTranslation((svgWidth-diagramWidth)/2,0)
    }
    
    draw();

    if (DEBUG) drawYs()

    if (diagramFrame != null) g.drawDiagramFrame(diagramFrame);
  } catch (e) {
    console.error(e);
  }
  if (errors.length > 0) {
    console.error("errors:");
    console.error(errors);
  }
};
