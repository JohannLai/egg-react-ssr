
import React from 'react'
import { resolve, join } from 'path'
import Shell from 'shelljs'
import { renderToNodeStream } from 'react-dom/server'
// @ts-ignore
import nodeExternals from 'webpack-node-externals'
import { webpackWithPromise } from './util'

const cwd = process.env.BASE_DIR || process.cwd()
let config: any
try {
  config = require(cwd + '/config/config.ssr')
} catch (error) {
  // 兼容以前的版本，没有config.ssr取config.default
  config = require(cwd + '/config/config.default')
}

const paths = require(cwd + '/build/paths')
const serverConfig = require(cwd + '/build/webpack.config.server')
const isDev = process.env.NODE_ENV === 'development'

serverConfig.entry = {
  Layout: join(paths.appSrc, './layout')
}
serverConfig.output.path = resolve(__dirname, '../dist')
serverConfig.externals = nodeExternals({
  whitelist: [/\.(css|less|sass|scss)$/, /^antd.*?css/],
  modulesDir: resolve(__dirname, '../../') // 保证寻找第三方模块的node_modules是当前应用的node_modules
})

const reactToStream = (Component: React.FunctionComponent, props: object) => {
  return renderToNodeStream(React.createElement(Component, props))
}

const renderLayout = async (ctx: any) => {
  const layoutPath = resolve(__dirname, '../dist/Layout.server.js')
  if (isDev) {
    Shell.rm('-rf', layoutPath)
    delete require.cache[layoutPath]
  }
  let Layout
  try {
    Layout = require(layoutPath).default
  } catch (error) {
    // 首次读取失败我们先调用webpack api构建一遍在ykcli/dist的目录下再读取
    await webpackWithPromise(serverConfig)
    Layout = require(layoutPath).default
  }

  const props = ctx ? {
    layoutData: ctx
  } : {
    layoutData: {
      app: {
        config: config
      }
    }
  }

  const str = reactToStream(Layout, props)
  return str
}

export default renderLayout
