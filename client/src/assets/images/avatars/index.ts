const importAll = (r: __WebpackModuleApi.RequireContext) => r.keys().map(r)

const images = importAll(require.context('./', false, /\.(png|jpe?g)$/)) as Record<string, any>

export default images
