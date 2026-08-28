resource "cloudflare_ruleset" "redirects" {
  zone_id     = var.cloudflare_zone_id
  name        = "default"
  description = ""
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules = [
    {
      ref         = "apex_to_www"
      description = "Redirect apex domain to www"
      expression  = "(http.request.full_uri wildcard r\"https://${var.domain}/*\")"
      action      = "redirect"
      action_parameters = {
        from_value = {
          status_code = 301
          target_url = {
            expression = "wildcard_replace(http.request.full_uri, r\"https://${var.domain}/*\", r\"https://www.${var.domain}/$${1}\")"
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
