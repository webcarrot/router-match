import { Key, PathFunction } from "path-to-regexp";

import { Match, Build, MatchInfo, Context } from "@webcarrot/router";

export type MatchParams = {
  [key: string]: any;
};

export type MatchProvider<M extends MatchInfo, C extends Context> =
  | string
  | RegExp
  | {
      match?: Match<M, C> | string | RegExp | Array<string | RegExp>;
      build?: Build<M, C> | string;
    };

export type MatchParser<M extends MatchInfo> = (data: M) => M;

export type RouteMatchProvider<M extends MatchInfo, C extends Context> =
  | MatchProvider<M, C>
  | Array<MatchProvider<M, C>>;
