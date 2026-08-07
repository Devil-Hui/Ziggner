import { onRequestOptions as __api___path___js_onRequestOptions } from "D:\\下载\\浏览器下载\\change\\Ziggner\\Ziggner\\web\\react\\functions\\api\\[[path]].js"
import { onRequest as __api___path___js_onRequest } from "D:\\下载\\浏览器下载\\change\\Ziggner\\Ziggner\\web\\react\\functions\\api\\[[path]].js"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api___path___js_onRequestOptions],
    },
  {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]