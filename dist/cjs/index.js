"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var pathToRegexp = require("path-to-regexp");
var path_to_regexp_1 = require("path-to-regexp");
var router_1 = require("@webcarrot/router");
var matchByRegExp = function (url, pathKeys, pathRegExp) {
    if (!url) {
        return false;
    }
    var path = url.pathname;
    var pathMatches = pathRegExp.exec(path);
    if (pathMatches) {
        var params = pathKeys.reduce(function (out, key, no) {
            var match = pathMatches[no + 1];
            if (match !== undefined && out[key.name] === undefined) {
                try {
                    out[key.name] = decodeURIComponent(match);
                }
                catch (_) {
                }
            }
            return out;
        }, {});
        var query_1 = {};
        url.searchParams.forEach(function (value, key) {
            if (!value) {
                return;
            }
            if (query_1[key]) {
                if (query_1[key] instanceof Array) {
                    query_1[key].push(value);
                }
                else {
                    query_1[key] = [query_1[key], value];
                }
            }
            else {
                query_1[key] = value;
            }
        });
        return {
            params: params,
            query: query_1,
            hash: url.hash
        };
    }
    else {
        return false;
    }
};
var buildByCompiler = function (input, compiler) {
    try {
        var inputParams_1 = "params" in input ? input.params : {};
        var parsedParams = Object.keys(inputParams_1).reduce(function (out, key) {
            var value = inputParams_1[key];
            if (value !== null && value !== undefined) {
                out[key] = "" + value;
            }
            return out;
        }, {});
        var url_1 = new URL("route:" + (compiler(parsedParams) || "/"));
        var inputQuery_1 = "query" in input ? input.query : {};
        Object.keys(inputQuery_1).forEach(function (key) {
            var value = inputQuery_1[key];
            if (value !== null && value !== undefined) {
                if (value instanceof Array) {
                    value
                        .filter(function (v) { return v !== null && v !== undefined; })
                        .forEach(function (v) { return url_1.searchParams.append(key, v); });
                }
                else {
                    url_1.searchParams.append(key, "" + value);
                }
            }
        });
        if (input.hash) {
            url_1.hash = input.hash;
        }
        return "" + url_1.pathname + url_1.search + url_1.hash;
    }
    catch (_) {
        return false;
    }
};
var parsePath = function (info) {
    var match = [];
    var build = [];
    if (info instanceof Array) {
        info.forEach(function (el) {
            var ret = parsePath(el);
            match.push.apply(match, ret.match);
            build.push.apply(build, ret.build);
        });
    }
    else if (info instanceof RegExp) {
        var pathKeys_1 = [];
        var pathRegExp_1 = pathToRegexp(info, pathKeys_1);
        match.push(function (url) { return matchByRegExp(url, pathKeys_1, pathRegExp_1); });
    }
    else if (info instanceof Object) {
        if (info.build) {
            if (info.build instanceof Function) {
                build.push(info.build);
            }
            else {
                var ret = parsePath(info.build);
                build.push.apply(build, ret.build);
            }
        }
        if (info.match) {
            if (info.match instanceof Function) {
                match.push(info.match);
            }
            else {
                var ret = parsePath(info.match);
                match.push.apply(match, ret.match);
            }
        }
    }
    else {
        var pathKeys_2 = [];
        var pathRegExp_2 = pathToRegexp(info, pathKeys_2);
        var compiler_1 = path_to_regexp_1.compile(info);
        match.push(function (url) { return matchByRegExp(url, pathKeys_2, pathRegExp_2); });
        build.push(function (match) { return buildByCompiler(match, compiler_1); });
    }
    return {
        match: match,
        build: build
    };
};
var parseBody = function (body) {
    return Object.keys(body).reduce(function (out, key) {
        var value = body[key];
        if (key.includes(".")) {
            var keys_1 = key.split(".");
            keys_1
                .map(function (k) { return (/^\d+$/.test(k) ? parseInt(k) : k); })
                .reduce(function (o, k, no) {
                if (no === keys_1.length - 1) {
                    o[k] = value;
                }
                else if (!o[k]) {
                    o[k] = typeof keys_1[no + 1] === "number" ? [] : {};
                }
                return o[k];
            }, out);
        }
        else {
            out[key] = value;
        }
        return out;
    }, {});
};
var appendMethodFields = function (data, method, body) {
    return method === "POST"
        ? __assign({}, data, { method: method, body: router_1.isPlainObject(body) ? parseBody(body) : body || {} }) : __assign({}, data, { method: method });
};
var makeMatch = function (match, parse) { return function (url, payload, context) { return __awaiter(_this, void 0, void 0, function () {
    var i, out, data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                i = 0;
                _a.label = 1;
            case 1:
                if (!(i < match.length)) return [3, 4];
                return [4, match[i](url, payload, context)];
            case 2:
                out = _a.sent();
                if (out !== false) {
                    data = appendMethodFields(out, payload.method, payload.body);
                    return [2, parse ? parse(data) : data];
                }
                _a.label = 3;
            case 3:
                i++;
                return [3, 1];
            case 4: return [2, false];
        }
    });
}); }; };
var makeBuild = function (build) { return function (match, context) {
    for (var i = 0; i < build.length; i++) {
        var out = build[i](match, context);
        if (out !== false) {
            return out;
        }
    }
    throw new Error("Cannot build path");
}; };
exports.make = function (path, parse) {
    var _a = parsePath(path), match = _a.match, build = _a.build;
    return {
        match: makeMatch(match, parse),
        build: makeBuild(build)
    };
};
//# sourceMappingURL=index.js.map