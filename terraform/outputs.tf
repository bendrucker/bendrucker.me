output "worker_script_name" {
  value = cloudflare_workers_script.this.name
}

output "zone_id" {
  value = data.cloudflare_zone.this.id
}

output "zone_name" {
  value = data.cloudflare_zone.this.name
}