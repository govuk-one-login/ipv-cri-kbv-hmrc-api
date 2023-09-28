import * as AWS from "aws-sdk";

const ssm = new AWS.SSM({ region: process.env.AWS_REGION });

export const getSSMParamter = async (params: AWS.SSM.GetParameterRequest) => {
  return await ssm.getParameter(params).promise();
};

export const ssmParamterUpdate = async (
  params: AWS.SSM.PutParameterRequest
) => {
  return await ssm.putParameter(params).promise();
};
