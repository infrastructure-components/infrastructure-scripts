
import * as deepmerge from 'deepmerge';

/**
 * parses a configuration, this configuration must export the main component as default
 *
 *
 * @param component (main component of the configuration)
 * @param compileMode set to true to run the parser with a statically loaded configuration (without objects)
 */
export function parseConfiguration(configuration: any, compileMode: boolean = true) {


    return


    var arrConfigs = [];
    const addToTopLevelConfig = (c) => {
        //console.log("addToTopLevelConfig: ", c);

        const allowed = ['slsConfig', 'ssrConfig'];

        arrConfigs.push(Object.keys(c)
            .filter(key => allowed.includes(key))
            .reduce((obj, key) => {
                obj[key] = c[key];
                return obj;
            }, {})
        );
    }

    var arrDataLayers = [];
    const addDataLayer = (dlComponent) => {
        arrDataLayers.push(dlComponent);
    }

    const clientApps= getChildrenArray(component)
        .map(child => applyCustomComponents(child, addToTopLevelConfig, addDataLayer, compileMode))
        .filter(child => isClientApp(child))
        .map(child => applyClientApp(child));

    //console.log("arrConfigs: " , arrConfigs)

    const result = deepmerge.all([{
        type: ConfigTypes.ISOMORPHIC,
        isoConfig: {
            middlewares: parseMiddlewares(component),

            clientApps: clientApps,

            dataLayers: arrDataLayers
        },

        ssrConfig: {
            stackName: component.props.stackName,
            buildPath: component.props.buildPath,
            assetsPath: component.props.assetsPath,
            region: component.props.region
        },

        slsConfig: {}
    }, ...arrConfigs
    ]);

    //console.log("loaded IsoConfig: " , result);
    return result;

};

const getClientApps = (baseComponent) => {

};


/**
 * Get the children of the current component as an array
 *
 *
 * @param component the parent component
 * @return an Array of the children, even if there is only a single child or no (empty array). If the component itself
 * is an array, its items are returned
 */
export const getChildrenArray = (component) => {

    if (component == undefined) {
        return [];
    }

    if (Array.isArray(component) && component.length > 0) {
        //console.log("component is array: ", component)
        return [...component] ;
    }

    if (component.props == undefined || component.props.children == undefined) {
        return [];
    }

    return Array.isArray(component.props.children) ? component.props.children : [component.props.children];
};