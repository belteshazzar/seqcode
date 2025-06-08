/* (c) 2016 Daniel Walton (daniel@belteshazzar.com) (Unpublished)
 * All Rights Reserved.
 */

import {
  Token,
  IDENT,
  PARAMS,
  BRACE_OPEN, BRACE_CLOSE,
  // BRACKET_OPEN, BRACKET_CLOSE,
  CALL,
  SIGNAL,
  CLASSIFIER
} from './token.js';

export function tokenize(text) {

  var tokens = [];
  var token = null;
  var tokenCol = 0;
  var tokenLine = 1;
  var inParams = false;
  var escaped = false;
  var inString = false;
  var ln = 1;
  var col = 0;

  for (var indx = 0; indx < text.length; indx++) {
    var ch = text.charAt(indx);

    if (ch == '\r') continue;
    if (ch == '\n') {
      if (/*!inString && !inParams && */token != null) {
        if (inParams) {
          tokens.push(new Token(tokenLine, tokenCol, PARAMS, token));
          inParams = false
        } else {
          // in string or identifier, either way emit ident 
          inString = false
          tokens.push(new Token(tokenLine, tokenCol, IDENT, token));
        }
        token = null;
      }
      ln++
      col = 0
      continue
    }

    if (ch == '#' && !inParams && !inString) {
      if (token != null) {
        token = token.trim();
        if (token != "") {
          tokens.push(new Token(tokenLine, tokenCol, IDENT, token));
        }
        token = null;
      }

      indx++

      for (; indx < text.length; indx++) {
        ch = text.charAt(indx);

        if (ch == '\r') continue
        if (ch == '\n') {
          break;
        }
      }

      ln++
      col = 0
      continue
    }

    col++

    if (inParams) {
      if (escaped) {
        if (ch == ')') {
          token += ')';
          escaped = false;
        } else if (ch == '\\') {
          token += '\\';
        } else {
          token += '\\' + ch;
          escaped = false;
        }
      } else {
        if (ch == ')') {
          tokens.push(new Token(tokenLine, tokenCol, PARAMS, token.trim()));
          inParams = false;
          token = null
        } else if (ch == '\\') {
          escaped = true;
        } else {
          token += ch;
        }
      }
    } else if (inString) {
      if (escaped) {
        if (ch == '"') {
          token += '"';
          escaped = false;
        } else if (ch == '\\') {
          token += '\\';
        } else {
          token += '\\' + ch;
          escaped = false;
        }
      } else {
        if (ch == '"') {
          tokens.push(new Token(tokenLine, tokenCol, IDENT, token));
          inString = false;
          token = null;
        } else if (ch == '\\') {
          escaped = true;
        } else {
          token += ch;
        }
      }
    } else if (ch == '(') {
      if (token != null) {
        tokens.push(new Token(tokenLine, tokenCol, IDENT, token));
      }
      inParams = true;
      token = '';
      tokenLine = ln;
      tokenCol = col;
    } else if (ch == '"') {
      if (token != null) {
        tokens.push(new Token(tokenLine, tokenCol, IDENT, token));
      }
      inString = true;
      token = '';
      tokenLine = ln;
      tokenCol = col;
    } else if (ch == ' ' || ch == '\t') {
      if (token != null) {
        tokens.push(new Token(tokenLine, tokenCol, IDENT, token));
        token = null;
      }
    } else if (ch == ':' || ch == '{' || ch == '}' || ch == '.' || ch == '>') {
      if (token != null) {
        tokens.push(new Token(tokenLine, tokenCol, IDENT, token));
        token = null;
      }
      var t;
      if (ch == ":") t = CLASSIFIER;
      else if (ch == "{") t = BRACE_OPEN;
      else if (ch == "}") t = BRACE_CLOSE;
      else if (ch == ".") t = CALL;
      else t = SIGNAL;
      tokens.push(new Token(ln, col, t, ch));
    } else if (token == null) {
      token = ch;
      tokenCol = col;
      tokenLine = ln;
    } else {
      token += ch;
    }
  }

  if (token != null) {
    if (inParams) {
      tokens.push(new Token(tokenLine, tokenCol, PARAMS, token));
    } else {
      tokens.push(new Token(tokenLine, tokenCol, IDENT, token));
    }
  }

  return tokens;
}
