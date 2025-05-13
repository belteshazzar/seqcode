

export class Call {

  constructor(objIndex, name, params, isAsynch, result) {
    this.objIndex = objIndex;
    this.name = name;
    this.params = params;
    this.isAsynch = isAsynch;
    this.result = result;
    this.subCalls = [];
  }

}
