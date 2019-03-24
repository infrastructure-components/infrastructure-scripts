/**
 * takes a SlsIsomorphic Component and parses it into an Iso-Config
 *
 * @param component a SlsIsomorphic React-Component
 */
import {ConfigTypes} from "./lib/config";

const isClientApp = (component) => {

    return component.props &&
        component.props.id !== undefined &&
        component.props.path !== undefined &&
        component.props.method !== undefined;
};

const isMiddleware = (component) => {

    return component.props &&
        component.props.callback !== undefined;
};

const isRedirect = (component) => {

    return component.props &&
        component.props.from !== undefined &&
        component.props.to !== undefined &&
        component.props.status !== undefined;
};

const isRoute = (component) => {

    return component.props &&
        component.props.path !== undefined &&
        component.props.render !== undefined &&
        component.props.name !== undefined;
};


const getChildrenArray = (component) => {
    return Array.isArray(component.props.children) ? component.props.children : [component.props.children];
};

const applyMiddleware = (mwComponent) => {
    return mwComponent.props.callback;
};


const parseMiddlewares = (component) => {
    return getChildrenArray(component)
        .filter(child => isMiddleware(child))
        .map(child => applyMiddleware(child));
}

const applyClientApp = (caComponent) => {

    return Object.assign(
        Object.assign({}, caComponent.props),
        {
            middlewareCallbacks: (caComponent.props.middlewareCallbacks !== undefined ?
                caComponent.props.middlewareCallbacks : []).concat(parseMiddlewares(caComponent)),

            redirects: (caComponent.props.redirects !== undefined ?
                caComponent.props.redirects : []).concat(parseRedirects(caComponent)),

            routes: (caComponent.props.routes !== undefined ?
                caComponent.props.routes : []).concat(parseRoutes(caComponent)),
        }
    );

};

const parseRedirects = (component) => {
    return getChildrenArray(component)
        .filter(child => isRedirect(child))
        .map(child => applyRedirect(child));
};

const applyRedirect = (redirectComponent) => {
    //console.log("redirect: ", redirectComponent.props);
    return redirectComponent.props
};

const parseRoutes = (component) => {
    return getChildrenArray(component)
        .filter(child => isRoute(child))
        .map(child => applyRoute(child, component.props.method));
};

const applyRoute = (routeComponent, method) => {
    //console.log("route: ", routeComponent.props);
    return Object.assign(
        Object.assign({}, routeComponent.props),
        {
            method: method,
            exact: true,
            middlewareCallbacks: (routeComponent.props.middlewareCallbacks !== undefined ?
                routeComponent.props.middlewareCallbacks : []).concat(parseMiddlewares(routeComponent)),
        }
    );
};


export function loadIsoConfigFromComponent(component: any) {

    console.log("child: ", component.props.children.props);

    return {
        type: ConfigTypes.ISOMORPHIC,
        isoConfig: {
            middlewares: parseMiddlewares(component),

            clientApps: getChildrenArray(component)
                .filter(child => isClientApp(child))
                .map(child => applyClientApp(child)),
        },

        ssrConfig: {
            stackName: component.props.stackName,
            buildPath: component.props.buildPath,
            assetsPath: component.props.assetsPath
        }
    }



    /*{
        type: ConfigTypes.ISOMORPHIC,
        isoConfig: {

            middlewares: [
                function log(req, res, next) {
                    console.log("here I am again");

                    next();
                }
            ],

                clientApps: [
                {
                    id: "main",
                    path: "*",
                    method: "GET",
                    routes: [
                        {
                            path: '/',
                            method: "GET",
                            middlewareCallbacks: [
                            ],
                            render: (props) => (<ComponentPage {...props}/>), //<ForceLogin ></ForceLogin>
                        name: 'Infrastructure Components',
                exact: true
        }
        ],
            redirects: [],

                //connectWithDataLayer: connectWithDataLayer,
                //hydrateFromDataLayer: hydrateFromDataLayer,
                middlewareCallbacks: [
                routeMain
            ],

        }
        ]
        }
    }*/
}
