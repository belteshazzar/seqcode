

export class Call {

  constructor(objIndex, name, params, isAsynch) {
    this.objIndex = objIndex;

    this.nameToken = name
    this.paramsToken = params
    this.name = typeof name === "string" ? name : name.str;
    this.params = typeof params === "string" ? params : params.str;
    this.isAsynch = isAsynch;
    this.subCalls = [];
  }

}
