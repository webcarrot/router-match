import { Match, Build, MatchInfo, Context } from "@webcarrot/router";
import { RouteMatchProvider, MatchParser } from "./types";
export declare const make: <M extends MatchInfo, C extends Context>(path: RouteMatchProvider<M, C>, parse?: MatchParser<M>) => {
    match: Match<M, C>;
    build: Build<M, C>;
};
