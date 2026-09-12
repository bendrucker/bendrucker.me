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

# Google Search Console ownership for the Domain property. Search Console offers
# a one-click flow that OAuths into the Cloudflare account and writes this
# record itself. Taking it would hand Google write access to the zone and leave
# the record outside Terraform, where the next apply would see it as drift.
#
# Cloudflare stores each TXT string at a name as its own record, so this is
# additive. The apex already answers with a keybase-site-verification string
# that Terraform does not manage, and nothing here addresses it: Terraform only
# destroys records it holds in state, and creating this one is a POST that adds
# an id rather than replacing the name.
resource "cloudflare_dns_record" "google_site_verification" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain
  type    = "TXT"

  # Cloudflare quotes TXT content on write and returns it quoted, so an unquoted
  # value here would differ from the API on every plan. The quotes delimit the
  # string in the record, and the string Google reads is the token alone.
  content = "\"google-site-verification=ht7AikhLGn-a0qLJtfUw5Pv-wbHLOsCJhHDTKoh_2p0\""

  # Both strings share one TXT RRset at the apex, and RFC 2181 wants a single
  # TTL across an RRset. 300 is what the keybase record already answers with.
  ttl = 300

  # TXT records are not proxiable. Stated rather than left null, since the A
  # record above is proxied.
  proxied = false
}
