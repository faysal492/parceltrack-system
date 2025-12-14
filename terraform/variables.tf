variable "vercel_api_token" {
  description = "Vercel API Token for authentication"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "faysal492/parceltrack-system"
}

variable "github_token" {
  description = "GitHub personal access token for Vercel integration"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_maps_api_key" {
  description = "Google Maps API Key"
  type        = string
  sensitive   = true
}

variable "backend_api_url" {
  description = "Backend API URL (Railway, Cloudflare, or custom)"
  type        = string
  default     = "http://localhost:3000"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for Vercel"
  type        = string
  default     = "parceltrack"
}

variable "custom_domain" {
  description = "Custom domain for Vercel (optional)"
  type        = string
  default     = ""
}

variable "deploy_cloudflare_workers" {
  description = "Deploy backend to Cloudflare Workers (true/false)"
  type        = bool
  default     = false
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token for authentication"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
  default     = ""
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
  default     = ""
}

variable "cloudflare_worker_name" {
  description = "Name of the Cloudflare Worker"
  type        = string
  default     = "parceltrack-api"
}

# ============================================================
# SUPABASE DATABASE CONFIGURATION
# ============================================================

variable "supabase_api_url" {
  description = "Supabase Project API URL"
  type        = string
  sensitive   = false
  default     = ""
}

variable "supabase_api_key" {
  description = "Supabase API Key (anon key or service role key)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "supabase_db_password" {
  description = "Supabase Database Password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "supabase_db_host" {
  description = "Supabase Database Host"
  type        = string
  default     = ""
}

variable "supabase_db_port" {
  description = "Supabase Database Port"
  type        = number
  default     = 5432
}

variable "supabase_db_name" {
  description = "Supabase Database Name"
  type        = string
  default     = "postgres"
}

variable "supabase_db_user" {
  description = "Supabase Database User"
  type        = string
  default     = "postgres"
}

variable "supabase_project_id" {
  description = "Supabase Project ID"
  type        = string
  default     = ""
}
