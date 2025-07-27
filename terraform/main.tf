data "cloudflare_zone" "this" {
  name = "bendrucker.me"
}

resource "cloudflare_workers_script" "this" {
  account_id = var.cloudflare_account_id
  name       = "bendrucker-me"
  
  # TODO: Remove this placeholder when deploying via GitHub Actions
  content = "export default { fetch: () => new Response('TODO: Deploy via GitHub Actions') }"
  module  = true
}

resource "cloudflare_workers_route" "apex" {
  zone_id     = data.cloudflare_zone.this.id
  pattern     = "bendrucker.me/*"
  script_name = cloudflare_workers_script.this.name
}

resource "cloudflare_workers_route" "www" {
  zone_id     = data.cloudflare_zone.this.id
  pattern     = "www.bendrucker.me/*"
  script_name = cloudflare_workers_script.this.name
}