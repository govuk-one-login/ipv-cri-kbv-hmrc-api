#!/usr/bin/env bash
set -e

stack_name="$1"
common_stack_name="${2:-kbv-hmrc-common-cri-api-local}"
secret_prefix="${3:-kbv-hmrc-cri-api}"

if [ -z "$stack_name" ]
then
echo "😱 stack name expected as first argument, e.g. ./deploy kbv-hmrc-user1"
exit 1
fi

./gradlew clean
sam validate -t infrastructure/template.yaml
sam build -t infrastructure/template.yaml
sam deploy --stack-name "$stack_name" \
   --no-fail-on-empty-changeset \
   --no-confirm-changeset \
   --resolve-s3 \
   --region eu-west-2 \
   --capabilities CAPABILITY_IAM \
   --parameter-overrides \
   CodeSigningEnabled=false \
   Environment=dev \
   AuditEventNamePrefix=/common-cri-parameters/KbvHmrcAuditEventNamePrefix \
   CriIdentifier=/common-cri-parameters/KbvHmrcCriIdentifier \
   CommonStackName="$common_stack_name" \
   SecretPrefix="$secret_prefix"
