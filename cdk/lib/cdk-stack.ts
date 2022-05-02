import { AllowedMethods, CacheHeaderBehavior, CachePolicy, Distribution, experimental, HttpVersion, LambdaEdgeEventType, OriginProtocolPolicy, PriceClass, SecurityPolicyProtocol, ViewerProtocolPolicy } from '@aws-cdk/aws-cloudfront';
import { HttpOrigin } from '@aws-cdk/aws-cloudfront-origins';
import { AnyPrincipal, Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Code, Runtime } from '@aws-cdk/aws-lambda';
import { Bucket } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { CfnOutput, Duration, RemovalPolicy } from '@aws-cdk/core';

export class PasswordProtectS3StaticSiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    ///////////////////////////////
    // Part 1
    // const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'HostedZoneWithAttr', {
    //   hostedZoneId: hostedZoneId,
    //   zoneName: website_domain
    // })
    
    // const previewCert = new DnsValidatedCertificate(this, 'previewSSL', {
    //   domainName: preview_domain,
    //   hostedZone
    // })
    
    const olympusOdysseyBucket = new Bucket(this, 'olympusOdyssey', {
      removalPolicy: RemovalPolicy.DESTROY,
      bucketName: 'olympusodyssey.nft',
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: '404.html'
    })

    new CfnOutput(this, 'olympusOdysseyWebsiteUrl', {
      value: olympusOdysseyBucket.bucketWebsiteUrl
    })
    ///////////////////////////////
    
    ///////////////////////////////
    // Part 2
    olympusOdysseyBucket.addToResourcePolicy(new PolicyStatement({
      sid: 'allow request from cloudfront to s3 website',
      effect: Effect.ALLOW,
      principals: [new AnyPrincipal()],
      actions: ['s3:GetObject'],
      resources: [`${olympusOdysseyBucket.bucketArn}/*`],
      conditions: {
        "StringLike": {
          "aws:Referer": ['123']
        }
      }
    }))

    const olympusOdysseyCachePolicy = new CachePolicy(this, 'olympusOdysseyCachePolicy', {
      defaultTtl: Duration.minutes(30),
      minTtl: Duration.minutes(25),
      maxTtl: Duration.minutes(35),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      headerBehavior: CacheHeaderBehavior.allowList('authorization')
    })

    const edgeAuth = new experimental.EdgeFunction(this, 'edgeAuthFn', {
      runtime: Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: Code.fromAsset(`${__dirname}/../../src/basic-auth/deployment.zip`),
      memorySize: 128
    })
    ///////////////////////////////
    
    ///////////////////////////////
    // Part 3
    const olympusOdysseyDistribution = new Distribution(this, 'olympusOdysseyDistribution', {
      defaultBehavior: {
        origin: new HttpOrigin('olympusodyssey.nft.s3-website-eu-west-1.amazonaws.com', {
          protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
          customHeaders: {
            'Referer': '123'
          }
        }),
        edgeLambdas: [{
          functionVersion: edgeAuth.currentVersion,
          eventType: LambdaEdgeEventType.VIEWER_REQUEST
        }],
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: olympusOdysseyCachePolicy,
        compress: true,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2019,
      httpVersion: HttpVersion.HTTP2,
      priceClass: PriceClass.PRICE_CLASS_ALL
    })
    ///////////////////////////////

    ///////////////////////////////
    // Part 4
    // new ARecord(this, 'aliasForPreview', {
    //   target: RecordTarget.fromAlias(new CloudFrontTarget(olympusOdysseyDistribution)),
    //   zone: hostedZone,
    //   recordName: preview_domain
    // })
    ///////////////////////////////

  }
}