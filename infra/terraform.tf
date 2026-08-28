# Applied by the `bendrucker-me` HCP Terraform workspace, which is defined in
# bendrucker/infrastructure and watches `infra/**` on this repo. There is no
# local apply path: a merge to main is the apply.
terraform {
  cloud {
    organization = "bendrucker"

    workspaces {
      name = "bendrucker-me"
    }
  }

  required_version = ">= 1.5"
}
