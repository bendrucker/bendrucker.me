# Applied by the `bendrucker-me` HCP Terraform workspace on merge to main. There
# is no local apply path.
terraform {
  cloud {
    organization = "bendrucker"

    workspaces {
      name = "bendrucker-me"
    }
  }

  required_version = ">= 1.5"
}
