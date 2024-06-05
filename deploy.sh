#!/usr/bin/env bash
cd "$(dirname "${BASH_SOURCE[0]}")"
set -eu

stack_name="${1:-}"
common_stack_name="${2:-}"

if ! [[ "$stack_name" ]]; then
  [[ $(aws sts get-caller-identity --query Arn --output text) =~ \/([^\/\.]+)\. ]] && user="${BASH_REMATCH[1]}" || exit
  stack_name="$user-kbv-hmrc-api"
  echo "» Using stack name '$stack_name'"
fi

if [ -z "$common_stack_name" ]
then
  common_stack_name="hmrc-kbv-common-cri-api-local"
fi

sam validate -t infrastructure/template.yaml --lint

sam build -t infrastructure/template.yaml --cached --parallel

sam deploy --stack-name "$stack_name" \
  --no-fail-on-empty-changeset \
  --no-confirm-changeset \
  --resolve-s3 \
  --s3-prefix "$stack_name" \
  --region "${AWS_REGION:-eu-west-2}" \
  --capabilities CAPABILITY_IAM \
  --tags \
  cri:component=ipv-cri-kbv-hmrc-api \
  cri:stack-type=dev \
  cri:application=Lime \
  cri:deployment-source=manual \
  --parameter-overrides \
  CommonStackName=$common_stack_name \
  Environment=dev
