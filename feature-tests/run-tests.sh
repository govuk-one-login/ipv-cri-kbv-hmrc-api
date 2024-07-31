#!/usr/bin/env bash

set -e

if [[ -z "${CFN_StackName}" ]]; then
  if [[ -z "${SAM_STACK_NAME}" ]]; then
    export STACK_NAME="local"
  else
    export STACK_NAME="${SAM_STACK_NAME}"
  fi
else
  export STACK_NAME="${CFN_StackName}"
fi

# Added to accommodate ssm stack
if [[ -z "${ENVIRONMENT}" ]]; then
  if [[ -z "${TEST_ENVIRONMENT}" ]]; then
    export ENVIRONMENT="build"
  else
    export ENVIRONMENT="${TEST_ENVIRONMENT}"
  fi
else
  export ENVIRONMENT="${ENVIRONMENT}"
fi

export PRIVATE_API_GATEWAY="https://${CFN_PrivateApiGatewayId}.execute-api.eu-west-2.amazonaws.com/${ENVIRONMENT}/"
export PUBLIC_API_GATEWAY="https://${CFN_PublicApiGatewayId}.execute-api.eu-west-2.amazonaws.com/${ENVIRONMENT}/"

echo "PRIVATE_API_GATEWAY ${PRIVATE_API_GATEWAY}"
echo "PUBLIC_API_GATEWAY ${PUBLIC_API_GATEWAY}"
echo "ENVIRONMENT ${ENVIRONMENT}"
echo "STACK_NAME ${STACK_NAME}"

# run tests and save the exit code
declare test_run_result
export tagFilter=$(aws ssm get-parameter --name "/tests/${STACK_NAME}/TestTag" | jq -r ".Parameter.Value")
if [[ -z "${tagFilter}" ]]; then
  export tagFilter="@regression"
fi
echo "TAG ${tagFilter}"

npm run test
test_run_result=$?

# store report to dir where pipeline will export from
reportDir=${TEST_REPORT_ABSOLUTE_DIR:-./results}
cp -rf results/ "$reportDir" 2>/dev/null || :

# exit with the exit code return npm test
# shellcheck disable=SC2086
exit $test_run_result
