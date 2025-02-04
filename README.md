This project uses serverless framework to deploy to aws lambda
@see doc for setting up serverless: https://www.serverless.com/framework/docs/getting-started

<!-- to test invocation -->
sls invoke local --function functionName --data '{"a":"bar"}'

<!-- deploy -->
serverless deploy
