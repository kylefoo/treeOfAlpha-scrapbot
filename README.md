This project uses serverless framework to deploy to lambda
@see https://us-east-2.console.aws.amazon.com/lambda/home?region=us-east-2#/functions/shotbot-puppeteer-serverless-dev-puppeteerExample

<!-- to test invocation -->
sls invoke local --function functionName --data '{"a":"bar"}'

<!-- deploy -->
serverless deploy