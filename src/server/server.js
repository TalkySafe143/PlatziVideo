const express = require('express');
const config = require('../../config');
const webpack = require('webpack');
const helmet = require('helmet');

// Frontend imports to SSR
const React = require('react');
const { renderToString } = require('react-dom/server');
const { Provider } = require('react-redux');
const { createStore } = require('redux');
const { renderRoutes } = require('react-router-config');
import routes from '../frontend/routes/serverRoutes';
const { StaticRouter } = require('react-router-dom');
import reducer from '../frontend/reducers/index'
const { initialState } = require('../frontend/initialState');

const app = express();

if (config.env === 'development') {
    console.log('Development config');
    const webpackConfig = require('../../webpack.config');
    const webpackDevMiddleware = require('webpack-dev-middleware');
    const webpackHotMiddleware = require('webpack-hot-middleware');
    const compiler = webpack(webpackConfig);
    const { publicPath } = webpackConfig.output;
    const serverConfig = { serverSideRender: true, publicPath };
  
    app.use(webpackDevMiddleware(compiler, serverConfig));
    app.use(webpackHotMiddleware(compiler));
 
} else {
    app.use(express.static(`${__dirname}/public`));
    app.use(helmet());
    app.use(helmet.contentSecurityPolicy({
        directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'sha256-BMJ49eeFpcebgw45UdTSD8UX7a0Dodv8ZK7RdzzR3UA='"],
            'img-src': ["'self'", 'http://dummyimage.com'],
            'style-src-elem': ["'self'", 'https://fonts.googleapis.com'],
            'font-src': ['https://fonts.gstatic.com'],
            'media-src': ['*'],
        },
    }))
    app.use(helmet.permittedCrossDomainPolicies());
}

const setResponse = (html, state) => {
    return (`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Platzi Video</title>
                <link rel="stylesheet" href="assets/app.css" type="text/css">
            </head>
            <body>
                <div id="app">${html}</div>
                <script>
                    window.__PRELOADED_STATE__ = ${JSON.stringify(state).replace(/</g, '\\u003c')}
                </script>
                <script src="assets/app.js" type="text/javascript"></script>
            </body>
        </html>
    `)
}

const renderApp = (req, res, next) => {
    const store = createStore(reducer, initialState);
    const preloadedState = store.getState();
    const html = renderToString(
        <Provider store={store}>
            <StaticRouter location={req.url} context={{}}>
                {renderRoutes(routes)}
            </StaticRouter>
        </Provider>
    );
    
    res.removeHeader('x-powered-by');
    res.send(setResponse(html, preloadedState));
}

app.get('*', renderApp)

app.listen(config.port, err => {
    if (err) console.log(err);
    else console.log('Server listening in port: ' + config.port)
})