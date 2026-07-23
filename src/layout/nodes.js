
import { OBJ_CREATED, OBJ_DESTROYED } from "../obj.js";
import { CALL, RETURN, ASYNCH, LIFE, LOST, FOUND, HIDDEN, REF, str } from "./consts.js";

const DEFER_ASYNC = true;

// Builds the layout node classes bound to a shared layout context:
//   ctx = { objs, grid, lines, invocations, notes, g }
// The arrays are shared with the caller and must be cleared in place
// (length = 0) between layout passes, never reassigned.
export function buildNodes(ctx) {

  const { objs, grid, lines, invocations, notes, g } = ctx;

  function mark(oFrom, oTo, y) {
    return grid.markN(oFrom, oTo, y, 1);
  }

  function markN(oFrom, oTo, y, n) {
    return grid.markN(oFrom, oTo, y, n);
  }

  function line(text, from, to, y, style, meta) {
    const ln = { text: text, from: from, to: to, y: y, style: style, meta: meta };
    lines.push(ln);
    if (from.lines) from.lines.push(ln);
  }

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
      var running = countInvocationsAt(objIndex, y);
      if (running > 0) {
        y++;
      } else {
        var later = objs[objIndex].later.shift();
        y = later.layout(y);
      }
    }
  }

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

  // Base for everything that takes part in layout. Subclasses opt in to the
  // shared behaviours: inheritFrameContext() for nodes that live inside their
  // parent's frame context, extractReturns()/extractLater() for the trailing
  // return(x)/later{} conventions, and layoutChildren() for the common
  // child-layout loop with deferred async handling.
  class LayoutNode {
    constructor(parent, call) {
      this.parent = parent;
      if (call) {
        this.name = call.name;
        this.params = call.params;
        this.objIndex = call.objIndex;
      }
    }
    inheritFrameContext() {
      this.frames = this.parent.frames;
      this.inFrame = this.parent.inFrame;
      this.labels = this.parent.labels;
      this.lines = this.parent.lines;
    }
    computeMinMax() {
      var mm = minmax(this);
      this.min = mm.min;
      this.max = mm.max;
    }
    // a trailing return(x) self message becomes the return value
    extractReturns() {
      if (this.nodes.length > 0) {
        var last = this.nodes[this.nodes.length - 1];
        if (last instanceof SelfMessage) {
          if (last.name == "return" && last.params != null && last.nodes.length == 0) {
            this.nodes.length--;
            this.returns = last.params;
          }
        }
      }
    }
    // trailing later{} blocks are pulled out of the flow and laid out
    // after this node's parent completes
    extractLater() {
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
    }
    layoutChildren(y, deferred) {
      for (var i = 0; i < this.nodes.length; i++) {
        var lo = this.nodes[i].layout(y);
        if (typeof (lo) == "object") {
          deferred.push(lo);
          y = this.nodes[i].top;
        } else {
          y = lo;
        }
      }
      return y;
    }
    text() {
      return this.name + (this.params === null ? "()" : "(" + this.params + ")");
    }
    check() {
      if (!this.nodes) return true;
      for (var i = 0; i < this.nodes.length; i++) {
        if (!this.nodes[i].check()) return false;
      }
      return true;
    }
    findMaxY() {
      var maxY = this.bottom;
      if (this.nodes) {
        for (var i = 0; i < this.nodes.length; i++) {
          maxY = Math.max(maxY, this.nodes[i].findMaxY());
        }
      }
      return maxY;
    }
  }

  // Frames measure from their top when their bottom isn't final yet.
  class ContainerNode extends LayoutNode {
    findMaxY() {
      if (this.bottom) return this.bottom;
      var maxY = this.top;
      for (var i = 0; i < this.nodes.length; i++) {
        maxY = Math.max(maxY, this.nodes[i].findMaxY());
      }
      return maxY;
    }
  }

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

  class FoundMessage extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.min = this.objIndex;
      this.max = this.objIndex;
      objs[this.objIndex].alive = true;
    }
    text() {
      return this.name.substr(1) + (this.params === null ? "()" : "(" + this.params + ")");
    }
    layout(y) {
      this.top = mark(this.parent, this, y);
      objs[this.objIndex].addFoundMessage(this);
      line(this.text(), this.parent, this.parent, this.top, FOUND);
      this.bottom = this.top;
      return this.bottom;
    }
  };

  class Message extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.inheritFrameContext();
      objs[this.objIndex].alive = true;
      this.nodes = createNodes(this, call.subCalls);
      this.extractReturns();
      this.extractLater();
      this.computeMinMax();
    }
    check() {
      // a backwards message with lines crossing under it needs a Pause
      // inserted before it and a re-layout
      if (this.parent.objIndex > this.objIndex) {
        var lines = countLinesUnder.call(this);
        if (lines.length > 0) {
          // insert pause before me
          // find my index
          var me = 0;
          while (me < this.parent.nodes.length && this.parent.nodes[me] != this) me++;
          this.parent.nodes.splice(me, 0, new Pause(this.parent));
          return false;
        }
      }
      return super.check();
    }
    layout(y) {
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      var deferred = [];
      this.top = mark(this.parent, this, y);
      line(this.text(), this.parent, this, this.top, CALL);
      y = this.layoutChildren(this.top + 1, deferred);
      this.bottom = mark(this, this.parent, y);
      line((this.returns ? this.returns : ""), this, this.parent, this.bottom, RETURN);
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      layoutLater(this, this.bottom + 1);
      return this.bottom;
    }
  };

  class RefMessage extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.link = null;
      if (this.params) {
        let tl = g.textLink(this.params)

        if (tl) {
          this.params = tl.text
          this.link = tl.link
        }
      }
      objs[this.objIndex].alive = true;
      this.min = Math.min(this.objIndex, parent.objIndex);
      this.max = Math.max(this.objIndex, parent.objIndex);
    }
    layout(y) {
      this.top = markN(objs[this.min], objs[this.max], y, 4);
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

  class Pause extends LayoutNode {
    constructor(parent) {
      super(parent);
      this.objIndex = parent.objIndex;
      this.min = parent.objIndex;
      this.max = parent.objIndex;
    }
    text() {
      throw new Error("Pause.text should never be called");
    }
    layout(y) {
      this.top = mark(this, this, y);
      this.bottom = this.top;
      return this.bottom;
    }
  };

  class SelfMessage extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.inheritFrameContext();
      objs[this.objIndex].alive = true;
      this.nodes = createNodes(this, call.subCalls);
      this.extractReturns();
      this.extractLater();
      this.computeMinMax();
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

      y = this.layoutChildren(this.top + 1, deferred);
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
      layoutLater(this, y);
      return this.bottom;
    }
  };

  class Root extends LayoutNode {
    constructor(call) {
      super({ objIndex: 0 }, call);
      this.frames = [];
      this.inFrame = false;
      this.labels = [];
      this.lines = [];
      objs[this.objIndex].alive = true;
      this.nodes = createNodes(this, call.subCalls);
      this.extractReturns();
      this.extractLater();
      this.computeMinMax();
      this.level = 0;
    }
    layout(y) {
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      this.top = mark(this.parent, this, y);
      var deferred = [];
      y = this.layoutChildren(y, deferred);
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      this.bottom = mark(this.parent, this, y);

      layoutLater(this, this.bottom + 1);

      return y;
    }
  };

  class LostMessage extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.min = this.objIndex;
      this.max = this.objIndex;
      objs[this.objIndex].alive = true;
    }
    text() {
      return this.name.substr(1) + (this.params === null ? "()" : "(" + this.params + ")");
    }
    layout(y) {
      this.top = mark(this.parent, this, y);
      objs[this.objIndex].addLostMessage(this);
      line(this.text(), this.parent, this.parent, this.top, LOST);
      this.bottom = this.top;
      return this.bottom;
    }
  };

  class AsynchMessage extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.inheritFrameContext();
      objs[this.objIndex].alive = true;
      this.nodes = createNodes(this, call.subCalls);
      this.extractLater();
      this.computeMinMax();
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
        }
        return super.check();
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
        }
        return super.check();
      }
    }
    layout(y) {
      this.done = false;
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      if (objs[this.objIndex].pendingAsynch != null) {
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
    deferredLayout() {
      if (!this.done) this.done = true;
      else return;
      var deferred = [];
      var y = this.layoutChildren(this.top + 1, deferred);
      this.bottom = mark(this, this, y);
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      layoutLater(this, this.bottom + 1);
      return this.top;
    }
  };

  class AsynchSelfMessage extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.inheritFrameContext();
      objs[this.objIndex].alive = true;
      this.nodes = createNodes(this, call.subCalls);
      this.extractLater();
      this.computeMinMax();
    }
    layout(y) {
      this.done = false;
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      if (objs[this.objIndex].pendingAsynch != null) {
        objs[this.objIndex].pendingAsynch = null;
      }

      this.msgTop = mark(this.parent, this, y);
      this.top = mark(this.parent, this, this.msgTop);

      objs[this.objIndex].addSelfMessage(this);

      line(this.text(), this.parent, this, this.msgTop, ASYNCH);
      objs[this.objIndex].pendingAsynch = this;
      return this.deferredLayout();
    }
    deferredLayout() {
      if (!this.done) this.done = true;
      else return;
      var deferred = [];
      var y = this.layoutChildren(this.top + 1, deferred);
      this.bottom = mark(this.parent, this, y);
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }
      layoutLater(this, this.bottom + 1);
      return this.top;
    }
  };

  class Create extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.inheritFrameContext();
      objs[this.objIndex].alive = true;
      this.nodes = createNodes(this, call.subCalls);
      this.extractLater();
      this.computeMinMax();
    }
    text() {
      return (this.error ? "create" : "<<create>>");
    }
    layout(y) {
      var deferred = [];
      this.top = mark(this.parent, this, y);
      this.error = (countInvocationsAt(this.objIndex, this.top) > 0);

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
      y = this.layoutChildren(this.top + 1, deferred);
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
      layoutLater(this, this.bottom + 1);
      return this.bottom;
    }
  };

  class Destroy extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.inheritFrameContext();
      objs[this.objIndex].alive = false;
      this.nodes = createNodes(this, call.subCalls);
      this.computeMinMax();
    }
    text() {
      return (this.error ? "destroy" : "<<destroy>>");
    }
    layout(y) {
      var deferred = [];
      this.top = mark(this.parent, this, y);
      this.error = (countInvocationsAt(this.objIndex, this.top) > 0);
      invocations.push(this);
      objs[this.objIndex].addInvocation(this);
      line(this.text(), this.parent, this, this.top, (this.error ? CALL : LIFE));
      y = this.layoutChildren(this.top + 1, deferred);
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

  class MultiFrame extends ContainerNode {
    constructor(parent, parts) {
      super(parent);
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
      this.computeMinMax();
      for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].min = this.min;
        this.nodes[i].max = this.max;
      }
      this.level = -1;
    }
    text() {
      throw new Error("MultiFrame.text should never be called");
    }
    layout(y) {
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

  class MultiFramePart extends ContainerNode {
    constructor(parent, call) {
      super(parent, call);
      this.inheritFrameContext();
      this.nodes = createNodes(this, call.subCalls);
      this.extractLater();
      this.computeMinMax();
      this.level = -1;
    }
    text() {
      return this.params === null ? "" : "[ " + this.params + " ]";
    }
    layout(y) {
      var lineAt = -1;
      if (str(this.params)) {
        this.top = markN(objs[this.min], objs[this.max], y, 2);
        lineAt = this.top + 1;
        y = this.top + 2;
      } else {
        this.top = mark(objs[this.min], objs[this.max], y);
        y = this.top + 1;
      }
      var deferred = [];
      y = this.layoutChildren(y, deferred);
      for (var i = 0; i < deferred.length; i++) {
        deferred[i].deferredLayout();
      }

      if (lineAt > 0) {
        if (this.min == this.max) {
          objs[this.objIndex].addSelfMessage(this);
        }
        line(this.params, { objIndex: this.min, level: 0 }, { objIndex: this.max, level: 0 }, lineAt, HIDDEN);
      }

      this.bottom = this.findMaxY();

      layoutLater(this, this.bottom + 1);
      return this.bottom;
    }
  };

  class Frame extends ContainerNode {
    constructor(parent, call) {
      super(parent, call);
      this.parent.frames.push(this);
      this.frames = [];
      this.inFrame = true;
      this.labels = [];
      this.lines = [];
      this.nodes = createNodes(this, call.subCalls);
      this.extractLater();
      this.computeMinMax();
      this.level = -1;
    }
    text() {
      return this.params === null ? "" : "[ " + this.params + " ]";
    }
    layout(y) {
      var deferred = [];
      var lineAt = -1;

      if (!str(this.params)) {
        this.top = markN(objs[this.min], objs[this.max], y, 2);
        y = this.top + 2;
      } else {
        this.top = markN(objs[this.min], objs[this.max], y, 3);
        lineAt = this.top + 2;
        y = this.top + 3;
      }
      y = this.layoutChildren(y, deferred);
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

  class RefLabel extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.parent.labels.push(this);
      this.link = null;
      if (this.params) {
        let tl = g.textLink(this.params)

        if (tl) {
          this.params = tl.text
          this.link = tl.link
        }
      }

      this.min = this.objIndex;
      this.max = this.objIndex;
      this.level = -1;
    }
    text() {
      return this.params === null ? "" : "[ " + this.params + " ]";
    }
    layout(y) {

      this.top = markN(objs[this.objIndex], objs[this.objIndex], y, 4);
      this.bottom = this.top + 3;
      y = this.bottom + 1;
      objs[this.min].addLabel(this);
      this.layoutInfo = { name: this.name, params: this.params, link: this.link, top: this.top, bottom: this.bottom, left: this.objIndex, right: this.objIndex, x: this.objIndex };
      return this.bottom;
    }
  };

  class Label extends LayoutNode {
    constructor(parent, call) {
      super(parent, call);
      this.parent.labels.push(this);
      objs[this.objIndex].alive = true;
      this.nodes = [];
      this.computeMinMax();
      this.level = parent.level;
    }
    text() {
      return this.name + (this.params === null ? "" : "( " + this.params + " )");
    }
    layout(y) {
      var left = { objIndex: this.objIndex };
      var right = { objIndex: this.objIndex };
      this.top = mark(left, right, y);
      y = this.top;
      this.bottom = mark(left, right, y);
      this.layoutInfo = { name: this.name, text: this.params, top: this.top, bottom: this.bottom, left: this.objIndex, right: this.objIndex, x: this.objIndex };

      objs[this.objIndex].addLabel(this);

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

  return {
    LayoutNode, ContainerNode, Note,
    Root, Message, SelfMessage, AsynchMessage, AsynchSelfMessage,
    Create, Destroy, Frame, MultiFrame, MultiFramePart,
    Pause, LostMessage, FoundMessage, RefMessage, RefLabel, Label,
    createNodes, layoutLater, countInvocationsAt,
  };
}
