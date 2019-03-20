

// this must be imported to allow async-functions within an AWS lambda environment
// see: https://github.com/babel/babel/issues/5085
import "@babel/polyfill";

import React from 'react';
import { hydrate } from 'react-dom';


const createClientWebApp = () => {
    hydrate(require('IsoConfig').isoConfig.routes["INDEX_OF_ROUTE"].createClientApp(),
        document.getElementById('root')
    );
};

// this module MUST NOT export anything else. Because it would also load the default, which would be executed right away
export default createClientWebApp();