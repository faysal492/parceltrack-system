resource "vercel_project" "parceltrack_frontend" {
  name             = "${var.project_name}-frontend"
  framework        = "create-react-app"
  root_directory   = "frontend"
  build_command    = "npm run build"
  output_directory = "build"
  install_command  = "npm install"

  git_repository = {
    type = "github"
    repo = var.github_repo
  }

  environment = [
    {
      key    = "REACT_APP_GOOGLE_MAPS_API_KEY"
      value  = var.google_maps_api_key
      target = ["production", "preview", "development"]
    }
  ]

  lifecycle {
    # If project already exists, import it instead of failing
    # The import step in CI/CD should handle this, but this provides additional safety
    create_before_destroy = false
  }
}

# Optional: Add custom domain
resource "vercel_project_domain" "parceltrack_domain" {
  count      = var.custom_domain != "" ? 1 : 0
  project_id = vercel_project.parceltrack_frontend.id
  domain     = var.custom_domain
  git_branch = "main"
}

# Deployment trigger
resource "vercel_deployment" "parceltrack_deployment" {
  project_id = vercel_project.parceltrack_frontend.id
  ref        = "main"

  depends_on = [vercel_project.parceltrack_frontend]
}

# ============================================================
# CLOUDFLARE WORKERS DEPLOYMENT (Optional)
# ============================================================

# Cloudflare Worker Script (simple example)
# Note: You need to create backend/cloudflare-worker.js with your worker code
resource "cloudflare_worker_script" "parceltrack_api" {
  count      = var.deploy_cloudflare_workers ? 1 : 0
  account_id = var.cloudflare_account_id
  name       = var.cloudflare_worker_name

  # Create a simple proxy worker that forwards requests to your backend
  content = <<-EOT
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const backendUrl = '${local.effective_backend_url}';
  const url = new URL(request.url);
  const newUrl = backendUrl + url.pathname + url.search;
  
  const newRequest = new Request(newUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });
  
  return fetch(newRequest);
}
EOT
}

# Cloudflare Worker Route (only if custom domain is configured)
resource "cloudflare_worker_route" "parceltrack_api_route" {
  count       = var.deploy_cloudflare_workers && var.custom_domain != "" && var.cloudflare_zone_id != "" ? 1 : 0
  zone_id     = var.cloudflare_zone_id
  pattern     = "api.${var.custom_domain}/*"
  script_name = cloudflare_worker_script.parceltrack_api[0].name
}

# Determine backend API URL based on deployment choice
locals {
  # If Cloudflare Workers is enabled, use workers URL
  cloudflare_worker_url = var.deploy_cloudflare_workers ? "${var.cloudflare_worker_name}.${var.cloudflare_account_id}.workers.dev" : ""

  # Use custom domain if provided, otherwise use workers.dev subdomain
  effective_backend_url = var.deploy_cloudflare_workers ? (
    var.custom_domain != "" ? "https://api.${var.custom_domain}" : "https://${local.cloudflare_worker_url}"
  ) : var.backend_api_url

  # Database connection string
  database_url = var.supabase_db_host != "" ? "postgresql://${var.supabase_db_user}:${var.supabase_db_password}@${var.supabase_db_host}:${var.supabase_db_port}/${var.supabase_db_name}" : ""
}

# ============================================================
# SUPABASE DATABASE CONFIGURATION
# ============================================================

# Update Vercel environment variables with dynamic backend URL
resource "vercel_project_environment_variable" "backend_api_url" {
  project_id = vercel_project.parceltrack_frontend.id
  key        = "REACT_APP_API_URL"
  value      = local.effective_backend_url
  target     = ["production", "preview", "development"]
}

# Update Vercel environment variables with Supabase credentials
resource "vercel_project_environment_variable" "supabase_api_url" {
  count      = var.supabase_api_url != "" ? 1 : 0
  project_id = vercel_project.parceltrack_frontend.id
  key        = "VITE_SUPABASE_URL"
  value      = var.supabase_api_url
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "supabase_api_key" {
  count      = var.supabase_api_key != "" ? 1 : 0
  project_id = vercel_project.parceltrack_frontend.id
  key        = "VITE_SUPABASE_ANON_KEY"
  value      = var.supabase_api_key
  target     = ["production", "preview", "development"]
}

# Backend Database Connection Variables
resource "vercel_project_environment_variable" "database_url" {
  count      = local.database_url != "" ? 1 : 0
  project_id = vercel_project.parceltrack_frontend.id
  key        = "DATABASE_URL"
  value      = local.database_url
  target     = ["production", "preview", "development"]
}
