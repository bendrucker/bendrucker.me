# Both hostnames are canonicalized to https://www, so the worker only ever sees
# the origin the site publishes in rel=canonical and og:url. A plain-HTTP request
# that reached the worker would emit an http:// canonical, and those responses
# share a cache entry with the https ones.
locals {
  # The request's own path, appended to the canonical origin. Each rule sets
  # preserve_query_string, which re-attaches the query, so the path is all this
  # has to build.
  canonical_url = "concat(\"https://www.${var.domain}\", http.request.uri.path)"
}

resource "cloudflare_ruleset" "redirects" {
  zone_id     = var.cloudflare_zone_id
  name        = "default"
  description = ""
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  # The two expressions are mutually exclusive, so evaluation order carries no
  # meaning. Both rules land on the canonical URL in a single hop.
  rules = [
    {
      # Matching on the host rather than the scheme covers http and https apex
      # alike, which keeps http://bendrucker.me/x one redirect away from
      # https://www.bendrucker.me/x rather than two.
      ref         = "apex_to_www"
      description = "Redirect apex domain to www over either scheme"
      expression  = "(http.host eq \"${var.domain}\")"
      action      = "redirect"
      action_parameters = {
        from_value = {
          status_code = 301
          target_url = {
            expression = local.canonical_url
          }
          preserve_query_string = true
        }
      }
    },
    {
      # www is already canonical apart from the scheme, so `ssl` is what
      # separates the request to upgrade from the one to leave alone.
      ref         = "www_to_https"
      description = "Upgrade plain HTTP on www to HTTPS"
      expression  = "(not ssl) and (http.host eq \"www.${var.domain}\")"
      action      = "redirect"
      action_parameters = {
        from_value = {
          status_code = 301
          target_url = {
            expression = local.canonical_url
          }
          preserve_query_string = true
        }
      }
    },
  ]
}

import {
  to = cloudflare_ruleset.redirects
  id = "zones/c783f775892feb7781197c65222d9612/90ba3ffb134642349ffbef9787f23834"
}
