/* SeqCode - (c) Daniel Walton (daniel@belteshazzar.com)
 * Licensed under the BSD 2-Clause License; see the LICENSE file.
 */

import { OBJ_CREATED, OBJ_DESTROYED } from "./obj.js";
import { ALIGN_LEFT, ALIGN_CENTER, ALIGN_RIGHT } from "./graphics.js";
import { LayoutError } from "./layout_error.js";
import { MarkGrid } from "./layout/grid.js";
import { buildNodes } from "./layout/nodes.js";
import { LOST, FOUND, HIDDEN, REF, WIDTH, str } from "./layout/consts.js";

const DEBUG = false;

export function graph(_objs, rootCall, g) {

  const objs = _objs;
  const lines = [];
  const invocations = [];
  const notes = [];
  const grid = new MarkGrid(objs);
  const N = buildNodes({ objs, grid, lines, invocations, notes, g });

  var root = null;
  var errors = [];
  var diagramFrame = null;
  var sized = false;

  function reset() {
    lines.length = 0;
    invocations.length = 0;
    grid.maxY = 0;
    errors = [];
    notes.length = 0;

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
          g.dashedLine(this.x, y(createdAt) + g.rowSpacing() / 2, this.x, y(grid.maxY + 1));
        }
      } else {
        g.dashedLine(this.x, y(0) + g.rowSpacing() / 2, this.x, y(grid.maxY + 1));
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
    f.layoutInfo.rightPadding = objs[right].getRightWidth(g, top, bottom) - (rightFrames - 1) * FRAME_PADDING;

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
        if (toObj.cls == "actor") objExtra = Math.max(g.widthOf(toObj.getText()) / 2, 10);
        else if (toObj.cls == "control" || toObj.cls == "boundary" || toObj.cls == "entity") objExtra = Math.max(g.widthOf(toObj.getText()) / 2, 20);
        if (l.to.objIndex > l.from.objIndex) {
          if (toObj.cls == "boundary") objExtra += 5;
        }
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

    let dim = { w: 0, h: y(grid.maxY + 2) };
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

  function y(ygrid) {
    return g.margin() + g.rowSpacing() * (ygrid + (diagramFrame ? 2 : 1));
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

    g.frameLabel(xl,y(top),tw+15,y(top+1)-y(top),"ref")
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
    } else if (r.name == "invariant") {
      const invs = objs[r.x].maxInvocationDepth(r.top, r.top);
      var objX = objs[r.x].x + (invs - 1) * 5;
      const txt = "{" + (r.text ? r.text : "") + "}"
      var radius = 5;// TODO same as measure width?
      const w = Math.max(invs * 10 + 30, Math.max(50, g.widthOf(r.text) + radius * 2));
      var left = Math.ceil(objX - w / 2);
      g.transparentRect(left, y(r.top), w, y(r.bottom) - y(r.top), txt);
    }
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
      errors.push(new LayoutError("line has non-numeric coordinates: "
        + l.from.objIndex + "#" + l.from.level + ":" + fromX + " -> "
        + l.to.objIndex + "#" + l.to.level + ":" + toX));
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

  function drawInvocation(i) {
    var x = objs[i.objIndex].x + WIDTH / 2 * (i.level - 1);
    var yPx = y(i.top);
    var w = WIDTH;
    var h = y(i.bottom) - yPx;
    var cls = objs[i.objIndex].cls;
    if (i instanceof N.Create
      && !i.error
      && (cls == "actor"
        || cls == "boundary"
        || cls == "control"
        || cls == "entity")) {
      yPx += g.rowSpacing() / 2;
      h -= g.rowSpacing() / 2;
    }
    g.fillRect(x, yPx, w, h);
  }

  function drawYs() {
    for (let i = 0; i <= grid.maxY; i++) {
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

  init();
  try {

    if (rootCall.subCalls.length == 1
      && rootCall.subCalls[0].name == "frame"
      && rootCall.subCalls[0].params != null
      && rootCall.subCalls[0].objIndex == 0) {
      diagramFrame = rootCall.subCalls[0];
      rootCall.subCalls = rootCall.subCalls[0].subCalls;
    }

    root = new N.Root(rootCall);
    for (var i = 0; ; i++) {
      root.layout(1);
      sortInvocations();
      calcInvocationLevels();
      if (root.check() || i == 5) break;
      reset();
    }

    // work out sizes
    const dim = layout();
    const diagramWidth = Math.ceil(dim.w)

    dim.w = Math.max(dim.w, g.widthOf("seqcode--")*1.5)
    if (diagramFrame) {
      dim.w = Math.max(dim.w, g.widthOf(diagramFrame.params) + 30);
    }
    dim.w = Math.ceil(dim.w)
    dim.h = Math.ceil(dim.h)

    g.setSize(dim.w, dim.h);
    sized = true;
    const svgWidth = dim.w

    if (svgWidth > diagramWidth) {
      // translate graphics to center
      g.setTranslation((svgWidth-diagramWidth)/2,0)
    }

    draw();

    if (DEBUG) drawYs()

    if (diagramFrame != null) g.drawDiagramFrame(diagramFrame);
  } catch (e) {
    // best-effort rendering: report the failure to the caller but still
    // return whatever was drawn before the crash
    errors.push(new LayoutError("layout failed: " + (e && e.message ? e.message : e), e));
    if (!sized) {
      try {
        g.setSize(g.margin() * 2, g.margin() * 2);
      } catch (e2) {
        // ignore: svg stays unsized
      }
    }
  }
  return errors;
};
