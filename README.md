# Serverless Terraform Registry

This Registry implementation is intended to provide an API for retreiving Terraform Modules from an s3 bucket. Access is protected using JWT Tokens generated through an OAUTH Workflow. API Documentation can be viewed [here](https://swagger-viewer.vercel.app/spec/aHR0cHMlM0ElMkYlMkZyYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tJTJGbWhvbHR0ZWNoJTJGc2VydmVybGVzcy10ZXJyYWZvcm0tcmVnaXN0cnklMkZtYWluJTJGc3JjJTJGYXBpLWRlZmluaXRpb24ueWFtbA).

## Technologies

- AWS Lambda
- AWS API Gateway
- AWS DynamoDB

## Supported Protocols

- modules.v1

## Pre-Requisits

Information on how to set up OAUTH2 using AzureAD is coming soon.
