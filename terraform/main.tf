data "cloudflare_zone" "bendrucker_me" {
  zone_id = var.cloudflare_zone_id
}

resource "cloudflare_worker_script" "bendrucker_me" {
  account_id = var.cloudflare_account_id
  name       = "bendrucker-me"
  content    = file("${path.module}/../worker.js")
  module     = true
}

resource "cloudflare_worker_route" "bendrucker_me" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "bendrucker.me/*"
  script_name = cloudflare_worker_script.bendrucker_me.name
}

resource "cloudflare_worker_route" "bendrucker_me_www" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "www.bendrucker.me/*"
  script_name = cloudflare_worker_script.bendrucker_me.name
}