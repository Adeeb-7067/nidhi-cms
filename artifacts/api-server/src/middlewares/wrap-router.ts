import type { IRouter, RequestHandler } from "express";
import { asyncHandler } from "./async-handler";

/** Wraps all route handlers so async errors reach the global error middleware. */
export function wrapRouterHandlers(router: IRouter): IRouter {
  for (const layer of router.stack) {
    if (layer.route) {
      for (const routeLayer of layer.route.stack) {
        const handle = routeLayer.handle as RequestHandler;
        if (handle.length < 4) {
          routeLayer.handle = asyncHandler(handle as Parameters<typeof asyncHandler>[0]);
        }
      }
    } else if (layer.name === "router" && layer.handle) {
      wrapRouterHandlers(layer.handle as IRouter);
    }
  }
  return router;
}
