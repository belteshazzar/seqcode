/* (c) 2016 Daniel Walton (daniel@belteshazzar.com) (Unpublished)
 * All Rights Reserved.
 */

import { Call } from './call.js';
import { Obj } from './obj.js';
import { ParseError } from './parse_error.js';

import { CLASSIFIER, BRACE_OPEN, BRACE_CLOSE, PARAMS, IDENT, CALL, SIGNAL } from './token.js';

export function parse(tokens) {
  var at = 0;

  function push(tok) {
    tokens.push(tok);
  }

  function pop() {
    if (at == tokens.length) return null;
    return tokens[at++];
  }

  function unpop() {
    if (at > 0) at--;
  }

  function peek() {
    if (at == tokens.length) return null;
    return tokens[at];
  }

  function peekNext() {
    if (at + 1 == tokens.length) return null;
    else return tokens[at + 1];
  }

  function reset() {
    at = 0;
  }

  var errors = [];
  var objects = [];

  function indexOf(str) {
    for (var i = 0; i < objects.length; i++) {
      if (objects[i].name == str || objects[i].cls == str) {
        //console.log("indexOf("+str+") = " + i);
        return i;
      }
    }
    //console.log("indexOf("+str+") = -1");
    return -1;
  };

  function doParse(call) {
    while (true) {
      var tok = pop();

      if (tok == null) {
        return;
      }
      else if (tok.type == CLASSIFIER) {
        let className = "Object"
        if (peek() == null) {
          errors.push(new ParseError(null, "Expected class name after ':' but found <EOF>", 1));
        } else if (peek().type != IDENT) {
          errors.push(new ParseError(tok, "Expected class name after ':' but found '" + tok.str + "'", 2));
        } else {
          tok = pop()
          className = tok.str
        }

        if (indexOf(className) == -1) {
          objects.push(new Obj("", className));
        }
      }
      else if (tok.type == BRACE_CLOSE) {
        if (call == rootCall) {
          errors.push(new ParseError(tok, "Expected identifier or ':' but found '}'", 21));
          continue;
        }
        else {
          unpop();
          return;
        }
      }
      else if (tok.type == IDENT) {
        var ident = tok;
        tok = pop();
        if (tok == null) {
          errors.push(new ParseError(null, "Expected ':','.','>' or '(' after identifier, found eof", 3));
          return;
        }

        if (tok.type == CLASSIFIER) {
          var objName = ident.str;
          var className = "Object";

          if (peek() == null) {
            errors.push(new ParseError(null, "Expected class name after ':' but found eof", 4));
          } else if (peek().type != IDENT) {
            errors.push(new ParseError(peek(), "Expected class name after ':' but found " + peek().str, 5));
          } else {
            className = pop().str;
          }

          if (indexOf(objName) == -1) {
            objects.push(new Obj(objName, className));
          }
        }
        else if (tok.type == CALL || tok.type == SIGNAL) {
          var asynch = tok.str == '>';
          var objName = ident.str;
          var name = "func"
          var params = ""

          if (peek() == null) {
            errors.push(new ParseError(null, "Expected method name but found eof", 6));
          } else if (peek().type != IDENT) {
            errors.push(new ParseError(peek(), "Expected method name but found " + peek().str, 7));
          } else { 
            name = pop().str;
          }

          if (peek() == null) {
            errors.push(new ParseError(null, "Expected parameters but found eof", 8));
          } else if (peek().type != PARAMS) {
            errors.push(new ParseError(peek(), "Expected parameters, but found: " + peek().str, 9));
          } else {
            params = pop().str;
          }
          var target = indexOf(objName);
          if (target == -1) {
            objects.push(new Obj(objName, "Object"));
            target = objects.length - 1;
          }

          if (peek() != null && peek().type == BRACE_OPEN) {
            ///////////////////////////////////////////////////////////////////////
            //
            // MSG w/BODY
            //
            ///////////////////////////////////////////////////////////////////////

            pop(); // remove '{'

            var subCall = new Call(target, name, params, asynch);
            doParse(subCall);
            call.subCalls.push(subCall);

            if (peek() == null) {
              errors.push(new ParseError(null, "Expected '}' but found eof", 13));
            } else if (peek().type != BRACE_CLOSE) {
              errors.push(new ParseError(tok, "Expected '}' but found " + peek().str, 14));
            } else {
              pop(); // remove '}'
            }

            continue;
          }
          else {
            ///////////////////////////////////////////////////////////////////////
            //
            // MSG
            //
            ///////////////////////////////////////////////////////////////////////

            call.subCalls.push(new Call(target, name, params, asynch));
            continue;
          }
        }
        else if (tok.type == PARAMS) {
          // var name = ident.str;
          // var params = tok.str;
          
          ///////////////////////////////////////////////////////////////////////
          //
          // MSG TO SELF
          //
          ///////////////////////////////////////////////////////////////////////

          if (peek() != null && peek().str == '{') {
            pop(); // remove '{'
            var subCall = new Call(call.objIndex, ident, tok, false);
            doParse(subCall);
            call.subCalls.push(subCall);

            tok = pop();

            if (tok == null) {
              errors.push(new ParseError(tok, "Expected '}' but found eof", 18));
              return;
            }
            if (tok.type != BRACE_CLOSE) {
              errors.push(new ParseError(tok, " Expected '}' but found " + tok.str, 19));
              continue;
            }
          }
          else {
            call.subCalls.push(new Call(call.objIndex, ident, tok, false));
          }
        }
        else {
          errors.push(new ParseError(tok, "Expected '.','>',':' or '('", 20));
          continue;
        }
      } // tok.type()==IDENT
      else {
        errors.push(new ParseError(tok, "Expected identifier, '}', or EOF", 21));
      }
    } // while loop

    return;
  };

  var rootCall = new Call(0, "diagram-entry", "", false);
  doParse(rootCall);

  return {
    errors: errors,
    objects: objects,
    rootCall: rootCall
  };
};
