# Digital Identity HMRC KBV Credential Issuer

HMRC KBV Credential Issuer

## Build

Build with `./gradlew`

## Deploy

### Prerequisites

See onboarding guide for instructions on how to setup the following command line interfaces (CLI)

- aws cli
- aws-vault
- sam cli

### Deploy to dev account

Any time you wish to deploy, run:

`aws-vault exec hmrc-kbv-dev -- ./deploy.sh <unique-stack-name>`

### Delete stack from dev account

> The stack name _must_ be unique to you and created by you in the deploy stage above.
> Type `yes` when prompted to delete the stack and the folders in S3 bucket

The command to run is:

`aws-vault exec hmrc-kbv-dev -- sam delete --config-env dev --stack-name <unique-stack-name>`

## Running Unit Tests

## Running Integration Tests

`AWS_REGION="eu-west-2" STACK_NAME="<unique-stack-name>" aws-vault exec hmrc-kbv-dev npm run unit:aws`
