output "vercel_frontend_url" {
  description = "Vercel frontend URL"
  value       = "https://${vercel_project.parceltrack_frontend.name}.vercel.app"
}

output "vercel_project_id" {
  description = "Vercel project ID"
  value       = vercel_project.parceltrack_frontend.id
}

output "vercel_project_name" {
  description = "Vercel project name"
  value       = vercel_project.parceltrack_frontend.name
}

output "custom_domain" {
  description = "Custom domain (if configured)"
  value       = var.custom_domain != "" ? var.custom_domain : "Not configured"
}

output "deployment_info" {
  description = "Deployment information"
  value = {
    frontend    = "https://${vercel_project.parceltrack_frontend.name}.vercel.app"
    backend     = var.backend_api_url
    environment = var.environment
  }
}

# Cloudflare Worker Outputs (if deployed)
output "cloudflare_worker_url" {
  description = "Cloudflare Worker URL"
  value       = var.deploy_cloudflare_workers ? "https://${var.cloudflare_worker_name}.${var.cloudflare_account_id}.workers.dev" : "Not configured"
}

output "cloudflare_worker_name" {
  description = "Cloudflare Worker name"
  value       = var.deploy_cloudflare_workers ? cloudflare_worker_script.parceltrack_api[0].name : "Not deployed"
}

output "cloudflare_route_pattern" {
  description = "Cloudflare Worker route pattern"
  value       = (var.deploy_cloudflare_workers && var.custom_domain != "" && var.cloudflare_zone_id != "") ? try(cloudflare_worker_route.parceltrack_api_route[0].pattern, "Not configured") : "Not configured"
}

# Supabase Outputs
output "supabase_api_url" {
  description = "Supabase Project API URL"
  value       = var.supabase_api_url != "" ? var.supabase_api_url : "Not configured"
}

output "supabase_project_id" {
  description = "Supabase Project ID"
  value       = var.supabase_project_id != "" ? var.supabase_project_id : "Not configured"
}

output "supabase_database_host" {
  description = "Supabase Database Host"
  value       = var.supabase_db_host != "" ? var.supabase_db_host : "Not configured"
}

output "database_connection_string" {
  description = "Database connection string for backend"
  value       = local.database_url != "" ? "postgresql://${var.supabase_db_user}:***@${var.supabase_db_host}:${var.supabase_db_port}/${var.supabase_db_name}" : "Not configured"
  sensitive   = true
}

output "complete_deployment_info" {
  description = "Complete deployment information"
  value = {
    frontend_url           = "https://${vercel_project.parceltrack_frontend.name}.vercel.app"
    vercel_project_id      = vercel_project.parceltrack_frontend.id
    backend_api_url        = local.effective_backend_url
    backend_deployment     = var.deploy_cloudflare_workers ? "Cloudflare Workers" : "Custom/Railway"
    supabase_api_url       = var.supabase_api_url
    supabase_project_id    = var.supabase_project_id
    database_host          = var.supabase_db_host
    cloudflare_enabled     = var.deploy_cloudflare_workers
    custom_domain          = var.custom_domain != "" ? var.custom_domain : "Not configured"
    environment            = var.environment
  }
}

output "effective_backend_url" {
  description = "The actual backend URL being used (automatically determined)"
  value       = local.effective_backend_url
}

output "cloudflare_workers_url" {
  description = "Cloudflare Workers default subdomain URL (if deployed)"
  value       = var.deploy_cloudflare_workers ? "https://${var.cloudflare_worker_name}.${var.cloudflare_account_id}.workers.dev" : "Not deployed"
}
