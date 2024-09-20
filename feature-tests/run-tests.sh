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

if [ "${STACK_NAME}" != "local" ]; then

  PARAMETERS_NAMES=(CORE_STUB_URL CORE_STUB_PASSWORD CORE_STUB_USERNAME FRONTEND)
  tLen=${#PARAMETERS_NAMES[@]}
   for (( i=0; i<${tLen}; i++ ));
  do
    echo "/tests/$STACK_NAME/${PARAMETERS_NAMES[$i]}"
    PARAMETER=$(aws ssm get-parameter --name "/tests/$STACK_NAME/${PARAMETERS_NAMES[$i]}" --region eu-west-2)
    VALUE=$(echo "$PARAMETER" | jq '.Parameter.Value')
    NAME=$(echo "$PARAMETER" | jq '.Parameter.Name' | cut -d "/" -f4 | sed 's/.$//')

    eval $(echo "export ${NAME}=${VALUE}")
  done
fi

export tagFilter=$(aws ssm get-parameter --name "/tests/${STACK_NAME}/TestTag" | jq -r ".Parameter.Value")
if [[ -z "${tagFilter}" ]]; then
  export tagFilter="@regression"
fi
echo "TAG ${tagFilter}"

# run tests and save the exit code
# declare test_run_result
echo 'Beginning Regression Tests'
npm run test:browser:ci
test_run_result=$?

# store report to dir where pipeline will export from
# reportDir=${TEST_REPORT_ABSOLUTE_DIR:-/results}
# echo "Report directory is set to: $reportDir"
# cp -rf results/ "$reportDir" 2>/dev/null || :
# echo "Results folder content : $(ls -altr results)"

# exit with the exit code return npm test
# shellcheck disable=SC2086
exit $test_run_result
