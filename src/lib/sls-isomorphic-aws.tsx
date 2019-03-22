import * as React from 'react';
import {ConfigTypes} from "./config";

export interface Props {
    isoConfig: any,
    ssrConfig: any
    type?: string;
}

export class SlsIsomorphicAws extends React.Component<Props, {}> {


    constructor(props) {
        super(props);

        //this.props.type = ConfigTypes.ISOMORPHIC;

    }

    render () {
        return null;
    }
}

export default SlsIsomorphicAws;
