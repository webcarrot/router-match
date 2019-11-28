var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { pathToRegexp, compile as pathCompiler } from "path-to-regexp";
import { isPlainObject } from "@webcarrot/router";
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matchByRegExp = (url, pathKeys, pathRegExp, rootPath) => {
    if (!url) {
        return false;
    }
    const path = rootPath
        ? url.pathname.replace(new RegExp(`^${escapeRegExp(rootPath)}`), "")
        : url.pathname;
    const pathMatches = pathRegExp.exec(path);
    if (pathMatches) {
        const params = pathKeys.reduce((out, key, no) => {
            const match = pathMatches[no + 1];
            if (match !== undefined && out[key.name] === undefined) {
                try {
                    out[key.name] = decodeURIComponent(match);
                }
                catch (_) {
                }
            }
            return out;
        }, {});
        const query = {};
        url.searchParams.forEach((value, key) => {
            if (!value) {
                return;
            }
            if (query[key]) {
                if (query[key] instanceof Array) {
                    query[key].push(value);
                }
                else {
                    query[key] = [query[key], value];
                }
            }
            else {
                query[key] = value;
            }
        });
        return Object.assign(Object.assign({}, params), { query, hash: url.hash });
    }
    else {
        return false;
    }
};
const buildByCompiler = (input, compiler, rootPath) => {
    try {
        const _a = input || {
            query: undefined,
            hash: undefined
        }, { query, hash } = _a, params = __rest(_a, ["query", "hash"]);
        const parsedParams = Object.keys(params).reduce((out, key) => {
            const value = params[key];
            if (value !== null &&
                value !== undefined &&
                (typeof value === "string" || typeof value === "number")) {
                out[key] = `${value}`;
            }
            return out;
        }, {});
        const url = new URL(`route:${compiler(parsedParams) || "/"}`);
        if (query && query instanceof Object) {
            Object.keys(query).forEach(key => {
                const value = query[key];
                if (value !== null && value !== undefined) {
                    if (value instanceof Array) {
                        value
                            .filter(v => v !== null && v !== undefined)
                            .forEach(v => url.searchParams.append(key, v));
                    }
                    else {
                        url.searchParams.append(key, `${value}`);
                    }
                }
            });
        }
        if (hash) {
            url.hash = `${hash}`;
        }
        return `${rootPath || ""}${url.pathname}${url.search}${url.hash}`;
    }
    catch (_) {
        return false;
    }
};
const parsePath = (info) => {
    const match = [];
    const build = [];
    if (info instanceof Array) {
        info.forEach(el => {
            const ret = parsePath(el);
            match.push(...ret.match);
            build.push(...ret.build);
        });
    }
    else if (info instanceof RegExp) {
        const pathKeys = [];
        const pathRegExp = pathToRegexp(info, pathKeys);
        match.push((url, _, { rootPath }) => matchByRegExp(url, pathKeys, pathRegExp, rootPath));
    }
    else if (info instanceof Object) {
        if (info.build) {
            if (info.build instanceof Function) {
                build.push(info.build);
            }
            else {
                const ret = parsePath(info.build);
                build.push(...ret.build);
            }
        }
        if (info.match) {
            if (info.match instanceof Function) {
                match.push(info.match);
            }
            else {
                const ret = parsePath(info.match);
                match.push(...ret.match);
            }
        }
    }
    else {
        const pathKeys = [];
        const pathRegExp = pathToRegexp(info, pathKeys);
        const compiler = pathCompiler(info);
        match.push((url, _, { rootPath }) => matchByRegExp(url, pathKeys, pathRegExp, rootPath));
        build.push((match, { rootPath }) => buildByCompiler(match, compiler, rootPath));
    }
    return {
        match,
        build
    };
};
const parseBody = (body) => {
    return Object.keys(body).reduce((out, key) => {
        const value = body[key];
        if (key.includes(".")) {
            const keys = key.split(".");
            keys
                .map(k => (/^\d+$/.test(k) ? parseInt(k) : k))
                .reduce((o, k, no) => {
                if (no === keys.length - 1) {
                    o[k] = value;
                }
                else if (!o[k]) {
                    o[k] = typeof keys[no + 1] === "number" ? [] : {};
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
const appendMethodFields = (data, method = "GET", body) => method === "POST"
    ? Object.assign(Object.assign({}, data), { method, body: isPlainObject(body) ? parseBody(body) : body || {} }) : Object.assign(Object.assign({}, data), { method });
const makeMatch = (match, parse) => (url, payload, context) => match.reduce((out, check) => out.then(out => {
    if (out) {
        return out;
    }
    else {
        const result = check(url, payload, context);
        if (result instanceof Promise) {
            return result.then(out => {
                if (out !== false) {
                    const data = appendMethodFields(out, payload.method, payload.body);
                    return parse ? parse(data) : data;
                }
            });
        }
        else if (result) {
            const data = appendMethodFields(result, payload.method, payload.body);
            return parse ? parse(data) : data;
        }
        else {
            return false;
        }
    }
}), Promise.resolve(false));
const makeBuild = (build) => (match, context) => {
    for (let i = 0; i < build.length; i++) {
        const out = build[i](match, context);
        if (out !== false) {
            return out;
        }
    }
    throw new Error("Cannot build path");
};
export const make = (path, parse) => {
    const { match, build } = parsePath(path);
    return {
        match: makeMatch(match, parse),
        build: makeBuild(build)
    };
};
//# sourceMappingURL=index.js.map