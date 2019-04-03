import React, {ReactNode} from 'react';

/**
 * Specifies all the properties that an Isomorphic-Component must have
 */
export interface IIsomorphic {

    /**
     * name of the Cloudformation Stack
     */
    stackName: string,

    /**
     * Local, relative directory specifies where to put the final bundles
     */
    buildPath: string,

    /**
     * Relative directory specifies where to put the assets (e.g. client-app-bunde-js)
     */
    assetsPath: string
}




export default (props: IIsomorphic | any) => {

    console.log ("isomorphic: ",props );

    return Object.assign({}, props);



};
