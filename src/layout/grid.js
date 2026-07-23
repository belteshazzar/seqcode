
// Row-allocation grid for layout. Rows ("y" values) are abstract grid rows,
// not pixels; each object column keeps its own sparse `marks` array and the
// grid finds/claims runs of free rows across a span of columns.
export class MarkGrid {

  constructor(objs) {
    this.objs = objs;
    this.maxY = 0;
  }

  marksAt(y, x1, x2) {
    var count = 0;
    var left = Math.min(x1, x2);
    var right = Math.max(x1, x2);
    for (var x = left; x <= right; x++) {
      if (this.objs[x].marks[y] == 'X') count++;
    }
    return count;
  }

  // Find the first row >= y where n consecutive rows are free across the
  // columns spanned by oFrom..oTo, mark them, and return the first row.
  markN(oFrom, oTo, y, n) {
    var lr = this.leftRight(oFrom, oTo, y);
    while (true) {
      var free = true;
      for (var i = 0; i < n; i++) {
        if (this.marksAt(y + i, lr.l, lr.r) != 0) {
          free = false;
          break;
        }
      }
      if (free) break;
      y++;
    }
    for (var x = lr.l; x <= lr.r; x++) {
      for (var i = 0; i < n; i++) {
        this.objs[x].marks[y + i] = 'X';
      }
    }
    if (y + n - 1 > this.maxY) this.maxY = y + n - 1;
    return y;
  }

  mark(oFrom, oTo, y) {
    return this.markN(oFrom, oTo, y, 1);
  }

  leftRight(oFrom, oTo, y) {
    if (oFrom == undefined || oTo == undefined || y == undefined) {
      throw new Error("leftRight: missing argument (oFrom=" + oFrom + ", oTo=" + oTo + ", y=" + y + ")");
    }
    if (isNaN(oFrom.objIndex) || isNaN(oTo.objIndex) || isNaN(y)) {
      throw new Error("leftRight: non-numeric argument (oFrom.objIndex=" + oFrom.objIndex + ", oTo.objIndex=" + oTo.objIndex + ", y=" + y + ")");
    }
    var l = Math.min(oFrom.objIndex, oTo.objIndex);
    var r = Math.max(oFrom.objIndex, oTo.objIndex);
    return { l: l, r: r };
  }

}
