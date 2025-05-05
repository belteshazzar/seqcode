/* (c) 2016 Daniel Walton (daniel@belteshazzar.com) (Unpublished)
 * All Rights Reserved.
 */
var ckwnc = ckwnc || {};

ckwnc.logger = null;

ckwnc.log = function (msg) {
  if (ckwnc.logger != null) ckwnc.logger.log(msg);
};


ckwnc.SOLID_CLOSED = 1;
ckwnc.SOLID_OPEN = 2;
ckwnc.DASHED_OPEN = 3;







ckwnc.errorMessageOf = function (error) {
  var msg = "";
  for (var i = 0; i <= error.tok.col; i++) msg += "&nbsp;";
  msg += "^<br/>";
  return msg + "Expected " + error.expected + ", found '" + (error.tok == null ? "EOF" : error.tok.str) + "' instead.";// {"+id+"}";	
};


