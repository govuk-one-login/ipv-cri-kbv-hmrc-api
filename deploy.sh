#!/usr/bin/env bash
set -eu

stack_name="${1:-}"

if ! [[ "$stack_name" ]]; then
  echo "😱 Stack name expected as first argument, e.g. ./deploy.sh pdv-matching-user1"
  exit 1
fi

sam validate -t infrastructure/template.yaml
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
  cri:component=check-hmrc-api \
  cri:stack-type=dev \
  cri:application=Orange \
  cri:deployment-source=manual \
  --parameter-overrides \
  Environment=dev
