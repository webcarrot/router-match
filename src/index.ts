import * as pathToRegexp from "path-to-regexp";
import { compile as pathCompiler, Key, PathFunction } from "path-to-regexp";
import {
  Match,
  Build,
  Payload,
  MatchInfo,
  Context,
  BuildCheck,
  Method,
  isPlainObject
} from "@webcarrot/router";

import { MatchParams, RouteMatchProvider, MatchParser } from "./types";

const matchByRegExp = <M extends MatchInfo>(
  url: URL,
  pathKeys: Key[],
  pathRegExp: RegExp
): M | false => {
  if (!url) {
    return false;
  }
  const path = url.pathname;
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
    return ({
      params,
      query,
      hash: url.hash
    } as any) as M;
  } else {
    return false;
  }
};

const buildByCompiler = (input: any, compiler: PathFunction) => {
  try {
    const inputParams = "params" in input ? input.params : {};
    const parsedParams = Object.keys(inputParams).reduce<{
      [key: string]: string;
    }>((out, key) => {
      const value = inputParams[key];
      if (value !== null && value !== undefined) {
        out[key] = `${value}`;
      }
      return out;
    }, {});
    const url = new URL(`route:${compiler(parsedParams) || "/"}`);
    const inputQuery = "query" in input ? input.query : {};

    Object.keys(inputQuery).forEach(key => {
      const value = inputQuery[key];
      if (value !== null && value !== undefined) {
        if (value instanceof Array) {
          value
            .filter(v => v !== null && v !== undefined)
            .forEach(v => url.searchParams.append(key, v));
        } else {
          url.searchParams.append(key, `${value}`);
        }
      }
    });
    if (input.hash) {
      url.hash = input.hash;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (_) {
    return false;
  }
};

const parsePath = <P extends Payload, M extends MatchInfo, C extends Context>(
  info: RouteMatchProvider<P, M, C>
) => {
  const match: Array<Match<P, M, C>> = [];
  const build: Array<BuildCheck<M, C>> = [];

  if (info instanceof Array) {
    info.forEach(el => {
      const ret = parsePath<P, M, C>(el);
      match.push(...ret.match);
      build.push(...ret.build);
    });
  } else if (info instanceof RegExp) {
    const pathKeys: Key[] = [];
    const pathRegExp = pathToRegexp(info, pathKeys);
    match.push((url: URL) => matchByRegExp<M>(url, pathKeys, pathRegExp));
  } else if (info instanceof Object) {
    if (info.build) {
      if (info.build instanceof Function) {
        build.push(info.build);
      } else {
        const ret = parsePath<P, M, C>(info.build);
        build.push(...ret.build);
      }
    }
    if (info.match) {
      if (info.match instanceof Function) {
        match.push(info.match);
      } else {
        const ret = parsePath<P, M, C>(info.match);
        match.push(...ret.match);
      }
    }
  } else {
    const pathKeys: Key[] = [];
    const pathRegExp = pathToRegexp(info, pathKeys);
    const compiler = pathCompiler(info);
    match.push((url: URL) => matchByRegExp<M>(url, pathKeys, pathRegExp));
    build.push((match: M) => buildByCompiler(match, compiler));
  }
  return {
    match,
    build
  };
};

const parseBody = (body: { [key: string]: any }): { [key: string]: any } => {
  return Object.keys(body).reduce<{ [key: string]: any }>((out, key) => {
    const value = body[key];
    if (key.includes(".")) {
      const keys = key.split(".");
      keys
        .map(k => (/^\d+$/.test(k) ? parseInt(k) : k))
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
};

const appendMethodFields = <M>(data: M, method: Method, body: any) =>
  method === "POST"
    ? {
        ...data,
        method,
        body: isPlainObject(body) ? parseBody(body) : body || {}
      }
    : {
        ...data,
        method
      };

const makeMatch = <P extends Payload, M extends MatchInfo, C extends Context>(
  match: Array<Match<P, M, C>>,
  parse?: MatchParser<M>
): Match<P, M, C> => async (url: URL, payload: P, context: C) => {
  for (let i = 0; i < match.length; i++) {
    const out = await match[i](url, payload, context);
    if (out !== false) {
      const data = appendMethodFields(out, payload.method, payload.body);
      return parse ? parse(data) : data;
    }
  }
  return false;
};

const makeBuild = <M extends MatchInfo, C extends Context>(
  build: Array<BuildCheck<M, C>>
): Build<M, C> => (match: M, context: C) => {
  for (let i = 0; i < build.length; i++) {
    const out = build[i](match, context);
    if (out !== false) {
      return out;
    }
  }
  throw new Error("Cannot build path");
};

export const make = <P extends Payload, M extends MatchInfo, C extends Context>(
  path: RouteMatchProvider<P, M, C>,
  parse?: MatchParser<M>
) => {
  const { match, build } = parsePath<P, M, C>(path);
  return {
    match: makeMatch(match, parse),
    build: makeBuild(build)
  };
};
