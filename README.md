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

## Pre-Commit Checking / Verification

Completely optional, there is a `.pre-commit-config.yaml` configuration setup in this repo, this uses [pre-commit](https://pre-commit.com/) to verify your commit before actually commiting, it runs the following checks:

- Check Json files for formatting issues
- Fixes end of file issues (it will auto correct if it spots an issue - you will need to run the git commit again after it has fixed the issue)
- It automatically removes trailing whitespaces (again will need to run commit again after it detects and fixes the issue)
- Detects aws credentials or private keys accidentally added to the repo
- runs cloud formation linter and detects issues
- runs checkov and checks for any issues.

### Dependency Installation

To use this locally you will first need to install the dependencies, this can be done in 2 ways:

#### Method 1 - Python pip

Run the following in a terminal:

```
sudo -H pip3 install checkov pre-commit cfn-lint
```

this should work across platforms

#### Method 2 - Brew

If you have brew installed please run the following:

```
brew install pre-commit ;\
brew install cfn-lint ;\
brew install checkov
```

### Post Installation Configuration

once installed run:

```
pre-commit install
```

To update the various versions of the pre-commit plugins, this can be done by running:

```
pre-commit autoupdate && pre-commit install
```

This will install / configure the pre-commit git hooks, if it detects an issue while committing it will produce an output like the following:

```
 git commit -a
check json...........................................(no files to check)Skipped
fix end of files.........................................................Passed
trim trailing whitespace.................................................Passed
detect aws credentials...................................................Passed
detect private key.......................................................Passed
AWS CloudFormation Linter................................................Failed
- hook id: cfn-python-lint
- exit code: 4
W3011 Both UpdateReplacePolicy and DeletionPolicy are needed to protect Resources/PublicHostedZone from deletion
core/deploy/dns-zones/template.yaml:20:3
Checkov..............................................(no files to check)Skipped
- hook id: checkov
```

To remove the pre-commit hooks should there be an issue

```
pre-commit uninstall
```

## Updating .secrets.baseline

Run detect-secrets scan --baseline .secrets.baseline to check for potential leaked secrets.

Use the keyword and secret exclusion lists in the baseline file to prevent the utility from flagging up specific strings.
