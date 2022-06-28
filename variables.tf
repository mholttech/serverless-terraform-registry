variable "oauth_issuer" {
  type = string
  description = "Specify OAUTH Issuer. EX: https://sts.windows.net/00000000-0000-0000-000-000000000000/"
  sensitive = true
}
