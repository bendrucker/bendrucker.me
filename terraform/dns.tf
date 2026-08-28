resource "cloudflare_dns_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain
  type    = "A"
  content = "192.0.2.1" # RFC 5737 TEST-NET-1 placeholder IP, actual traffic handled by Cloudflare proxy
  ttl     = 1
  proxied = true
}

import {
  to = cloudflare_dns_record.apex
  id = "c783f775892feb7781197c65222d9612/b1934803c9c663dbdad730c66c041be3"
}
