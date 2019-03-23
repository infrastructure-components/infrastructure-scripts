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
                caComponent.props.middlewareCallbacks : []).concat(parseMiddlewares(caComponent))
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
