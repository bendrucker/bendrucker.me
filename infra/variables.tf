variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for bendrucker.me. The zone itself stays under bendrucker/infrastructure."
  type        = string
  default     = "c783f775892feb7781197c65222d9612"
}

variable "domain" {
  description = "Apex domain served by this site"
  type        = string
  default     = "bendrucker.me"
}
