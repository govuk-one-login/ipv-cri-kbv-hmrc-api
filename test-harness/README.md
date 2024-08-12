# Test Harness

This is a test harness that:
- listens to events from the TxMA SQS queue and puts them in the `${AWS::StackName}-bav-event-test-${Environment}` bucket which can then be accessed using and API.
- enables records to be returned from a DynamoDB table by `sessionId`
- enables a programmatic query to be executed against Athena to return a result set filtered by a first name prefix and a "no earlier than" timestamp.

This test harness is only to be used in dev and build environments

## How to use

1. Deploy a custom HMRC KBV stack with the changes that you'd like to test. If you would like to test against what is in dev then ignore this step
2. Update the test-harness/samconfig.toml with a stack name, and the backend stack that you'd like to use (if you don't change this the dev stack will be used)

### DynamoDB session table

To test DynamoDB changes:

1. Make change to DB item that you are looking for
2. Call the `GET getRecordBySessionId/{tableName}/{sessionId}` endpoint

## Architecture
![Architecture diagram](./docs/test-harness.png)
