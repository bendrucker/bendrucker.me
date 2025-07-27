data "cloudflare_zone" "bendrucker_me" {
  zone_id = var.cloudflare_zone_id
}

resource "cloudflare_pages_project" "bendrucker_me" {
  account_id        = var.cloudflare_account_id
  name              = "bendrucker-me"
  production_branch = "master"

  source {
    type = "github"
    config {
      owner                         = "bendrucker"
      repo_name                     = "bendrucker.me"
      production_branch             = "master"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "all"
      preview_branch_includes       = ["*"]
    }
  }

  build_config {
    build_command       = "npm run build"
    destination_dir     = "dist"
    root_dir            = ""
    web_analytics_tag   = ""
    web_analytics_token = ""
  }

  deployment_configs {
    production {
      environment_variables = {}
      secrets              = {}
    }
    preview {
      environment_variables = {}
      secrets              = {}
    }
  }
}

resource "cloudflare_pages_domain" "bendrucker_me" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.bendrucker_me.name
  domain       = "bendrucker.me"
}

resource "cloudflare_record" "bendrucker_me_cname" {
  zone_id = var.cloudflare_zone_id
  name    = "bendrucker.me"
  content = cloudflare_pages_project.bendrucker_me.subdomain
  type    = "CNAME"
  proxied = true
}