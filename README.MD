# Infrastructure-Scripts

Infrastructure-scripts provide all the scripts required to `build`, `start`, and `deploy`
[infrastructure-components](https://github.com/infrastructure-components/infrastructure-components).

It is like "react-scripts" within "react-starter".


## Installation

This lib contains many libraries that you only need during development/deployment. Thus, install this library
as devDependency:

```
npm install --save-dev infrastructure-scripts
```

This library uses the [Serverless framework](https://serverless.com/) that you need to install globally.
`serverless-offline` lets you start your application on localhost

```
npm install -g serverless
npm install --save-dev serverless-offline
```

[infrastructure-components](https://github.com/infrastructure-components/infrastructure-components) requires the following
libraries during runtime:

- express
- infrastructure-components
- react
- react-dom
- react-helmet
- react-router
- react-router-dom
- serverless-http
- styled-components


```
npm install --save \
    express \
    infrastructure-components \
    react \
    react-dom \
    react-helmet \
    react-router \
    react-router-dom \
    serverless-http \
    styled-components

```


## Help and Support

Infrastructure-Components are under active development. If you find a bug or need support of any kind,
please have a look at our [Spectrum-Chat](https://spectrum.chat/infrastructure).

Further, we frequently publish descriptions and tutorials on new features on [Medium.com](https://medium.com/@fzickert).