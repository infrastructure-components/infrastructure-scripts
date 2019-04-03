
export const INFRASTRUCTURE_TYPE_WEBAPP = "INFRASTRUCTURE_TYPE_WEBAPP";

/**
 * can be used in the parser, we get a real object here!
 *
 * @param parsedComponent
 */
export const isWebAppConfig = (parsedComponent): boolean => {
    if (parsedComponent !== undefined) {
        return parsedComponent.infrastructureType === INFRASTRUCTURE_TYPE_WEBAPP
    }

    return false;
};


/**
 * An WebApp is a component that can run in webpack-hot-middleware-mode
 * TODO extend respectively
 */
export interface IWebApp {

    /**
     * like every infrastructure-component, an App must have a type
     */
    infrastructureType: string,

}