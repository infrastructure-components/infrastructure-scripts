import { YamlEditor } from '../yaml-edit';

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
    port: \${self:provider.port, env:PORT, '3000'}

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

export async function deploySls() {
    const fs = require("fs");

    //createSlsYaml(slsConfig, keepSlsYaml);

    // login in to Serverless/Aws
    await slsLogin();

    //  sls deploy && node -r dotenv/config -e 'require(\"./src/config\").s3sync()' dotenv_config_path=.dev.env",
    await runSlsCmd(`sls deploy`);

}


export async function initDomain() {

    // login in to Serverless/Aws
    await slsLogin();

    //  sls deploy && node -r dotenv/config -e 'require(\"./src/config\").s3sync()' dotenv_config_path=.dev.env",
    await runSlsCmd(`sls create_domain`);

}

/**
 * convert json to yml: https://www.npmjs.com/package/json-to-pretty-yaml
 *
 * @param ssrConfigPath path to a module that exports [[ServerSideRenderingConfig]]
 */
export async function startSlsOffline (keepSlsYaml: boolean) {

    const fs = require("fs");

    if (!existsSlsYml()) {
        console.log("serverless.yml not found, please use 'npm run build'")
        return;
    }

    //createSlsYaml(slsConfig, keepSlsYaml);

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

export const toSpaSlsConfig = (
    stackName: string,
    buildPath: string,
    region: string,
    domain: string | undefined) => {

    const path = require ('path');


    const distributionConfig = {
        Origins: [
            {
                DomainName: "${self:provider.staticBucket}.s3.amazonaws.com",
                Id: stackName,
                CustomOriginConfig: {
                    HTTPPort: 80,
                    HTTPSPort: 443,
                    OriginProtocolPolicy: "https-only",
                }
            }
        ],
        Enabled: "'true'",

        DefaultRootObject: "index.html",
        CustomErrorResponses: [{
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: "/index.html"
        }],

        DefaultCacheBehavior: {
            AllowedMethods: [
                "DELETE",
                "GET",
                "HEAD",
                "OPTIONS",
                "PATCH",
                "POST",
                "PUT"
            ],
                TargetOriginId: stackName,
                ForwardedValues: {
                QueryString: "'false'",
                    Cookies: {
                    Forward: "none"
                }
            },
            ViewerProtocolPolicy: "redirect-to-https"
        },
        ViewerCertificate: {
            AcmCertificateArn: "${self:provider.certArn}",
            SslSupportMethod: "sni-only",
        }


    };
    //CloudFrontDefaultCertificate: "'true'"


    if (domain !== undefined) {
        distributionConfig["Aliases"] = ["${self:provider.customDomainName}"]
    };

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

            staticBucket: stackName+"-${self:provider.stage, env:STAGE, 'dev'}",
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
                },

                WebAppCloudFrontDistribution: {
                    Type: "AWS::CloudFront::Distribution" ,
                    Properties: {
                        DistributionConfig: distributionConfig
                    }
                },




            },

            Outputs: {
                WebAppCloudFrontDistributionOutput: {
                    Value: {
                        "Fn::GetAtt": "[ WebAppCloudFrontDistribution, DomainName ]"
                    }
                }
            }
        }
    }

    if (domain !== undefined) {
        result.resources.Resources["DnsRecord"] = {
            Type: "AWS::Route53::RecordSet",
                Properties: {
                AliasTarget: {
                    DNSName: "!GetAtt WebAppCloudFrontDistribution.DomainName",
                        HostedZoneId: "Z2FDTNDATAQYW2"
                },
                HostedZoneName: "${self:provider.hostedZoneName}.",
                    Name: "${self:provider.customDomainName}.",
                    Type: "'A'"
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

            // name of the static bucket, must match lib/getStaticBucketName
            staticBucket: `${stackName}-${assetsPath}-`+"${self:provider.stage, env:STAGE, 'dev'}",

            // set the environment variables
            environment: {
                // set the STAGE_PATH environment variable to the same we use during the build process
                STAGE: "${self:provider.stage, env:STAGE, 'dev'}",
                STAGE_PATH: "${self:provider.stage, env:STAGE_PATH, ''}",
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
export function slsLogin () {

    require('child_process').exec(`sls config credentials -o --provider aws --key ${process.env.AWS_ACCESS_KEY_ID} --secret ${process.env.AWS_SECRET_ACCESS_KEY}`,
        function(err, stdout, stderr) {
            if (err) {
                console.log(err);
            }
            console.log(stdout, stderr);
        });

};

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
            console.log("progress", uploader.progressAmount, uploader.progressTotal);
        });
        uploader.on('end', function() {
            console.log("done uploading");
            resolve();
        });
    });

}
