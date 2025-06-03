

export const OBJ_CREATED = 1;
export const OBJ_DESTROYED = 0;

export class Obj {

  constructor(_name, _cls) {
    this.name = _name;
    this.cls = _cls;
    this.labels = [];
    this.selfMsgs = [];
    this.lostMsgs = [];
    this.foundMsgs = [];
    this.leftFrames = [];
    this.rightFrames = [];
    this.invocations = [];
    this.lifeEvents = [];
    this.x = 0;
    this.bottom = 0;
  }

  getText() {
    if (this.cls == "actor") return this.name;
    if (this.cls == "boundary") return this.name;
    if (this.cls == "control") return this.name;
    if (this.cls == "entity") return this.name;
    return (this.name ? this.name : "") + " : " + (this.cls ? this.cls : "");
  };

  addLifeEvent(ev) {
    this.lifeEvents.push(ev);
    this.bottom = Math.max(this.bottom,ev.y)
  };

  addLabel(label) {
    if (!label.params) label.params = "";

    for (let y = label.top; y <= label.bottom; y++) {
      if (this.labels[y]) throw "attempt to add label at location a label already exists";
      this.labels[y] = label;
    }
    this.bottom = Math.max(this.bottom, label.bottom);
  };

  addLeftFrame(f) {

    for (let y = f.top; y <= f.bottom; y++) {
      if (this.leftFrames[y]) this.leftFrames[y]++;
      else this.leftFrames[y] = 1;
    }
    this.bottom = Math.max(this.bottom, f.bottom);
  };

  addRightFrame(f) {

    for (let y = f.top; y <= f.bottom; y++) {
      if (this.rightFrames[y]) this.rightFrames[y]++;
      else this.rightFrames[y] = 1;
    }

    this.bottom = Math.max(this.bottom, f.bottom);
  };

  leftFrameDepth(top, bottom) {

    let max = 0;

    for (let y = top; y <= bottom; y++) {
      if (this.leftFrames[y]) max = Math.max(max, this.leftFrames[y]);
    }

    return max;
  };

  rightFrameDepth(top, bottom) {

    let max = 0;

    for (let y = top; y <= bottom; y++) {
      if (this.rightFrames[y]) max = Math.max(max, this.rightFrames[y]);
    }

    return max;
  };

  leftFrameSpace(y) {
    if (this.leftFrames[y]) return this.leftFrames[y] * 20;
    return 0;
  };

  rightFrameSpace(y) {
    if (this.rightFrames[y]) return this.rightFrames[y] * 20;
    return 0;
  };

  addSelfMessage(msg) {
    this.selfMsgs[msg.top] = msg;
    this.bottom = Math.max(this.bottom, msg.top);
  };

  addLostMessage(msg) {
    this.lostMsgs[msg.top] = msg;
    this.bottom = Math.max(this.bottom, msg.top);
  };

  addFoundMessage(msg) {
    this.foundMsgs[msg.top] = msg;
    this.bottom = Math.max(this.bottom, msg.top);
  };

  addInvocation(inv) {
    this.invocations.push(inv);
  };

  maxInvocationDepth(y1, y2) {

    let max = 0;

    this.invocations.forEach(function (inv) {
      if (inv.top <= y2 && inv.bottom >= y1 && inv.level > max) max = inv.level;
    });

    return max + 1;
  };

  hasCreationEvent(y1, y2) {
    if (this.lifeEvents.length == 0) {
      // no life events, gets created at y=0
      return y1 == 0;
    } else {
      let hasCreation = false;
      this.lifeEvents.forEach(function (ev) {
        if (ev.event == OBJ_CREATED && ev.y >= y1 && ev.y <= y2) hasCreation = true;
      });
      return hasCreation;
    }
  };

  creationWidth(g) {
    if (this.cls == "actor") {
      return Math.max(g.widthOf(this.name), g.rowSpacing());
    } else if (this.cls == "boundary") {
      return Math.max(g.widthOf(this.name), g.rowSpacing())
    } else if (this.cls == "control") {
      return Math.max(g.widthOf(this.name), g.rowSpacing())
    } else if (this.cls == "entity") {
      return Math.max(g.widthOf(this.name), g.rowSpacing())
    } else {
      return g.widthOf(this.getText()) + 10;
    }

  };

  getLeftWidth(g, y1, y2) {

    if (y1 == undefined) {
      y1 = 0;
      let invBottom = 0
      for (let inv of this.invocations) {
        if (inv.bottom > invBottom) invBottom = inv.bottom;
      }
      y2 = Math.max(this.bottom,invBottom);
    }
    let w = 10;

    for (let y = y1; y <= y2; y++) {
      w = Math.max(w, this.leftFrameSpace(y));
    }

    if (this.hasCreationEvent(y1, y2)) {
      let _w = w
      w = Math.max(w, this.creationWidth(g) / 2 + 10);
    }

    const obj = this;
    this.labels.forEach(function (label, indx) {
      if (indx < y1) return;
      if (indx > y2) return;

      const level = obj.maxInvocationDepth(label.top, label.bottom) - 1;
      const invsWidth = level * 10;
      const labelWidth = Math.max(50, g.widthOf("{" + label.params + "}"));
      const minLabelWidth = Math.max(labelWidth, invsWidth + 30);
      const labelOverhang = (minLabelWidth - invsWidth) / 2;
      w = Math.max(w, labelOverhang + obj.leftFrameSpace(indx)); // TODO: same as drawing

      //w = Math.max(w,Math.max(25,g.widthOf("{"+label.params+"}")/2) + obj.leftFrameSpace(indx)); // TODO: same as drawing
    });
    this.foundMsgs.forEach(function (msg, indx) {
      if (indx < y1) return;
      if (indx > y2) return;
      w = Math.max(w, g.widthOf(msg.text()) + 50 + obj.leftFrameSpace(indx));
    });

    return Math.ceil(w);

  };

  getRightWidth(g, y1, y2) {

    if (y1 == undefined) {
      y1 = 0;
      let invBottom = 0
      for (let inv of this.invocations) {
        if (inv.bottom > invBottom) invBottom = inv.bottom;
      }
      y2 = Math.max(this.bottom,invBottom);
    }

    let w = 10;

    for (let y = y1; y <= y2; y++) {
      w = Math.max(w, this.rightFrameSpace(y));
    }

    // it will either have a creation event at the top, or
    // further down which is more like a label
    if (this.hasCreationEvent(y1, y2)) {
      const _w = w
      w = Math.max(w, this.creationWidth(g) / 2 + 10);
    }

    // invocations may not have a self message if them come from the left
    // so at minimum we need to consider invocations on the right side
    w = w + 10 * (this.maxInvocationDepth(y1, y2) - 1);

    const obj = this;

    this.labels.forEach(function (label, indx) {
      if (indx < y1) return;
      if (indx > y2) return;
      const level = obj.maxInvocationDepth(label.top, label.bottom) - 1;
      const invsWidth = level * 10;
      const labelWidth = Math.max(50, g.widthOf("{" + label.params + "}"));
      const minLabelWidth = Math.max(labelWidth, invsWidth + 30);
      const labelOverhang = (minLabelWidth - invsWidth) / 2;;
      w = Math.max(w, level * 10 + labelOverhang + obj.rightFrameSpace(indx)); // TODO: same as drawing

      //w = Math.max(w,level * 10 + Math.max(25,g.widthOf("{"+label.params+"}")/2) + obj.rightFrameSpace(indx)); // TODO: same as drawing
    });

    this.lifeEvents.forEach((ev) => {
      if (ev.event == OBJ_CREATED && ev.y >= y1 && ev.y <= y2) {
        const _w = w
        w = Math.max(w, this.creationWidth(g) / 2 + 10);
      }
    });

    this.selfMsgs.forEach(function (msg, indx) {
      if (indx < y1) return;
      if (indx > y2) return;

      // added width of return text
      w = Math.max(w, msg.level * 10 + Math.max(30, Math.max(g.widthOf(msg.text()), msg.returns ? g.widthOf(msg.returns) : 0)) + obj.rightFrameSpace(indx));
    });

    this.lostMsgs.forEach(function (msg, indx) {
      if (indx < y1) return;
      if (indx > y2) return;
      w = Math.max(w, msg.parent.level * 10 + g.widthOf(msg.text()) + 50 + obj.rightFrameSpace(indx));
    });

    return Math.ceil(w);

  };


}