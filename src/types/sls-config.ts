import { YamlEditor } from '../yaml-edit';
import {AppConfig, getBuildPath} from "./app-config";
import { slsLogin, s3sync } from '../libs';

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

export interface ISlsDeployConfiguration {
    assetsPath: string
}

export async function createSlsYaml (slsConfig: any, keepSlsYaml: boolean, deployConfiguration?: ISlsDeployConfiguration) {
    // create a serverless.yml in the root directory

    const fs = require("fs");
    const ymlExists = await existsSlsYml();
    if (!keepSlsYaml && ymlExists) {
        console.error("serverless.yml already exists. This file would be overwritten! Please remove it before proceeding.");
        return;
    }

    const cmd = require('node-cmd');
    let yamlEdit = YamlEditor(SERVERLESS_YML);

    if (deployConfiguration !== undefined) {
        prepareForDeployment(yamlEdit, deployConfiguration);
    }


    // add the
    Object.keys(slsConfig).forEach(key => {
        console.log (key);
        yamlEdit.insertChild(key, slsConfig[key]);
    });

    let yamlString = yamlEdit.dump();

    console.log(yamlString);

    await fs.writeFile('serverless.yml', yamlString, function (err) {
        if (err) throw err;
        console.log('serverless.yml created...');
    });

}

export function prepareForDeployment(yamlEdit, deployConfiguration: ISlsDeployConfiguration) {

    //takes the stage information from the environment variables, otherwise from what the provider-section specifies
    yamlEdit.insertChild("custom", {
        stage: "${env:STAGE}"
    });


    yamlEdit.insertChild("provider", {
        // set stage to environment variables
        stage: "${env:STAGE}",

        // # take the region from the environment variables
        region: "${env:AWS_REGION}",

        // we take the custom name of the CloudFormation stack from the environment variable: `CLOUDSTACKNAME`
        stackName: "${self:service.name}-${env:STAGE}",

        // Use a custom name for the API Gateway API
        apiName: "${self:service.name}-${env:STAGE}-api",

        // set the environment variables
        environment: {
            // set the STAGE_PATH environment variable to the same we use during the build process
            STAGE: "${env:STAGE}",
            STAGE_PATH: "${env:STAGE_PATH}",
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
    });

    yamlEdit.insertChild("resources", {
        Resources: {
            // Bucket of the client side webapp files (bundle.js...)
            StaticBucket: {
                Type: "AWS::S3::Bucket",
                Properties: {
                    // the bucket name is the combination of the cloudstackname, a minus, and the name of the assetsdir
                    BucketName: "${env:STATIC_ASSETS_BUCKET}-${env:STAGE}",
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
                    PathPart: deployConfiguration.assetsPath
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
                        Uri: "https://s3-${env:AWS_REGION}.amazonaws.com/${env:STATIC_ASSETS_BUCKET}-${env:STAGE}/{proxy}",
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
                    StageName: "${env:STAGE}"
                }
            }
        }
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

export async function deploySls(slsConfig: any, deployConfiguration: ISlsDeployConfiguration, keepSlsYaml: boolean) {
    const fs = require("fs");

    createSlsYaml(slsConfig, keepSlsYaml, deployConfiguration);

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

    createSlsYaml(slsConfig, keepSlsYaml, undefined);

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



export const toSlsConfig = (stackName: string, serverConfig: AppConfig, buildPath: string) => {

    const path = require ('path');

    return {
        service: {
            // it is allowed to use env-variables, but don't forget to specify them
            // e.g. "${env:CLOUDSTACKNAME}-${env:STAGE}"
            name: stackName
        },
        package: {
            include: [
                `${buildPath}/**/*`
            ],
            exclude: [
                "node_modules/infrastructure-components/node_modules/**/*"
            ]
        },
        functions: {
            server: {
                // index.default refers to the default export of the file
                // this requires the server entry point to export as default:
                // `export default serverless(createServer());`
                handler: path.join(buildPath,serverConfig.name, "index.default"),
                events: [
                    // this should match the public path in the app-config
                    {http: "ANY /"},
                    {http: "'ANY {proxy+}'"},
                    {cors: "true"},
                ]
            }

        }
    }
}