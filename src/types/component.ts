
import Types from './index'

/**
 * A Component has no special function
 *
 */
export interface IComponent {

    /**
     * like every infrastructure-component, a component must have a type
     * to be set to `Types.INFRASTRUCTURE_TYPE_COMPONENT`
     */
    infrastructureType: string,

}

/**
 * check whether the provided object serves as a client
 *
 * can be used in the parser, we get a real object here!
 *
 * @param parsedComponent
 */
export const isComponent = (parsedComponent): boolean => {
    if (parsedComponent !== undefined) {
        return parsedComponent.infrastructureType === Types.INFRASTRUCTURE_TYPE_COMPONENT
    }

    return false;
};

