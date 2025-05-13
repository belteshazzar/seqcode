

export class Call {

  constructor(objIndex, name, params, isAsynch) {
    this.objIndex = objIndex;
    this.name = name;
    this.params = params;
    this.isAsynch = isAsynch;
    this.subCalls = [];
  }

}
