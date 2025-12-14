terraform {
  required_version = ">= 1.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.14"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  # Uncomment to use Terraform Cloud for remote state
  # cloud {
  #   organization = "your-org"
  #   workspaces {
  #     name = "parceltrack"
  #   }
  # }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "supabase" {
  access_token = var.supabase_api_key
}
