/**
 * TODO LEGACY PART
 */

import { YamlEditor } from '../yaml-edit';
import {AppConfig } from "infrastructure-components";
import { slsLogin, s3sync } from '../libs';

/**
 * Basic serveless.yml frame
 */
export const SERVERLESS_YML = `service:

plugins:
  # allows running the stack locally on the dev-machine
  - serverless-offline
  - serverless-pseudo-parameters
  
# the custom section
custom:
  # allows accessing the offline backend when using Docker
  serverless-offline:
    host: 0.0.0.0
    port: \${self:provider.PORT, env:PORT, '3000'}

package:

provider:
  name: aws
  runtime: nodejs8.10
  
functions:

resources:

`;


export async function createSlsYaml (slsConfig: any, keepSlsYaml: boolean) {
    // create a serverless.yml in the root directory

    const fs = require("fs");
    const ymlExists = await existsSlsYml();
    if (!keepSlsYaml && ymlExists) {
        console.error("serverless.yml already exists. This file would be overwritten! Please remove it before proceeding.");
        return;
    }

    const cmd = require('node-cmd');
    let yamlEdit = YamlEditor(SERVERLESS_YML);


    // add the sls-configuration to the yml
    Object.keys(slsConfig).forEach(key => {
        //console.log (key);
        yamlEdit.insertChild(key, slsConfig[key]);
    });

    let yamlString = yamlEdit.dump();

    //console.log(yamlString);

    await fs.writeFile('serverless.yml', yamlString, function (err) {
        if (err) throw err;
        console.log('serverless.yml created...');
    });

}


export function existsSlsYml () {
    const fs = require("fs");

    try {
        fs.statSync('serverless.yml');
    } catch (error){
        return false;
    }

    return true;
}

async function runSlsCmd(slsCmd: string, onStdOut?: (data) => void) {
    const cmd = require('node-cmd');

    return new Promise((resolve, reject) => {
        let data_line = '';
        const processRef = cmd.get(slsCmd);
        processRef.stdout.on(
            'data',
            async function(data) {
                data_line += data;
                if (data_line[data_line.length-1] == '\n') {
                    console.log(data_line);

                    if (onStdOut !== undefined) {
                        onStdOut(data_line);
                    }
                }
            }
        );

        processRef.on("exit", function (code, signal) {
            console.log('child process exited with ' +`code ${code} and signal ${signal}`);
            resolve();
        });

    });
}

export async function deploySls(slsConfig: any, keepSlsYaml: boolean) {
    const fs = require("fs");

    createSlsYaml(slsConfig, keepSlsYaml);

    // login in to Serverless/Aws
    await slsLogin();

    //  sls deploy && node -r dotenv/config -e 'require(\"./src/config\").s3sync()' dotenv_config_path=.dev.env",
    await runSlsCmd(`sls deploy`);

}

/**
 * convert json to yml: https://www.npmjs.com/package/json-to-pretty-yaml
 *
 * @param ssrConfigPath path to a module that exports [[ServerSideRenderingConfig]]
 */
export async function startSlsOffline (slsConfig: any, keepSlsYaml: boolean) {

    const fs = require("fs");

    createSlsYaml(slsConfig, keepSlsYaml);

    await runSlsCmd(`sls offline start`, async (data) => {
        if (!keepSlsYaml && data.indexOf("Serverless: Offline listening") >= 0 && await existsSlsYml()) {
            fs.unlink('serverless.yml', function (err) {
                if (err) throw err;
                console.log('serverless.yml removed...');
            });

        }
    })

    /*
    await new Promise((resolve, reject) => {
        let data_line = '';
        const processRef = cmd.get(`sls offline start`);
        processRef.stdout.on(
            'data',
            async function(data) {
                data_line += data;
                if (data_line[data_line.length-1] == '\n') {
                    console.log(data_line);

                    if (!keepSlsYaml && data_line.indexOf("Serverless: Offline listening") >= 0 && await existsSlsYml()) {
                        fs.unlink('serverless.yml', function (err) {
                            if (err) throw err;
                            console.log('serverless.yml removed...');
                        });

                    }

                }
            }
        );

    });*/

}



export const toSlsConfig = (
    stackName: string,
    serverConfig: AppConfig,
    buildPath: string,
    assetsPath: string,
    region: string,
    slsConfig: any) => {
    
    const merge = require('deepmerge');
    const path = require ('path');

    return merge({
        service: {
            // it is allowed to use env-variables, but don't forget to specify them
            // e.g. "${env:CLOUDSTACKNAME}-${env:STAGE}"
            name: stackName
        },

        custom: {
            stage: "${self:provider.STAGE, env:STAGE, 'dev'}"
        },

        package: {
            include: [
                `${buildPath}/**/*`
            ],

            exclude: [
                ".infrastructure_temp/**/*",
                "build/main/**/*"
            ]
        },

        functions: {
            server: {
                // index.default refers to the default export of the file
                // this requires the server entry point to export as default:
                // `export default serverless(createServer());`
                handler: path.join(buildPath,serverConfig.name, serverConfig.name+".default"),
                events: [
                    // this should match the public path in the app-config  
                    {http: "ANY /"},
                    {http: "'ANY {proxy+}'"},
                    {cors: "true"},
                ]
            }

        },

        // TODO put these values into the Environment-Object

        provider: {
            // set stage to environment variables
            //stage: "${env:STAGE}", done through the environment!

            // # take the region from the environment variables
            region: region, //"${env:AWS_REGION}",

            // we take the custom name of the CloudFormation stack from the environment variable: `CLOUDSTACKNAME`
            stackName: "${self:service.name}-${self:provider.STAGE, env:STAGE, 'dev'}",

            // Use a custom name for the API Gateway API
            apiName: "${self:service.name}-${self:provider.STAGE, env:STAGE, 'dev'}-api",

            // name of the static bucket, must match lib/getStaticBucketName
            staticBucket: `${stackName}-${assetsPath}-`+"${self:provider.STAGE, env:STAGE, 'dev'}",

            // set the environment variables
            environment: {
                // set the STAGE_PATH environment variable to the same we use during the build process
                STAGE: "${self:provider.STAGE, env:STAGE, 'dev'}",
                STAGE_PATH: "${self:provider.STAGE_PATH, env:STAGE_PATH, ''}",
                DOMAIN_URL: '{ "Fn::Join" : ["", [" https://#{ApiGatewayRestApi}", ".execute-api.'+region+'.amazonaws.com/${self:provider.STAGE, env:STAGE, \'dev\'}" ] ]  }'

            },

            // specifies the rights of the lambda-execution role
            iamRoleStatements: [
                {
                    //let the technical user read from S3
                    Effect: "Allow",
                    Action: [ "s3:Get*", "s3:List*"],
                    Resource: "\"*\""
                }
            ]
        },

        resources: {
            Resources: {
                // Bucket of the client side webapp files (bundle.js...)
                StaticBucket: {
                    Type: "AWS::S3::Bucket",
                        Properties: {
                        // the bucket name is the combination of the cloudstackname, a minus, and the name of the assetsdir
                        BucketName: "${self:provider.staticBucket}",
                            AccessControl: "PublicRead",
                            WebsiteConfiguration: {
                            IndexDocument: "index.html"
                        },
                        LifecycleConfiguration: {
                            Rules: [{
                                Id: "S3ExpireMonthly",
                                ExpirationInDays: 30,
                                Status: "Enabled"
                            }]
                        },
                        CorsConfiguration: {
                            CorsRules: [{
                                AllowedMethods: ['GET'],
                                AllowedOrigins: ['"*"'],
                                AllowedHeaders: ['"*"']
                            }]

                        }


                    }
                },

                StaticBucketPolicy: {
                    Type: "AWS::S3::BucketPolicy",
                        Properties: {
                        Bucket: {
                            Ref: "StaticBucket"
                        },
                        PolicyDocument: {
                            Statement: {
                                Sid: "PublicReadGetObject",
                                    Effect: "Allow",
                                    Principal: '"*"',
                                    Action: ["s3:GetObject"],
                                    Resource: {
                                    "Fn::Join": "[\"\", [\"arn:aws:s3:::\", {\"Ref\": \"StaticBucket\" }, \"/*\"]]"
                                }


                            }
                        }
                    }
                },

                AssetsResource: {
                    Type: 'AWS::ApiGateway::Resource',
                        Properties: {
                        ParentId: "!GetAtt ApiGatewayRestApi.RootResourceId",
                            RestApiId: "!Ref ApiGatewayRestApi",
                            PathPart: `"${assetsPath}"`
                    }
                },

                Resource: {
                    Type: 'AWS::ApiGateway::Resource',
                        Properties: {
                        ParentId: "!Ref AssetsResource",
                            RestApiId: "!Ref ApiGatewayRestApi",
                            PathPart: '"{proxy+}"'
                    }

                },

                ProxyMethod: {
                    Type: 'AWS::ApiGateway::Method',
                        Properties: {
                        HttpMethod: "ANY",
                            ResourceId: "!Ref Resource",
                            RestApiId: "!Ref ApiGatewayRestApi",
                            AuthorizationType: "NONE",
                            RequestParameters: {
                            "method.request.path.proxy": "true"
                        },
                        Integration: {
                            CacheKeyParameters: ['"method.request.path.proxy"'],
                                RequestParameters: {
                                "integration.request.path.proxy": '"method.request.path.proxy"'
                            },
                            IntegrationHttpMethod: "ANY",
                                Type: "HTTP_PROXY",
                                Uri: "https://s3-"+region+".amazonaws.com/${self:provider.staticBucket}/{proxy}",
                                PassthroughBehavior: "WHEN_NO_MATCH",
                                IntegrationResponses: [{
                                StatusCode: 200
                            }]

                        }

                    }
                },

                Deployment: {
                    DependsOn: ["ProxyMethod"],
                        Type: 'AWS::ApiGateway::Deployment',
                        Properties: {
                        RestApiId: "!Ref ApiGatewayRestApi",
                            StageName: "${self:provider.STAGE, env:STAGE, 'dev'}"
                    }
                }
            }
        }
    },
    slsConfig)
}