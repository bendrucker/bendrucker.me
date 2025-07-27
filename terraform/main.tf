data "cloudflare_zone" "this" {
  name = "bendrucker.me"
}

resource "cloudflare_workers_script" "this" {
  account_id = var.cloudflare_account_id
  name       = "bendrucker-me"
  content    = file("${path.module}/../worker.js")
  module     = true
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