import {
  pathToRegexp,
  compile as pathCompiler,
  Key,
  PathFunction,
} from "path-to-regexp";
import type {
  Match,
  Build,
  Payload,
  MatchInfo,
  BuildCheck,
  Method,
  Context,
} from "@webcarrot/router";

import { MatchParams, RouteMatchProvider, MatchParser } from "./types";

export type { MatchParams, RouteMatchProvider, MatchParser };

const escapeRegExp = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function isPlainObject<T>(e: T) {
  return e !== null && typeof e === "object" && e.constructor === Object;
}

function matchByRegExp<M extends MatchInfo>(
  url: URL,
  pathKeys: Key[],
  pathRegExp: RegExp,
  rootPath?: string
): M | false {
  if (!url) {
    return false;
  }
  const path = rootPath
    ? url.pathname.replace(new RegExp(`^${escapeRegExp(rootPath)}`), "")
    : url.pathname;
  const pathMatches = pathRegExp.exec(path);
  if (pathMatches) {
    const params = pathKeys.reduce<MatchParams>((out, key, no) => {
      const match = pathMatches[no + 1];
      if (match !== undefined && out[key.name] === undefined) {
        try {
          out[key.name] = decodeURIComponent(match);
        } catch (_) {
          // ignore
        }
      }
      return out;
    }, {});
    const query: MatchParams = {};
    url.searchParams.forEach((value, key) => {
      if (!value) {
        return;
      }
      if (query[key]) {
        if (query[key] instanceof Array) {
          (query[key] as string[]).push(value);
        } else {
          query[key] = [query[key] as string, value];
        }
      } else {
        query[key] = value;
      }
    });
    return {
      ...params,
      query,
      hash: url.hash,
    } as any as M;
  } else {
    return false;
  }
}

function buildByCompiler(
  input: any,
  compiler: PathFunction,
  rootPath?: string
) {
  try {
    const { query, hash, ...params } = input || {
      query: undefined,
      hash: undefined,
    };
    const parsedParams = Object.keys(params).reduce<{
      [key: string]: string;
    }>((out, key) => {
      const value = params[key];
      if (
        value !== null &&
        value !== undefined &&
        (typeof value === "string" || typeof value === "number")
      ) {
        out[key] = `${value}`;
      }
      return out;
    }, {});
    const url = new URL(`route:${compiler(parsedParams) || "/"}`);
    if (query && query instanceof Object) {
      Object.keys(query).forEach((key) => {
        const value = query[key];
        if (value !== null && value !== undefined) {
          if (value instanceof Array) {
            value
              .filter((v) => v !== null && v !== undefined)
              .forEach((v) => url.searchParams.append(key, v));
          } else {
            url.searchParams.append(key, `${value}`);
          }
        }
      });
    }
    if (hash) {
      url.hash = `${hash}`;
    }
    return `${rootPath || ""}${url.pathname}${url.search}${url.hash}`;
  } catch (_) {
    return false;
  }
}

function parsePath<M extends MatchInfo, C extends Context>(
  info: RouteMatchProvider<M, C>
) {
  const match: Array<Match<M, C>> = [];
  const build: Array<BuildCheck<M, C>> = [];

  if (info instanceof Array) {
    info.forEach((el) => {
      const ret = parsePath<M, C>(el);
      match.push(...ret.match);
      build.push(...ret.build);
    });
  } else if (info instanceof RegExp) {
    const pathKeys: Key[] = [];
    const pathRegExp = pathToRegexp(info, pathKeys);
    match.push((url: URL, _, { rootPath }) =>
      matchByRegExp<M>(url, pathKeys, pathRegExp, rootPath)
    );
  } else if (info instanceof Object) {
    if (info.build) {
      if (info.build instanceof Function) {
        build.push(info.build);
      } else {
        const ret = parsePath<M, C>(info.build);
        build.push(...ret.build);
      }
    }
    if (info.match) {
      if (info.match instanceof Function) {
        match.push(info.match);
      } else {
        const ret = parsePath<M, C>(info.match);
        match.push(...ret.match);
      }
    }
  } else {
    const pathKeys: Key[] = [];
    const pathRegExp = pathToRegexp(info, pathKeys);
    const compiler = pathCompiler(info);
    match.push((url: URL, _, { rootPath }) =>
      matchByRegExp<M>(url, pathKeys, pathRegExp, rootPath)
    );
    build.push((match: M, { rootPath }) =>
      buildByCompiler(match, compiler, rootPath)
    );
  }
  return {
    match,
    build,
  };
}

function parseBody(body: { [key: string]: any }): { [key: string]: any } {
  return Object.keys(body).reduce<{ [key: string]: any }>((out, key) => {
    const value = body[key];
    if (key.includes(".")) {
      const keys = key.split(".");
      keys
        .map((k) => (/^\d+$/.test(k) ? parseInt(k) : k))
        .reduce((o, k, no) => {
          if (no === keys.length - 1) {
            o[k] = value;
          } else if (!o[k]) {
            o[k] = typeof keys[no + 1] === "number" ? [] : {};
          }
          return o[k];
        }, out);
    } else {
      out[key] = value;
    }
    return out;
  }, {});
}

function appendMethodFields<M>(data: M, method: Method = "GET", body?: any) {
  return method === "POST"
    ? {
        ...data,
        method,
        body: isPlainObject(body) ? parseBody(body) : body || {},
      }
    : {
        ...data,
        method,
      };
}

function makeMatch<M extends MatchInfo, C extends Context>(
  match: Array<Match<M, C>>,
  parse?: MatchParser<M>
): Match<M, C> {
  return function (url: URL, payload: Payload, context: C) {
    return match.reduce<Promise<M | false>>(
      (out: Promise<M | false>, check: Match<M, C>) =>
        out.then<M | false>((out) => {
          if (out) {
            return out;
          } else {
            const result = check(url, payload, context);
            if (result instanceof Promise) {
              return result.then<M | false>((out) => {
                if (out !== false) {
                  const data = appendMethodFields(
                    out,
                    payload.method,
                    payload.body
                  );
                  return parse ? parse(data) : data;
                }
                return false;
              });
            } else if (result) {
              const data = appendMethodFields(
                result,
                payload.method,
                payload.body
              );
              return parse ? parse(data) : data;
            } else {
              return false;
            }
          }
        }),
      Promise.resolve(false) as Promise<M | false>
    );
  };
}

function makeBuild<M extends MatchInfo, C extends Context>(
  build: Array<BuildCheck<M, C>>
): Build<M, C> {
  return function (match: M, context: C) {
    for (let i = 0; i < build.length; i++) {
      const out = build[i](match, context);
      if (out !== false) {
        return out;
      }
    }
    throw new Error("Cannot build path");
  };
}

export function make<M extends MatchInfo, C extends Context>(
  path: RouteMatchProvider<M, C>,
  parse?: MatchParser<M>
) {
  const { match, build } = parsePath<M, C>(path);
  return {
    match: makeMatch(match, parse),
    build: makeBuild(build),
  };
}
