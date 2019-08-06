import { Key, PathFunction } from "path-to-regexp";

import { Match, Build, Payload, MatchInfo, Context } from "@webcarrot/router";

export type MatchParams = {
  [key: string]: any;
};

export type MatchProvider<
  P extends Payload,
  M extends MatchInfo,
  C extends Context
> =
  | string
  | RegExp
  | {
      match?: Match<P, M, C> | string | RegExp | Array<string | RegExp>;
      build?: Build<M, C> | string;
    };

export type MatchParser<M extends MatchInfo> = (data: M) => M;

export type RouteMatchProvider<
  P extends Payload,
  M extends MatchInfo,
  C extends Context
> = MatchProvider<P, M, C> | Array<MatchProvider<P, M, C>>;
