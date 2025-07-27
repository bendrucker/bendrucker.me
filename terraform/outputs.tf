output "worker_script_name" {
  value = cloudflare_workers_script.bendrucker_me.name
}

output "zone_id" {
  value = data.cloudflare_zone.bendrucker_me.id
}

output "zone_name" {
  value = data.cloudflare_zone.bendrucker_me.name
}