import { YamlEditor } from '../yaml-edit';

export const SLS_PATH = "./node_modules/.bin/serverless";


/**
 * Basic serveless.yml frame
 */
export const SERVERLESS_YML = `service:

plugins:
  
# the custom section
custom:
  

package:

provider:
  name: aws
  runtime: nodejs8.10
  
functions:

resources:

`;




export async function createSlsYaml (slsConfig: any, keepSlsYaml: boolean) {
    // create a serverless.yml in the root directory

    console.log("slsConfig: " , slsConfig)

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

export async function runSlsCmd(slsCmd: string, onStdOut?: (data) => void, hideLog?: boolean) {
    const cmd = require('node-cmd');

    // maybe use "nodemon": "^1.19.1",


    return new Promise((resolve, reject) => {
        let data_line = '';
        const processRef = cmd.get(slsCmd);
        processRef.stdout.on(
            'data',
            async function(data) {
                data_line += data;
                if (data_line[data_line.length-1] == '\n') {
                    if (!hideLog) {
                        console.log(data_line);

                    }

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

export async function deploySls(stackname: string) {
    const fs = require("fs");

    //createSlsYaml(slsConfig, keepSlsYaml);

    // login in to Serverless/Aws
    await slsLogin(stackname);

    //  sls deploy && node -r dotenv/config -e 'require(\"./src/config\").s3sync()' dotenv_config_path=.dev.env",
    await runSlsCmd(`${SLS_PATH} deploy`);

}


export async function initDomain(stackname: string) {

    // login in to Serverless/Aws
    await slsLogin(stackname);

    //  sls deploy && node -r dotenv/config -e 'require(\"./src/config\").s3sync()' dotenv_config_path=.dev.env",
    await runSlsCmd(`${SLS_PATH} create_domain`);

}

/**
 * convert json to yml: https://www.npmjs.com/package/json-to-pretty-yaml
 *
 * @param ssrConfigPath path to a module that exports [[ServerSideRenderingConfig]]
 */
export async function startSlsOffline (keepSlsYaml: boolean, port = undefined, runSync = true) {

    const fs = require("fs");

    if (!existsSlsYml()) {
        console.log("serverless.yml not found, please use 'npm run build'")
        return;
    }

    //createSlsYaml(slsConfig, keepSlsYaml);



    if (runSync) {
        await runSlsCmd(`sls offline start ${port !== undefined ? `--port ${port}` : ""}`, async (data) => {
            if (!keepSlsYaml && data.indexOf("Serverless: Offline listening") >= 0 && await existsSlsYml()) {
                fs.unlink('serverless.yml', function (err) {
                    if (err) throw err;
                    console.log('serverless.yml removed...');
                });

            }
        })
    } else {
        runSlsCmd(`sls offline start ${port !== undefined ? `--port ${port}` : ""}`, async (data) => {
            if (!keepSlsYaml && data.indexOf("Serverless: Offline listening") >= 0 && await existsSlsYml()) {
                fs.unlink('serverless.yml', function (err) {
                    if (err) throw err;
                    console.log('serverless.yml removed...');
                });

            }
        })
    }


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

export const toSpaSlsConfig = (
    stackName: string,
    buildPath: string,
    region: string,
    domain: string | undefined) => {

    const path = require ('path');


    const result = {
        service: {
            // it is allowed to use env-variables, but don't forget to specify them
            // e.g. "${env:CLOUDSTACKNAME}-${env:STAGE}"
            name: stackName
        },

        plugins: "- serverless-single-page-app-plugin",


        provider: {
            // set stage to environment variables
            //stage: "${env:STAGE}", done through the environment!

            // # take the region from the environment variables
            region: region, //"${env:AWS_REGION}",

            // we take the custom name of the CloudFormation stack from the environment variable: `CLOUDSTACKNAME`
            stackName: "${self:service.name}-${self:provider.stage, env:STAGE, 'dev'}",

            accountId: '"infrcomp-#{AWS::AccountId}-"',

            staticBucket: "${self:provider.accountId}"+stackName+"-${self:provider.stage, env:STAGE, 'dev'}",
            //"infrcomp-${AWS::AccountId}-"+stackName+"-${self:provider.stage, env:STAGE, 'dev'}",
        },

        resources: {
            Resources: {
                WebAppS3Bucket: {
                    Type: "AWS::S3::Bucket",
                    Properties: {
                        // the bucket name is the combination of the cloudstackname, a minus, and the name of the assetsdir
                        BucketName: "${self:provider.staticBucket}",
                        AccessControl: "PublicRead",
                        WebsiteConfiguration: {
                            IndexDocument: "index.html",
                            ErrorDocument: "index.html"
                        }
                    }
                },

                WebAppS3BucketPolicy: {
                    Type: "AWS::S3::BucketPolicy",
                    Properties: {
                        Bucket: {
                            Ref: "WebAppS3Bucket"
                        },
                        PolicyDocument: {
                            Statement: {
                                Sid: "PublicReadGetObject",
                                Effect: "Allow",
                                Principal: '"*"',
                                Action: ["s3:GetObject"],
                                Resource: {
                                    "Fn::Join": "[\"\", [\"arn:aws:s3:::\", {\"Ref\": \"WebAppS3Bucket\" }, \"/*\"]]"
                                }


                            }
                        }
                    }
                }

            }
        }
    }


    return result;
};

/**
 * Creates a Serverless-configuration of an Isomorphic App
 */
export const toSlsConfig = (
    stackName: string,
    serverName: string,
    buildPath: string,
    assetsPath: string,
    region: string) => {
    
    const path = require ('path');

    return {
        service: {
            // it is allowed to use env-variables, but don't forget to specify them
            // e.g. "${env:CLOUDSTACKNAME}-${env:STAGE}"
            name: stackName
        },

        custom: {
            stage: "${self:provider.stage, env:STAGE, 'dev'}"
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
                handler: path.join(buildPath, serverName, serverName+".default"),
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
            stackName: "${self:service.name}-${self:provider.stage, env:STAGE, 'dev'}",

            // Use a custom name for the API Gateway API
            apiName: "${self:service.name}-${self:provider.stage, env:STAGE, 'dev'}-api",

            accountId:'"infrcomp-#{AWS::AccountId}-"',

            // name of the static bucket, must match lib/getStaticBucketName
            staticBucket: "${self:provider.accountId}"+stackName+"-"+assetsPath+"-${self:provider.stage, env:STAGE, 'dev'}",

            // set the environment variables
            environment: {
                // set the STAGE_PATH environment variable to the same we use during the build process
                STAGE: "${self:provider.stage, env:STAGE, 'dev'}",
                STAGE_PATH: "${self:provider.stage_path, env:STAGE_PATH, ''}",
                DOMAIN_URL: '{ "Fn::Join" : ["", [" https://#{ApiGatewayRestApi}", ".execute-api.'+region+'.amazonaws.com/${self:provider.stage, env:STAGE, \'dev\'}" ] ]  }'

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
                            StageName: "${self:provider.stage, env:STAGE, 'dev'}"
                    }
                }
            }
        }
    };
};



/**
 * Creates a Serverless-configuration of an Isomorphic App
 */
export const toSoaSlsConfig = (
    stackName: string,
    serverName: string,
    buildPath: string,
    assetsPath: string,
    region: string,
    services: Array<any>
    ) => {

    console.log("toSoaSlsConfig");

    const path = require ('path');

    return {
        service: {
            // it is allowed to use env-variables, but don't forget to specify them
            // e.g. "${env:CLOUDSTACKNAME}-${env:STAGE}"
            name: stackName
        },

        custom: {
            stage: "${self:provider.stage, env:STAGE, 'dev'}"
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
                handler: path.join(buildPath, serverName, serverName+".default"),
                events: [].concat(services.map(service => {
                    console.log("map service: " , service)
                    return { http: `'${service.method} ${service.path}'`}
                }),[
                    {http: "'ANY {proxy+}'"},
                    {cors: "true"},
                ])
            }

        },

        // TODO put these values into the Environment-Object

        provider: {
            // set stage to environment variables
            //stage: "${env:STAGE}", done through the environment!

            // # take the region from the environment variables
            region: region, //"${env:AWS_REGION}",

            // we take the custom name of the CloudFormation stack from the environment variable: `CLOUDSTACKNAME`
            stackName: "${self:service.name}-${self:provider.stage, env:STAGE, 'dev'}",

            // Use a custom name for the API Gateway API
            apiName: "${self:service.name}-${self:provider.stage, env:STAGE, 'dev'}-api",

            accountId: '"infrcomp-#{AWS::AccountId}-"',

            // name of the static bucket, must match lib/getStaticBucketName
            staticBucket: "${self:provider.accountId}"+stackName+"-${self:provider.stage, env:STAGE, 'dev'}",
            //"infrcomp-"+stackName+"-${self:provider.stage, env:STAGE, 'dev'}",

            // set the environment variables
            environment: {
                // set the STAGE_PATH environment variable to the same we use during the build process
                STAGE: "${self:provider.stage, env:STAGE, 'dev'}",
                STAGE_PATH: "${self:provider.stage_path, env:STAGE_PATH, ''}",
                DOMAIN_URL: '{ "Fn::Join" : ["", [" https://#{ApiGatewayRestApi}", ".execute-api.'+region+'.amazonaws.com/${self:provider.stage, env:STAGE, \'dev\'}" ] ]  }'

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
            }
        }
    };
};


const parseCredentials = (raw) => {
    //console.log("raw response: ", raw)

    try {
        const result = JSON.parse(raw);
        //console.log("result: ", result);

        if (result.accessKeyId && result.secretAccessKey) {
            return result;
        }


    } catch(e) {
        console.log("no credentials, check your stackname and check your CODE_ARCHITECT_ACCESS in .env")
    }


    return {};
}

/* WHY SHOULD WE LET THE FILES EXPIRE?! LifecycleConfiguration: {
 Rules: [{
 Id: "S3ExpireMonthly",
 ExpirationInDays: 30,
 Status: "Enabled"
 }]
 },*/

/**
 * Login to Severless framework
 *
 * Requires env-variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 */
export async function slsLogin (stackname: string) {

    //console.log("cac: ",  process.env.AWS_ACCESS_KEY_ID,  process.env.CODE_ARCHITECT_ACCESS);

    
    
    const {accessKeyId, secretAccessKey} = await (
        process.env.CODE_ARCHITECT_ACCESS !== undefined ? 
            parseCredentials(await require('infrastructure-components').fetchData("login", {
                stackname: stackname,
                cacredential: process.env.CODE_ARCHITECT_ACCESS
            })) : {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });

    await require('child_process').exec(`${SLS_PATH} config credentials -o --provider aws --key ${accessKeyId.trim()} --secret ${secretAccessKey.trim()}`,
        function(err, stdout, stderr) {
            if (err) {
                console.log(err);
            }
            //console.log(stdout, stderr);
        });

};

export async function invalidateCloudFrontCache (domain: string | undefined) {

    if (domain == undefined) {
        return;
    }

    console.log("invalidating CloudFront-Cache...")

    const awsCloudfrontInvalidate = require('aws-cloudfront-invalidate');

    const AWS = require("aws-sdk");
    const cloudfront = new AWS.CloudFront();

    const distributions = cloudfront.listDistributions({}, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
        }
        else if (data.DistributionList !== undefined && data.DistributionList.Items !== undefined){
            const distributions = data.DistributionList.Items;

            //console.log(distributions);           // successful response
            const distribution = distributions.find(entry => {
                if (entry.Aliases == undefined || entry.Aliases.Items == undefined) {
                    return false;
                }

                //console.log(entry.Aliases.Items);

                return entry.Aliases.Items.find(alias => alias === domain) !== undefined

            });

            if (distribution) {
                console.log(
                    `Invalidating CloudFront distribution with id: ${distribution.Id}`
                );

                awsCloudfrontInvalidate(distribution.Id).then((invalidationData) => {
                    console.log('Invalidation created', invalidationData.Invalidation.Id, " ... your domain will serve your new version in a few minutes ...");
                });

            } else {
                const message = `Could not find distribution with domain ${domain}`;
                const error = new Error(message);
                console.log(message);
                throw error;
            }
        }
    });

};

export async function getAccountIDUsingAccessKey() {

    return new Promise( async function (resolve, reject) {

        const AWS = require("aws-sdk");
        const stsService = new AWS.STS({
            apiVersion: '2011-06-15',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });

        var params = {
        };

        var result = undefined;

        await stsService.getCallerIdentity(params, function(err, data) {
            if (err) {
                // an error occurred
                console.log(err, err.stack);
                reject();
            } else {
                //console.log("get Account data: ", data);           // successful response
                resolve(data["Account"]);
            }

            /*
             data = {
             Account: "123456789012",
             Arn: "arn:aws:sts::123456789012:federated-user/my-federated-user-name",
             UserId: "123456789012:my-federated-user-name"
             }
             */
        });

    });
}


/**
 * uploads the static assets (compiled client) to the S3-bucket of the current stage
 * implements [[DeployStaticAssestsSpec]]
 *
 * uses: https://www.npmjs.com/package/s3-node-client
 *
 * Requires env-variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION
 * - STATIC_ASSETS_BUCKET
 * - STAGE
 */
export async function s3sync (region, bucket: string, srcFolder: string) {



    return new Promise((resolve, reject) => {
        var client = require('s3-node-client').createClient({
            maxAsyncS3: 20,     // this is the default
            s3RetryCount: 3,    // this is the default
            s3RetryDelay: 1000, // this is the default
            multipartUploadThreshold: 20971520, // this is the default (20 MB)
            multipartUploadSize: 15728640, // this is the default (15 MB)
            s3Options: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: region,
                // endpoint: 's3.yourdomain.com',
                // sslEnabled: false
                // any other options are passed to new AWS.S3()
                // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
            },
        });

        var params = {
            localDir: srcFolder, //"./build/client",
            deleteRemoved: false, // default false, whether to remove s3 objects that have no corresponding local file.
            s3Params: {
                // the bucket must match the name that is constructed in serverless.yml
                Bucket: bucket,
                //Prefix: "",
                // other options supported by putObject, except Body and ContentLength.
                // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
            },
        };

        var uploader = client.uploadDir(params);
        uploader.on('error', function(err) {
            console.error("unable to sync:", err.stack);
            reject();
        });
        uploader.on('progress', function() {
            process.stdout.write(`progress  ${uploader.progressAmount} of ${uploader.progressTotal} bytes\r`);
        });
        uploader.on('end', function() {
            console.log(`done uploading  ${uploader.progressTotal} bytes                  `);
            resolve();
        });
    });

}
