import { Match, Build, Payload, MatchInfo, Context } from "@webcarrot/router";
import { RouteMatchProvider, MatchParser } from "./types";
export declare const make: <P extends Payload, M extends MatchInfo, C extends Context>(path: RouteMatchProvider<P, M, C>, parse?: MatchParser<M>) => {
    match: Match<P, M, C>;
    build: Build<M, C>;
};
