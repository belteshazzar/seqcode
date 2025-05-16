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
        if (peek() == null) {
          errors.push(new ParseError(null, "expected class name after ':' found eof", 1));
          return;
        }
        tok = pop();
        if (tok.type != IDENT) {
          errors.push(new ParseError(tok, "expected class name after ':' found " + tok.str, 2));
          continue;
        }

        if (indexOf(tok.str) == -1) {
          objects.push(new Obj("", tok.str));
        }
      }
      else if (tok.type == BRACE_CLOSE) {
        if (call == rootCall) {
          errors.push(new ParseError(tok, "identifier or ':'", 21));
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
          errors.push(new ParseError(null, " expected ':','.','>' or '(' after identifier, found eof", 3));
          return;
        }

        if (tok.type == CLASSIFIER) {
          var objName = ident.str;

          if (peek() == null) {
            errors.push(new ParseError(null, "expected class name after ':'", 4));
            return;
          }
          tok = pop();
          if (tok.type != IDENT) {
            errors.push(new ParseError(tok, "expected class name after ':'", 5));
            continue;
          }
          var className = tok.str;

          if (indexOf(objName) == -1) {
            objects.push(new Obj(objName, className));
          }
        }
        else if (tok.type == CALL || tok.type == SIGNAL) {
          var asynch = tok.str == '>';
          var objName = ident.str;

          tok = pop(); // method name
          if (tok == null) {
            errors.push(new ParseError(null, "method name", 6));
            return;
          }
          if (tok.type != IDENT) {
            errors.push(new ParseError(tok, "method name", 7));
            continue;
          }
          var name = tok.str;
          var params = null;
          if (peek() == null) {
            errors.push(new ParseError(null, "parameters", 8));
            return;
          }
          tok = pop(); // params
          if (tok.type != PARAMS) {
            errors.push(new ParseError(tok, "expected parameters", 9));
            continue;
          }
          params = tok.str;

          var target = indexOf(objName);
          if (target == -1) {
            objects.push(new Obj("", objName));
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

            tok = pop();
            if (tok == null) {
              errors.push(new ParseError(null, "}", 13));
              return;
            }
            if (tok.type != BRACE_CLOSE) {
              errors.push(new ParseError(tok, "}", 14));
              continue;
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
          var name = ident.str;
          var params = tok.str;
          
          ///////////////////////////////////////////////////////////////////////
          //
          // MSG TO SELF
          //
          ///////////////////////////////////////////////////////////////////////

          if (peek() != null && peek().str == '{') {
            pop(); // remove '{'
            var subCall = new Call(call.objIndex, name, params, false);
            doParse(subCall);
            call.subCalls.push(subCall);

            tok = pop();

            if (tok == null) {
              errors.push(new ParseError(tok, '}', 18));
              return;
            }
            if (tok.type != BRACE_CLOSE) {
              errors.push(new ParseError(tok, '}', 19));
              continue;
            }
          }
          else {
            call.subCalls.push(new Call(call.objIndex, name, params, false));
          }
        }
        else {
          errors.push(new ParseError(tok, "'.','>',':' or '('", 20));
          continue;
        }
      } // tok.type()==IDENT
      else {
        errors.push(new ParseError(tok, "identifier, }, or EOF", 21));
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
