
provider "aws" {
  region = "us-east-1"
}
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
resource "random_pet" "this" {
  length = 2
}

resource "aws_cloudwatch_log_group" "logs" {
  name = "apigateway/tg_registry_${random_pet.this.id}"
  retention_in_days = 1
}

module "dynamodb_table_apikeys" {
  source = "terraform-aws-modules/dynamodb-table/aws"

  name         = "tf_apikeys_${random_pet.this.id}"
  hash_key     = "api_key"
  range_key    = "created_on"
  billing_mode = "PAY_PER_REQUEST"
  attributes = [
    {
      name = "api_key"
      type = "S"
    },
    {
      name = "created_on"
      type = "S"
    }
  ]

}

module "dynamodb_table" {
  source = "terraform-aws-modules/dynamodb-table/aws"

  name         = "tf_modules"
  hash_key     = "id"
  range_key    = "version"
  billing_mode = "PAY_PER_REQUEST"
  attributes = [
    {
      name = "id"
      type = "S"
    },
    {
      name = "version"
      type = "S"
    },
    {
      name = "published_at"
      type = "S"
    }
  ]

  global_secondary_indexes = [
    {
      name               = "PublishedAt"
      hash_key           = "id"
      range_key          = "published_at"
      projection_type    = "INCLUDE"
      non_key_attributes = ["version"]
    }
  ]

}

module "tf_registry_modules_version" {
  source = "terraform-aws-modules/lambda/aws"

  attach_cloudwatch_logs_policy = true

  function_name            = "tf_registry_modules_version_${random_pet.this.id}"
  description              = "Terraform Registry - Module Versions"
  handler                  = "index.handler"
  runtime                  = "nodejs16.x"
  attach_policy_statements = true


  environment_variables = {
    TF_REGISTRY_TABLE = module.dynamodb_table.dynamodb_table_id
  }

  publish = true
  allowed_triggers = {
    AllowExecutionFromAPIGateway = {
      service    = "apigateway"
      source_arn = "${module.tf_registry.apigatewayv2_api_execution_arn}/*/*"
    }
  }
  cloudwatch_logs_retention_in_days = 1
  policy_statements = {
    dynamodb = {
      effect    = "Allow",
      actions   = ["dynamodb:*"],
      resources = [module.dynamodb_table.dynamodb_table_arn, "${module.dynamodb_table.dynamodb_table_arn}/table/*"]
    }
  }

  source_path = [

    {
      path     = "${path.module}/src/services/modules-versions"
      commands = ["npm install --only prod --no-bin-links --no-fund", ":zip"]

    }
  ]
}

module "tf_registry_modules_download" {
  source = "terraform-aws-modules/lambda/aws"

  attach_cloudwatch_logs_policy = true

  function_name            = "tf_registry_modules_download_${random_pet.this.id}"
  description              = "Terraform Registry - Module Download"
  handler                  = "index.handler"
  runtime                  = "nodejs16.x"
  attach_policy_statements = true


  environment_variables = {
    TF_REGISTRY_TABLE  = module.dynamodb_table.dynamodb_table_id
    TF_APIKEYS_TABLE  = module.dynamodb_table_apikeys.dynamodb_table_id
    TF_REGISTRY_BUCKET = module.s3_bucket.s3_bucket_id
  }

  publish = true
  allowed_triggers = {
    AllowExecutionFromAPIGateway = {
      service    = "apigateway"
      source_arn = "${module.tf_registry.apigatewayv2_api_execution_arn}/*/*"
    }
  }
  cloudwatch_logs_retention_in_days = 1
  policy_statements = {
    dynamodb = {
      effect    = "Allow",
      actions   = ["dynamodb:*"],
      resources = [module.dynamodb_table.dynamodb_table_arn, "${module.dynamodb_table.dynamodb_table_arn}/table/*", module.dynamodb_table_apikeys.dynamodb_table_arn, "${module.dynamodb_table_apikeys.dynamodb_table_arn}/table/*"]
    }
    s3 = {
      effect    = "Allow",
      actions   = ["s3:Get*", "s3:List*"],
      resources = [format("%s*", module.s3_bucket.s3_bucket_arn)]
    }
  }

  source_path = [

    {
      path     = "${path.module}/src/services/modules-download"
      commands = ["npm install --only prod --no-bin-links --no-fund", ":zip"]

    }
  ]
}


module "tf_registry_discovery" {
  source = "terraform-aws-modules/lambda/aws"

  attach_cloudwatch_logs_policy = true

  function_name = "tf_registry_discovery_${random_pet.this.id}"
  description   = "Terraform Registry - Discovery"
  handler       = "index.handler"
  runtime       = "nodejs16.x"

  publish = true
  allowed_triggers = {
    AllowExecutionFromAPIGateway = {
      service    = "apigateway"
      source_arn = "${module.tf_registry.apigatewayv2_api_execution_arn}/*/*"
    }
  }
  cloudwatch_logs_retention_in_days = 1

  source_path = [

    {
      path     = "${path.module}/src/services/discovery"
      commands = ["npm install --only prod --no-bin-links --no-fund", ":zip"]
    }
  ]
}
module "tf_registry" {
  source = "terraform-aws-modules/apigateway-v2/aws"

  name          = "tf_registry_${random_pet.this.id}"
  description   = "My awesome Terraform Registry"
  protocol_type = "HTTP"

  body = templatefile("src/api-definition.yaml", {
    tf_registry_discovery        = module.tf_registry_discovery.lambda_function_arn
    tf_registry_modules_version  = module.tf_registry_modules_version.lambda_function_arn
    tf_registry_modules_download = module.tf_registry_modules_download.lambda_function_arn
  })

  cors_configuration = {
    allow_headers = ["content-type", "x-amz-date", "authorization", "x-api-key", "x-amz-security-token", "x-amz-user-agent"]
    allow_methods = ["*"]
    allow_origins = ["*"]
  }

  # Custom domain
  create_api_domain_name = false
  # domain_name                 = "terraform-aws-modules.modules.tf"
  # domain_name_certificate_arn = "arn:aws:acm:eu-west-1:052235179155:certificate/2b3a7ed9-05e1-4f9e-952b-27744ba06da6"

  # Access logs
  default_stage_access_log_destination_arn = aws_cloudwatch_log_group.logs.arn
  default_stage_access_log_format          = "$context.identity.sourceIp - - [$context.requestTime] \"$context.httpMethod $context.routeKey $context.protocol\" $context.status $context.responseLength $context.requestId $context.integrationErrorMessage"

  tags = {
    Name = "tf_registry"
  }
}

module "s3_bucket" {
  source = "terraform-aws-modules/s3-bucket/aws"

  bucket = "tf-registry-${random_pet.this.id}"
  acl    = "private"

  versioning = {
    enabled = true
  }

}
