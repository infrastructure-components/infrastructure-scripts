/**
 * Basic serveless.yml frame
 */
export const SERVERLESS_YML = `service:

plugins:
  # allows running the stack locally on the dev-machine
  - serverless-offline
  
# the custom section
custom:
  # allows accessing the offline backend when using Docker
  serverless-offline:
    host: 0.0.0.0
    port: \${env:PORT}

package:

provider:
  name: aws
  runtime: nodejs8.10
  
functions:

resources:

`;
