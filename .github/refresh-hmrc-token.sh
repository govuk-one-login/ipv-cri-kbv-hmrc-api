set -eu

expiry_parameter=$(aws ssm describe-parameters \
  --parameter-filters Key=Name,Option=Contains,Values=BearerTokenExpiry \
  --query "Parameters[0].Name" --output text)

expiry_ms=$(aws ssm get-parameter --name "$expiry_parameter" --query "Parameter.Value" --output text)
refresh_ms=$(($expiry_ms - (20 * 60 * 1000)))
current_ms=$(($(date +%s) * 1000))

if [[ $current_ms -lt $refresh_ms ]]; then
  remaining_ms=$(($expiry_ms - $current_ms))
  echo "Token expires in $(($remaining_ms / 1000 / 60)) minutes"
  exit
fi

echo "Refreshing token..."

otg_arn=$(aws stepfunctions list-state-machines \
  --query "stateMachines[?contains(name, 'OAuthTokenGenerator')] | [0].stateMachineArn" \
  --output text)

execution_arn=$(aws stepfunctions start-execution --state-machine-arn "$otg_arn" | jq --raw-output .executionArn)

echo "Waiting for state machine execution..."
while [[ ${status:-RUNNING} == RUNNING ]]; do
  status=$(aws stepfunctions describe-execution --execution-arn "$execution_arn" --query status --output text)
  sleep 1
done

[[ $status == SUCCEEDED ]] && echo "Token has been refreshed" && exit

echo "Token refresh has failed"
exit 1
